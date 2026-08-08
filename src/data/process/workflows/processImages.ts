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
  ImageEntry
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
            paragraphNo: paragraph.paragraphNo,
            paragraphText: paragraph.paragraphText,
            narrativeText: paragraph.narrativeText || paragraph.paragraphText,
            pageId: page.pageNo,
            chapterId: chapter.chapterNo
          });
        }
      }
    }

    const charMap = new Map<string, Character>();
    for (const char of characters || []) {
      if (char.characterName) {
        charMap.set(char.characterName.trim().toLowerCase(), char);
      }
    }

    // Build or sync instructions for all paragraphs
    const finalInstructions: Instruction[] = paragraphList.map((p, idx) => {
      const existing = (instructions || []).find(inst => inst.instructionNo === idx || inst.paragraphId === p.paragraphNo) || instructions[idx];

      const instCharacters = existing ? (existing.characters || []) : [];
      const cinematographicDirections = existing ? (existing.cinematographicDirections || '') : '';
      const imageIndex = existing ? (existing.imageIndex || 0) : 0;

      // Build text segments
      const styleText = style?.drawingInstructions || '';
      const charTexts: string[] = [];
      for (const cName of instCharacters) {
        const found = charMap.get(cName.trim().toLowerCase());
        if (found) {
          const desc = found.descriptionText || found.instructionsText || '';
          if (desc) charTexts.push(`${found.characterName}: ${desc}`);
        }
      }
      const characterText = charTexts.join('\n');
      const sceneText = p.paragraphText;
      const narrativeText = p.narrativeText;

      const promptSourceText = [styleText, cinematographicDirections, characterText, sceneText].filter(Boolean).join('\n\n');
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
        paragraphId: p.paragraphNo,
        pageId: p.pageId,
        chapterId: p.chapterId,
        imageIndex,
        cinematographicDirections,
        characters: instCharacters,
        images: updatedImages
      };
    });

    // Save initial instruction structure to IndexedDB
    await processDb.instructions.clear();
    await processDb.instructions.bulkPut(finalInstructions);

    // Process image generation for entries missing on disk
    for (const inst of finalInstructions) {
      const activeImage = inst.images[inst.imageIndex];
      if (!activeImage) continue;

      const promptDigest = activeImage.promptDigest;
      const imageFileName = `images/${promptDigest}.png`;
      const promptFileName = `prompts/${promptDigest}.md`;

      const fullPromptText = [
        activeImage.styleText,
        activeImage.cinematographicText,
        activeImage.characterText,
        activeImage.sceneText
      ].filter(Boolean).join('\n\n');

      // Save prompt text to disk & IndexedDB
      if (!existingPromptsSet.has(promptFileName)) {
        await fileStorage.writeFile(promptFileName, fullPromptText).catch(() => { });
        existingPromptsSet.add(promptFileName);
      }
      await processDb.prompts.put({
        digest: promptDigest,
        promptText: fullPromptText
      });

      const isForced = options?.forceRegenerateInstructionNo === inst.instructionNo;

      // If image is already on disk and not forced, skip generation
      if (existingImagesSet.has(imageFileName) && !isForced) {
        activeImage.status = 'COMPLETE';
        continue;
      }

      // Generate missing image via LLM
      try {
        activeImage.status = 'PROCESSING';
        await processDb.instructions.put(inst);
        setState('instructions-data', [...finalInstructions], StoragePersistence.none);

        console.log(`[processImages] Generating image for instruction ${inst.instructionNo} (digest: ${promptDigest})`);
        const res = await llmGenerateImage(fullPromptText);

        if (res?.content) {
          const blob = dataURLtoBlob(res.content);
          await fileStorage.writeFile(imageFileName, blob);
          existingImagesSet.add(imageFileName);

          activeImage.status = 'COMPLETE';
          await processDb.instructions.put(inst);
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
    setState('image-processing-status', 'failed', StoragePersistence.local);
    throw err;
  }
}
