import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import llmGenerateImage from '@/data/llm/llmGenerateImage';
import { storeCost } from '@/data/storage/costStorage';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from '../db';
import { generateTextDigest } from '../parsers';
import { existingImagesSet, existingPromptsSet } from '../loadStartup';
import type {
  Story,
  Style,
  Character,
  Instruction,
  ImageEntry,
  ImageEntity
} from '../TYPES';

function dataURLtoBlob(dataUrl: string): Blob {
  let mime = 'image/png';
  let bstr = '';
  if (dataUrl.includes(',')) {
    const parts = dataUrl.split(',');
    mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    bstr = atob(parts[1]);
  } else {
    bstr = atob(dataUrl);
  }
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function processImages(
  story: Story,
  style: Style,
  characters: Character[],
  instructions: Instruction[],
  options?: { forceRegenerateInstructionNo?: number }
): Promise<Instruction[]> {
  setState('image-processing-status', 'processing', StoragePersistence.local);

  try {
    const costs: number[] = [];

    // Flatten story paragraphs for easy lookup
    const paragraphList: { paragraphNo: number; paragraphText: string; narrativeText: string; pageId: number; chapterId: number }[] = [];
    for (const chapter of story.chapters || []) {
      for (const page of chapter.pages || []) {
        for (const paragraph of page.paragraphs || []) {
          paragraphList.push({
            paragraphNo: paragraph.paragraph_no ?? paragraph.paragraphNo ?? 0,
            paragraphText: paragraph.paragraph_text || paragraph.paragraphText || '',
            narrativeText: paragraph.narrative_summary || paragraph.narrativeSummary || paragraph.narrativeText || paragraph.paragraph_text || paragraph.paragraphText || '',
            pageId: page.page_no ?? page.pageNo ?? 0,
            chapterId: chapter.chapter_no ?? chapter.chapterNo ?? 0
          });
        }
      }
    }

    const charMap = new Map<string, Character>();
    for (const char of characters || []) {
      const name = char.character_name || char.characterName || char.name;
      if (name) {
        charMap.set(name.trim().toLowerCase(), char);
      }
    }

    // Build or sync instructions for all paragraphs
    const finalInstructions: Instruction[] = paragraphList.map((p, idx) => {
      const existing = (instructions || []).find(inst =>
        (inst.instructionNo === idx) ||
        (inst.paragraph_no === p.paragraphNo) ||
        (inst.paragraphId === p.paragraphNo)
      ) || instructions[idx];

      const instCharacters = existing ? (existing.assigned_characters || existing.characters || []) : [];
      const charArr = Array.isArray(instCharacters) ? instCharacters : [];
      const cinematographicDirections = existing ? (existing.cinematographic_directions || existing.cinematographicDirections || existing.cinematographicText || '') : '';
      const imageIndex = existing ? (existing.imageIndex || 0) : 0;
      const isLocked = existing ? Boolean(existing.is_locked ?? existing.isLocked) : false;

      // Build 5 prompt segments
      let styleText = style?.drawing_instructions || style?.drawingInstructions || '';
      if ((style?.use_reference_instructions ?? style?.useReferenceInstructions) && (style?.reference_instructions || style?.referenceInstructions)) {
        styleText = [styleText, (style.reference_instructions || style.referenceInstructions)].filter(Boolean).join('\n');
      }

      const charTexts: string[] = [];
      for (const cName of charArr) {
        const found = charMap.get(cName.trim().toLowerCase());
        if (found) {
          const desc = found.description_text || found.descriptionText || found.instructions_text || found.instructionsText || '';
          if (desc) charTexts.push(`${cName}: ${desc}`);
        }
      }
      const characterText = charTexts.join('\n');
      const sceneText = p.paragraphText;
      const narrativeText = p.narrativeText;

      const promptSourceText = [styleText, cinematographicDirections, characterText, narrativeText, sceneText].filter(Boolean).join('\n\n');
      const promptDigest = generateTextDigest(promptSourceText);

      // Check if image file exists on disk
      const imageFileName = `images/${promptDigest}.png`;
      const isImageOnDisk = existingImagesSet.has(imageFileName);

      const existingImages = existing?.images || [];
      let currentImageEntry = existingImages[imageIndex];

      const initialStatus = isImageOnDisk ? 'COMPLETE' : (currentImageEntry?.status || 'PROCESSING');

      const newImageEntry: ImageEntry = {
        status: initialStatus,
        styleText,
        cinematographicText: cinematographicDirections,
        characterText,
        sceneText,
        narrativeText,
        promptDigest
      };

      const updatedImages = [...existingImages];
      updatedImages[imageIndex] = newImageEntry;

      return {
        instructionNo: idx,
        paragraph_no: p.paragraphNo,
        paragraphNo: p.paragraphNo,
        paragraphId: p.paragraphNo,
        page_no: p.pageId,
        pageNo: p.pageId,
        pageId: p.pageId,
        chapter_no: p.chapterId,
        chapterNo: p.chapterId,
        chapterId: p.chapterId,
        imageIndex,
        cinematographic_directions: cinematographicDirections,
        cinematographicDirections,
        cinematographicText: cinematographicDirections,
        assigned_characters: charArr,
        characters: charArr,
        assigned_prompt_digests: [promptDigest],
        current_prompt_digest: promptDigest,
        promptDigest,
        images: updatedImages,
        is_locked: isLocked,
        isLocked
      };
    });

    // Save initial instruction structure to Dexie
    await processDb.instructions.clear();
    if (finalInstructions.length > 0) {
      await processDb.instructions.bulkPut(finalInstructions);
    }

    // Process image generation for entries missing on disk
    for (const inst of finalInstructions) {
      const activeImage = inst.images?.[inst.imageIndex ?? 0];
      if (!activeImage) continue;

      const promptDigest = activeImage.promptDigest;
      const imageFileName = `images/${promptDigest}.png`;
      const promptFileName = `prompts/${promptDigest}.md`;

      const fullPromptText = [
        activeImage.styleText,
        activeImage.cinematographicText,
        activeImage.characterText,
        activeImage.narrativeText,
        activeImage.sceneText
      ].filter(Boolean).join('\n\n');

      // Save prompt text to disk & Dexie prompts table
      if (!existingPromptsSet.has(promptFileName)) {
        await fileStorage.writeFile(promptFileName, fullPromptText).catch(() => { });
        existingPromptsSet.add(promptFileName);
      }
      await processDb.prompts.put({
        prompt_digest: promptDigest,
        digest: promptDigest,
        prompt_text: fullPromptText,
        promptText: fullPromptText,
        style_text: activeImage.styleText || '',
        cinematographic_text: activeImage.cinematographicText || '',
        character_text: activeImage.characterText || '',
        narrative_text: activeImage.narrativeText || '',
        scene_text: activeImage.sceneText || ''
      });

      const isForced = options?.forceRegenerateInstructionNo === inst.instructionNo;

      // If image is already on disk and not forced, skip generation
      if (existingImagesSet.has(imageFileName) && !isForced) {
        activeImage.status = 'COMPLETE';
        const imgRecord: ImageEntity = {
          image_digest: promptDigest,
          image_status: 'SAVED',
          created_at: new Date()
        };
        await processDb.images.put(imgRecord);
        continue;
      }

      // Generate missing image via LLM
      try {
        activeImage.status = 'PROCESSING';
        await processDb.instructions.put(inst);
        await processDb.images.put({
          image_digest: promptDigest,
          image_status: 'PROCESSING',
          created_at: new Date()
        });
        setState('instructions-data', [...finalInstructions], StoragePersistence.none);

        console.log(`[processImages] Generating image for instruction ${inst.instructionNo} (digest: ${promptDigest})`);
        const res = await llmGenerateImage(fullPromptText);

        if (res?.content) {
          const blob = dataURLtoBlob(res.content);
          await fileStorage.writeFile(imageFileName, blob);
          existingImagesSet.add(imageFileName);

          activeImage.status = 'COMPLETE';
          await processDb.instructions.put(inst);
          await processDb.images.put({
            image_digest: promptDigest,
            image_status: 'SAVED',
            created_at: new Date()
          });
          setState('instructions-data', [...finalInstructions], StoragePersistence.none);

          if (res.totalCost) {
            costs.push(res.totalCost);
          }
        } else {
          throw new Error('No image binary content returned');
        }
      } catch (err: any) {
        console.error(`[processImages] Image generation failed for instruction ${inst.instructionNo}:`, err);
        activeImage.status = 'FAILED';
        await processDb.instructions.put(inst);
        await processDb.images.put({
          image_digest: promptDigest,
          image_status: 'FAILED',
          created_at: new Date()
        });
        setState('instructions-data', [...finalInstructions], StoragePersistence.none);
      }
    }

    if (costs.length > 0) {
      await storeCost(costs, 'image');
    }

    setState('instructions-data', finalInstructions, StoragePersistence.none);
    setState('image-processing-status', 'idle', StoragePersistence.local);

    return finalInstructions;
  } catch (err: any) {
    console.error('[processImages] Error in workflow:', err);
    setState('image-processing-status', 'idle', StoragePersistence.local);
    throw err;
  }
}
