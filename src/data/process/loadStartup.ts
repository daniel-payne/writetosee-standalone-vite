import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb, ensureProcessDbOpen } from './db';
import {
  parseStoryMarkdown,
  parseStyleMarkdown,
  parseCharactersMarkdown,
  parseInstructionsMarkdown,
  generateTextDigest
} from './parsers';
import type {
  Story,
  Style,
  Character,
  Instruction,
  Summary,
  Prompt,
  ImageEntry
} from './TYPES';

// In-memory index sets for rapid disk cache lookup
export const existingImagesSet = new Set<string>();
export const existingSummariesSet = new Set<string>();
export const existingPromptsSet = new Set<string>();

/**
 * Loads story, style, instructions, characters from disk into main thread stores and Dexie IndexedDB.
 * Indexes existing files in /images, /summaries, and /prompts to speed up operation.
 */
export async function loadStartup(): Promise<{
  story: Story;
  style: Style;
  characters: Character[];
  instructions: Instruction[];
}> {
  setState('process-startup-loading', true, StoragePersistence.none);
  setState('process-startup-error', null, StoragePersistence.none);
  setState('image-processing-status', 'idle', StoragePersistence.local);

  try {
    await ensureProcessDbOpen();

    // 1. Scan disk files to populate disk indexes and image map
    const diskFiles = await fileStorage.listFiles().catch(() => []);
    existingImagesSet.clear();
    existingSummariesSet.clear();
    existingPromptsSet.clear();

    const diskImageMap = new Map<string, string[]>();
    for (const file of diskFiles) {
      if (/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) {
        existingImagesSet.add(file);
        const base = file.replace(/^images\//, '').replace(/\.(png|jpe?g|gif|webp|svg)$/i, '');
        const digestKey = base.split('_')[0];
        if (!diskImageMap.has(digestKey)) {
          diskImageMap.set(digestKey, []);
        }
        diskImageMap.get(digestKey)!.push(file);
      } else if (file.startsWith('summaries/')) {
        existingSummariesSet.add(file);
      } else if (file.startsWith('prompts/')) {
        existingPromptsSet.add(file);
      }
    }

    // 2. Read root markdown files from disk (or create default empty files)
    const [storyRaw, styleRaw, charactersRaw, instructionsRaw] = await Promise.all([
      fileStorage.readFile('story.md').then(f => f.text()).catch(() => ''),
      fileStorage.readFile('style.md').then(f => f.text()).catch(() => ''),
      fileStorage.readFile('characters.md').then(f => f.text()).catch(() => ''),
      fileStorage.readFile('instructions.md').then(f => f.text()).catch(() => '')
    ]);

    const story = parseStoryMarkdown(storyRaw);
    const style = parseStyleMarkdown(styleRaw);
    const characters = parseCharactersMarkdown(charactersRaw);
    const rawInstructions = parseInstructionsMarkdown(instructionsRaw);

    // Build paragraph list from story
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

    // Attach existing images from disk to instructions
    const instructions: Instruction[] = paragraphList.map((p, idx) => {
      const existing = rawInstructions.find(inst => inst.instructionNo === idx || inst.paragraphId === p.paragraphNo) || rawInstructions[idx];
      const instCharacters = existing ? (existing.characters || []) : [];
      const cinematographicDirections = existing ? (existing.cinematographicDirections || '') : '';
      let imageIndex = existing ? (existing.imageIndex || 0) : 0;
      const isLocked = existing ? Boolean(existing.isLocked) : false;

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

      // Find any images on disk for this digest or previous digests
      const matchingDiskFiles = diskImageMap.get(promptDigest) || [];
      const images: ImageEntry[] = [];

      if (matchingDiskFiles.length > 0) {
        for (const diskFile of matchingDiskFiles) {
          const base = diskFile.replace(/^images\//, '').replace(/\.(png|jpe?g|gif|webp|svg)$/i, '');
          const digest = base.split('_')[0] || promptDigest;
          images.push({
            status: 'COMPLETE',
            styleText,
            cinematographicText: cinematographicDirections,
            characterText,
            sceneText,
            narrativeText,
            promptDigest: digest
          });
        }
      } else if (existingImagesSet.has(`images/${promptDigest}.png`)) {
        images.push({
          status: 'COMPLETE',
          styleText,
          cinematographicText: cinematographicDirections,
          characterText,
          sceneText,
          narrativeText,
          promptDigest
        });
      }

      // Check if existing instruction had historical images
      if (existing && Array.isArray(existing.images) && existing.images.length > 0) {
        for (const prevImg of existing.images) {
          if (!images.some(img => img.promptDigest === prevImg.promptDigest)) {
            images.push(prevImg);
          }
        }
      }

      if (imageIndex >= images.length) {
        imageIndex = Math.max(0, images.length - 1);
      }

      return {
        instructionNo: idx,
        paragraphId: p.paragraphNo,
        pageId: p.pageId,
        chapterId: p.chapterId,
        imageIndex,
        cinematographicDirections,
        characters: instCharacters,
        images,
        isLocked
      };
    });

    // 3. Write into Dexie IndexedDB
    await processDb.transaction('rw', [
      processDb.story,
      processDb.style,
      processDb.characters,
      processDb.instructions
    ], async () => {
      await processDb.story.put({ id: 'main', ...story });
      await processDb.style.put({ id: 'main', ...style });
      await processDb.characters.clear();
      if (characters.length > 0) {
        await processDb.characters.bulkPut(characters);
      }
      await processDb.instructions.clear();
      if (instructions.length > 0) {
        await processDb.instructions.bulkPut(instructions);
      }
    });

    // 4. Populate IndexedDB summaries & prompts from indexed files if available
    const summariesToPut: Summary[] = [];
    for (const summaryFile of Array.from(existingSummariesSet)) {
      const digest = summaryFile.replace(/^summaries\//, '').replace(/\.md$/, '');
      if (digest) {
        try {
          const file = await fileStorage.readFile(summaryFile);
          const summaryText = await file.text();
          summariesToPut.push({
            summaryId: summariesToPut.length,
            digest,
            summaryText
          });
        } catch {
          // ignore corrupted file
        }
      }
    }
    if (summariesToPut.length > 0) {
      await processDb.summaries.bulkPut(summariesToPut);
    }

    const promptsToPut: Prompt[] = [];
    for (const promptFile of Array.from(existingPromptsSet)) {
      const digest = promptFile.replace(/^prompts\//, '').replace(/\.md$/, '');
      if (digest) {
        try {
          const file = await fileStorage.readFile(promptFile);
          const promptText = await file.text();
          promptsToPut.push({
            digest,
            promptText
          });
        } catch {
          // ignore corrupted file
        }
      }
    }
    if (promptsToPut.length > 0) {
      await processDb.prompts.bulkPut(promptsToPut);
    }

    // 5. Update main thread state-mutex stores
    setState('story-data', story, StoragePersistence.none);
    setState('story-hash', generateTextDigest(storyRaw), StoragePersistence.local);

    setState('style-data', style, StoragePersistence.none);
    setState('style-hash', generateTextDigest(styleRaw), StoragePersistence.local);

    setState('characters-data', characters, StoragePersistence.none);
    setState('characters-hash', generateTextDigest(charactersRaw), StoragePersistence.local);

    setState('instructions-data', instructions, StoragePersistence.none);
    setState('instructions-hash', generateTextDigest(instructionsRaw), StoragePersistence.local);

    console.log('[loadStartup] Successfully loaded startup state. Indexed:', {
      images: existingImagesSet.size,
      summaries: existingSummariesSet.size,
      prompts: existingPromptsSet.size,
      instructions: instructions.length
    });

    return { story, style, characters, instructions };
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed loadStartup';
    console.error('[loadStartup] Error:', err);
    setState('process-startup-error', errorMsg, StoragePersistence.none);
    throw err;
  } finally {
    setState('process-startup-loading', false, StoragePersistence.none);
  }
}
