import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import llmGenerateImage from '@/data/llm/llmGenerateImage';
import { storeCost } from '@/data/storage/costStorage';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from '../db';
import { generateTextDigest } from '../parsers';
import { compilePrompt } from '../compilePrompt';
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
  let bstr: string;
  if (dataUrl.includes(',')) {
    const parts = dataUrl.split(',');
    mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    bstr = atob(parts[1]);
  } else {
    bstr = atob(dataUrl);
  }
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

let activeProcessImagesPromise: Promise<Instruction[]> | null = null;

export async function processImages(
  story: Story,
  style: Style,
  characters: Character[],
  instructions: Instruction[],
  options?: { forceRegenerateInstructionNo?: number }
): Promise<Instruction[]> {
  if (activeProcessImagesPromise && !options?.forceRegenerateInstructionNo) {
    console.log('[TRACE:PROCESS_IMAGES] processImages() is already in flight, returning active promise');
    return activeProcessImagesPromise;
  }

  activeProcessImagesPromise = (async () => {
    console.log('[TRACE:PROCESS_IMAGES] =================== processImages() STARTED ===================', {
      options,
      storyChaptersCount: story?.chapters?.length,
      charactersCount: characters?.length,
      inputInstructionsCount: instructions?.length
    });
    setState('image-processing-status', 'processing', StoragePersistence.local);

    try {
    const costs: number[] = [];

    // Flatten story paragraphs for easy lookup
    const paragraphList: { paragraphNo: number; paragraphText: string; narrativeText: string; narrativeSummary: string; pageId: number; chapterId: number }[] = [];
    for (const chapter of story.chapters || []) {
      for (const page of chapter.pages || []) {
        for (const paragraph of page.paragraphs || []) {
          paragraphList.push({
            paragraphNo: paragraph.paragraph_no ?? paragraph.paragraphNo ?? 0,
            paragraphText: paragraph.paragraph_text || paragraph.paragraphText || '',
            narrativeText: paragraph.narrative_text || paragraph.narrativeText || paragraph.paragraph_text || '',
            narrativeSummary: paragraph.narrative_summary || paragraph.narrativeSummary || '',
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
      const charArr = Array.isArray(instCharacters) ? instCharacters : (typeof instCharacters === 'string' ? JSON.parse(instCharacters) : []);
      const cinematographicDirections = existing ? (existing.cinematographic_directions || existing.cinematographicDirections || existing.cinematographicText || '') : '';
      const imageIndex = existing ? (existing.imageIndex || 0) : 0;
      const isLocked = existing ? Boolean(existing.is_locked ?? existing.isLocked) : false;

      // Build 5 prompt segments
      let styleText = style?.drawing_instructions || style?.drawingInstructions || '';
      const useReference = style?.use_reference_instructions ?? style?.useReferenceInstructions ?? true;
      const refInst = style?.reference_instructions || style?.referenceInstructions || '';
      if (useReference && refInst.trim()) {
        styleText = [styleText.trim(), refInst.trim()].filter(Boolean).join('\n');
      }

      const charTexts: string[] = [];
      for (const cName of charArr) {
        const found = charMap.get(cName.trim().toLowerCase());
        if (found) {
          const desc = found.description_text || found.descriptionText || found.description || '';
          const inst = found.instructions_text || found.instructionsText || found.instructions || '';
          const combined = [desc.trim(), inst.trim()].filter(Boolean).join('\n');
          if (combined) {
            charTexts.push(`${found.character_name || found.characterName || found.name || cName}:\n${combined}`);
          }
        }
      }
      const characterText = charTexts.join('\n\n');
      const sceneText = p.paragraphText;
      const narrativeText = p.narrativeSummary || p.narrativeText || '';

      let promptDigest: string;
      const isForced = options?.forceRegenerateInstructionNo === idx;

      // Lock check: if isLocked is true and not forced, preserve existing prompt digest if present
      if (isLocked && !isForced && existing?.current_prompt_digest) {
        promptDigest = existing.current_prompt_digest;
        console.log(`[TRACE:PROCESS_IMAGES] Instruction ${idx}: Locked -> preserving current_prompt_digest "${promptDigest}"`);
      } else {
        const fullPromptText = compilePrompt({
          styleText,
          cinematographicText: cinematographicDirections,
          characterText,
          sceneText,
          narrativeText
        });
        promptDigest = generateTextDigest(fullPromptText);
        console.log(`[TRACE:PROCESS_IMAGES] Instruction ${idx}: Compiled prompt digest = "${promptDigest}" (existing was "${existing?.current_prompt_digest}")`);
      }

      // Check if image file exists on disk
      const imageFileName = `images/${promptDigest}.png`;
      const isImageOnDisk = existingImagesSet.has(imageFileName);

      const existingImages = existing?.images || [];
      const currentImageEntry = existingImages[imageIndex];

      const initialStatus = isImageOnDisk ? 'SAVED' : (currentImageEntry?.status === 'SAVED' ? 'SAVED' : 'PROCESSING');

      const newImageEntry: ImageEntry = {
        status: initialStatus as any,
        styleText,
        cinematographicText: cinematographicDirections,
        characterText,
        sceneText,
        narrativeText,
        promptDigest
      };

      const updatedImages = [...existingImages];
      updatedImages[imageIndex] = newImageEntry;

      const assignedDigests = existing?.assigned_prompt_digests ?
        (Array.isArray(existing.assigned_prompt_digests) ? existing.assigned_prompt_digests : JSON.parse(existing.assigned_prompt_digests)) : [];
      if (promptDigest && !assignedDigests.includes(promptDigest)) {
        assignedDigests.push(promptDigest);
      }

      console.log(`[TRACE:PROCESS_IMAGES] Instruction ${idx} status:`, {
        promptDigest,
        imageFileName,
        isImageOnDisk,
        initialStatus,
        assignedDigests
      });

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
        assigned_prompt_digests: assignedDigests,
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

      const fullPromptText = compilePrompt({
        styleText: activeImage.styleText,
        cinematographicText: activeImage.cinematographicText,
        characterText: activeImage.characterText,
        sceneText: activeImage.sceneText,
        narrativeText: activeImage.narrativeText
      });

      // Save prompt text to disk & Dexie prompts table
      if (!existingPromptsSet.has(promptFileName)) {
        try {
          await fileStorage.writeFile(promptFileName, fullPromptText);
          existingPromptsSet.add(promptFileName);
          console.log(`[TRACE:PROCESS_IMAGES] Prompt file saved to disk: "${promptFileName}"`);
        } catch (err) {
          console.error(`[TRACE:PROCESS_IMAGES] Failed to save prompt file "${promptFileName}":`, err);
        }
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

      // If image is already on disk and not forced, record SAVED in Dexie and continue
      if (existingImagesSet.has(imageFileName) && !isForced) {
        console.log(`[TRACE:PROCESS_IMAGES] Image already exists on disk for instruction ${inst.instructionNo} ("${imageFileName}"). Marking SAVED.`);
        activeImage.status = 'SAVED' as any;
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
        console.log(`[TRACE:PROCESS_IMAGES] Instruction ${inst.instructionNo}: Missing image "${imageFileName}". Calling llmGenerateImage...`);
        activeImage.status = 'PROCESSING' as any;
        await processDb.instructions.put(inst);
        await processDb.images.put({
          image_digest: promptDigest,
          image_status: 'PROCESSING',
          created_at: new Date()
        });
        setState('instructions-data', [...finalInstructions], StoragePersistence.none);

        const res = await llmGenerateImage(fullPromptText);

        if (res?.content) {
          const blob = dataURLtoBlob(res.content);
          await fileStorage.writeFile(imageFileName, blob);
          existingImagesSet.add(imageFileName);

          activeImage.status = 'SAVED' as any;
          await processDb.instructions.put(inst);
          await processDb.images.put({
            image_digest: promptDigest,
            image_status: 'SAVED',
            created_at: new Date()
          });
          setState('instructions-data', [...finalInstructions], StoragePersistence.none);
          console.log(`[TRACE:PROCESS_IMAGES] Instruction ${inst.instructionNo}: Image generated and saved to "${imageFileName}" successfully!`);

          if (res.totalCost) {
            costs.push(res.totalCost);
          }
        } else {
          throw new Error('No image binary content returned from LLM');
        }
      } catch (err: any) {
        console.error(`[TRACE:PROCESS_IMAGES] Image generation failed for instruction ${inst.instructionNo}:`, err);
        activeImage.status = 'FAILED' as any;
        activeImage.errorMessage = err?.message || String(err);
        activeImage.errorProvider = err?.provider || 'Unknown';
        activeImage.errorStatus = err?.status;
        inst.error = err?.message || String(err);
        await processDb.instructions.put(inst);
        await processDb.images.put({
          image_digest: promptDigest,
          image_status: 'FAILED',
          error_message: err?.message || String(err),
          created_at: new Date()
        });
        setState('instructions-data', [...finalInstructions], StoragePersistence.none);

        // Write FULL error details to images/${promptDigest}.error
        const errorFileName = `images/${promptDigest}.error`;
        const rawDetails = {
          timestamp: new Date().toISOString(),
          promptDigest,
          instructionNo: inst.instructionNo,
          paragraphNo: inst.paragraph_no ?? inst.paragraphNo ?? inst.paragraphId,
          error: {
            name: err?.name || 'Error',
            message: err?.message || String(err),
            status: err?.status,
            provider: err?.provider,
            rawError: err?.rawError,
            stack: err?.stack,
            cause: err?.cause
          },
          promptComponents: {
            styleText: activeImage?.styleText || '',
            cinematographicText: activeImage?.cinematographicText || '',
            characterText: activeImage?.characterText || '',
            sceneText: activeImage?.sceneText || '',
            narrativeText: activeImage?.narrativeText || ''
          },
          fullPromptText
        };

        const errorReport = [
          `# Image Generation Error Report`,
          `Timestamp: ${rawDetails.timestamp}`,
          `Prompt Digest: ${promptDigest}`,
          `Instruction Number: ${inst.instructionNo}`,
          `Paragraph Number: ${rawDetails.paragraphNo}`,
          `Provider: ${err?.provider || 'Unknown'}`,
          `HTTP Status: ${err?.status || 'N/A'}`,
          `\n## Error Message\n${err?.message || String(err)}`,
          err?.rawError ? `\n## Raw LLM Response\n\`\`\`json\n${typeof err.rawError === 'object' ? JSON.stringify(err.rawError, null, 2) : err.rawError}\n\`\`\`` : '',
          err?.stack ? `\n## Stack Trace\n\`\`\`\n${err.stack}\n\`\`\`` : '',
          `\n## Full Structured Error Payload\n\`\`\`json\n${JSON.stringify(rawDetails, null, 2)}\n\`\`\``,
          `\n## Full Prompt Text Sent to LLM\n\`\`\`\n${fullPromptText}\n\`\`\``
        ].filter(Boolean).join('\n\n');

        try {
          await fileStorage.writeFile(errorFileName, errorReport);
          console.log(`[TRACE:PROCESS_IMAGES] Wrote error file "${errorFileName}"`);
        } catch (writeErr) {
          console.error(`[TRACE:PROCESS_IMAGES] Failed to write error file "${errorFileName}":`, writeErr);
        }
      }
    }

    if (costs.length > 0) {
      await storeCost(costs, 'image');
    }

    setState('instructions-data', finalInstructions, StoragePersistence.none);
    setState('image-processing-status', 'idle', StoragePersistence.local);
    console.log('[TRACE:PROCESS_IMAGES] =================== processImages() FINISHED ===================');

    return finalInstructions;
  } catch (err: any) {
    console.error('[TRACE:PROCESS_IMAGES] Fatal error in processImages:', err);
    setState('image-processing-status', 'idle', StoragePersistence.local);
    throw err;
  }
  })().finally(() => {
    activeProcessImagesPromise = null;
  });

  return activeProcessImagesPromise;
}

