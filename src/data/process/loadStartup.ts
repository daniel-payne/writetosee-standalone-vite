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
import { generateSummaries } from './workflows/generateSummaries';
import { processImages } from './workflows/processImages';
import type {
  Story,
  Style,
  Character,
  Instruction,
  Summary,
  Prompt,
  ImageEntity,
  ImageEntry
} from './TYPES';

// In-memory index sets for rapid disk cache lookup
export const existingImagesSet = new Set<string>();
export const existingSummariesSet = new Set<string>();
export const existingPromptsSet = new Set<string>();

/**
 * Loads story, style, instructions, characters from disk into Dexie IndexedDB and triggers
 * post-ingestion summarization, prompt compilation, and automated image generation.
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

    // 1. Scan disk files to populate disk indexes
    const diskFiles = await fileStorage.listFiles().catch(() => []);
    existingImagesSet.clear();
    existingSummariesSet.clear();
    existingPromptsSet.clear();

    const diskImages: ImageEntity[] = [];

    for (const file of diskFiles) {
      if (/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) {
        existingImagesSet.add(file);
        const base = file.replace(/^images\//, '').replace(/\.(png|jpe?g|gif|webp|svg)$/i, '');
        const digestKey = base.split('_')[0];
        diskImages.push({
          image_digest: digestKey,
          image_status: 'SAVED',
          created_at: new Date()
        });
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

    let story = parseStoryMarkdown(storyRaw);
    const style = parseStyleMarkdown(styleRaw);
    const characters = parseCharactersMarkdown(charactersRaw);
    const rawInstructions = parseInstructionsMarkdown(instructionsRaw);

    // Build paragraph list from story
    const flatParagraphs: any[] = [];
    const flatPages: any[] = [];
    const flatChapters: any[] = [];

    for (const chapter of story.chapters || []) {
      flatChapters.push({
        chapter_no: chapter.chapter_no ?? chapter.chapterNo ?? 0,
        story_id: 'main',
        chapter_title: chapter.chapter_title || chapter.chapterTitle || '',
        chapter_text: chapter.chapter_text || chapter.chapterText || '',
        chapter_summary: chapter.chapter_summary || chapter.chapterSummary || '',
        chapter_digest: chapter.chapter_digest || chapter.chapterDigest || ''
      });

      for (const page of chapter.pages || []) {
        flatPages.push({
          page_no: page.page_no ?? page.pageNo ?? 0,
          chapter_no: chapter.chapter_no ?? chapter.chapterNo ?? 0,
          page_title: page.page_title || page.pageTitle || '',
          page_text: page.page_text || page.pageText || '',
          page_summary: page.page_summary || page.pageSummary || '',
          page_digest: page.page_digest || page.pageDigest || ''
        });

        for (const paragraph of page.paragraphs || []) {
          flatParagraphs.push({
            paragraph_no: paragraph.paragraph_no ?? paragraph.paragraphNo ?? 0,
            chapter_no: chapter.chapter_no ?? chapter.chapterNo ?? 0,
            page_no: page.page_no ?? page.pageNo ?? 0,
            paragraph_text: paragraph.paragraph_text || paragraph.paragraphText || '',
            prior_text: paragraph.prior_text || paragraph.priorText || '',
            preceding_text: paragraph.preceding_text || paragraph.precedingText || '',
            narrative_summary: paragraph.narrative_summary || paragraph.narrativeSummary || '',
            narrative_digest: paragraph.narrative_digest || paragraph.narrativeDigest || ''
          });
        }
      }
    }

    const charMap = new Map<string, Character>();
    for (const char of characters || []) {
      const name = char.character_name || char.characterName || char.name || '';
      if (name) {
        charMap.set(name.trim().toLowerCase(), char);
      }
    }

    // Build synthesized instruction list for all paragraphs
    const instructions: Instruction[] = flatParagraphs.map((p, idx) => {
      const existing = rawInstructions.find(inst =>
        (inst.instructionNo === idx) ||
        (inst.paragraph_no === p.paragraph_no) ||
        (inst.paragraphId === p.paragraph_no)
      ) || rawInstructions[idx];

      const instCharacters = existing ? (existing.assigned_characters || existing.characters || []) : [];
      const charArr = Array.isArray(instCharacters) ? instCharacters : [];
      const cinematographicDirections = existing ? (existing.cinematographic_directions || existing.cinematographicDirections || existing.cinematographicText || '') : '';
      let imageIndex = existing ? (existing.imageIndex || 0) : 0;
      const isLocked = existing ? Boolean(existing.is_locked ?? existing.isLocked) : false;

      const styleText = style.drawing_instructions || style.drawingInstructions || '';
      const charTexts: string[] = [];
      for (const cName of charArr) {
        const found = charMap.get(cName.trim().toLowerCase());
        if (found) {
          const desc = found.description_text || found.descriptionText || found.instructions_text || found.instructionsText || '';
          if (desc) charTexts.push(`${cName}: ${desc}`);
        }
      }
      const characterText = charTexts.join('\n');
      const sceneText = p.paragraph_text;
      const narrativeText = p.narrative_summary || p.paragraph_text;

      const promptSourceText = [styleText, cinematographicDirections, characterText, sceneText].filter(Boolean).join('\n\n');
      const promptDigest = generateTextDigest(promptSourceText);

      const isImageOnDisk = existingImagesSet.has(`images/${promptDigest}.png`);
      const initialStatus: 'PROCESSING' | 'SAVED' | 'FAILED' | 'COMPLETE' = isImageOnDisk ? 'COMPLETE' : 'PROCESSING';

      const images: ImageEntry[] = [{
        status: initialStatus,
        styleText,
        cinematographicText: cinematographicDirections,
        characterText,
        sceneText,
        narrativeText,
        promptDigest
      }];

      return {
        instructionNo: idx,
        paragraph_no: p.paragraph_no,
        paragraphNo: p.paragraph_no,
        paragraphId: p.paragraph_no,
        page_no: p.page_no,
        pageNo: p.page_no,
        pageId: p.page_no,
        chapter_no: p.chapter_no,
        chapterNo: p.chapter_no,
        chapterId: p.chapter_no,
        imageIndex,
        cinematographic_directions: cinematographicDirections,
        cinematographicDirections,
        cinematographicText: cinematographicDirections,
        assigned_characters: charArr,
        characters: charArr,
        assigned_prompt_digests: [promptDigest],
        current_prompt_digest: promptDigest,
        promptDigest,
        images,
        is_locked: isLocked,
        isLocked
      };
    });

    // 3. Write into Dexie IndexedDB tables
    await processDb.transaction('rw', [
      processDb.story,
      processDb.chapters,
      processDb.pages,
      processDb.paragraphs,
      processDb.style,
      processDb.characters,
      processDb.instructions,
      processDb.images
    ], async () => {
      await processDb.story.clear();
      await processDb.story.put({ id: 'main', story_id: 'main', ...story });

      await processDb.chapters.clear();
      if (flatChapters.length > 0) {
        await processDb.chapters.bulkPut(flatChapters);
      }

      await processDb.pages.clear();
      if (flatPages.length > 0) {
        await processDb.pages.bulkPut(flatPages);
      }

      await processDb.paragraphs.clear();
      if (flatParagraphs.length > 0) {
        await processDb.paragraphs.bulkPut(flatParagraphs);
      }

      await processDb.style.clear();
      await processDb.style.put({ id: 'main', story_id: 'main', ...style });

      await processDb.characters.clear();
      if (characters.length > 0) {
        await processDb.characters.bulkPut(characters);
      }

      await processDb.instructions.clear();
      if (instructions.length > 0) {
        await processDb.instructions.bulkPut(instructions);
      }

      if (diskImages.length > 0) {
        await processDb.images.bulkPut(diskImages);
      }
    });

    // 4. Ingest disk summaries & prompts into Dexie
    const summariesToPut: Summary[] = [];
    for (const summaryFile of Array.from(existingSummariesSet)) {
      const digest = summaryFile.replace(/^summaries\//, '').replace(/\.md$/, '');
      if (digest) {
        try {
          const file = await fileStorage.readFile(summaryFile);
          const summaryText = await file.text();
          summariesToPut.push({
            summaryId: summariesToPut.length,
            summary_digest: digest,
            digest,
            summary_text: summaryText,
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
            prompt_digest: digest,
            digest,
            prompt_text: promptText,
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

    // 5. Update main thread state-mutex stores for reactive UI sync
    setState('story-data', story, StoragePersistence.none);
    setState('story-hash', generateTextDigest(storyRaw), StoragePersistence.local);

    setState('style-data', style, StoragePersistence.none);
    setState('style-hash', generateTextDigest(styleRaw), StoragePersistence.local);

    setState('characters-data', characters, StoragePersistence.none);
    setState('characters-hash', generateTextDigest(charactersRaw), StoragePersistence.local);

    setState('instructions-data', instructions, StoragePersistence.none);
    setState('instructions-hash', generateTextDigest(instructionsRaw), StoragePersistence.local);

    console.log('[loadStartup] Successfully loaded startup state. Running post-ingestion pipelines...');

    // 6. Post-ingestion summarization pipeline
    generateSummaries(story).catch(err => console.warn('[loadStartup] Summaries pipeline warning:', err));

    // 7. Automated image generation for uncached prompts
    processImages(story, style, characters, instructions).catch(err => {
      console.warn('[loadStartup] Image generation pipeline warning:', err);
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
