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

let activeStartupPromise: Promise<{
  story: Story;
  style: Style;
  characters: Character[];
  instructions: Instruction[];
}> | null = null;

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
  if (activeStartupPromise) {
    console.log('[TRACE:STARTUP] loadStartup() is already in-flight! Reusing active promise.');
    return activeStartupPromise;
  }

  activeStartupPromise = (async () => {
    console.log('[TRACE:STARTUP] =================== loadStartup() STARTED ===================');
    setState('process-startup-loading', true, StoragePersistence.none);
    setState('process-startup-error', null, StoragePersistence.none);
    setState('image-processing-status', 'idle', StoragePersistence.local);

    try {
    console.log('[TRACE:STARTUP] Step 0: Ensuring Dexie database is open...');
    await ensureProcessDbOpen();

    // 1. Scan disk files to populate disk indexes
    console.log('[TRACE:STARTUP] Step 1: Scanning disk files via listFiles()...');
    const diskFiles = await fileStorage.listFiles().catch((err) => {
      console.error('[TRACE:STARTUP] listFiles() error:', err);
      return [];
    });
    console.log('[TRACE:STARTUP] Step 1: Found disk files count =', diskFiles.length, diskFiles);

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
    console.log('[TRACE:STARTUP] Step 1: existingImagesSet size =', existingImagesSet.size, Array.from(existingImagesSet));
    console.log('[TRACE:STARTUP] Step 1: existingPromptsSet size =', existingPromptsSet.size, Array.from(existingPromptsSet));
    console.log('[TRACE:STARTUP] Step 1: existingSummariesSet size =', existingSummariesSet.size, Array.from(existingSummariesSet));

    // 2. Read root markdown files from disk (or create default empty files)
    console.log('[TRACE:STARTUP] Step 2: Reading root markdown files (story.md, style.md, characters.md, instructions.md)...');
    const [storyRaw, styleRaw, charactersRaw, instructionsRaw] = await Promise.all([
      fileStorage.readFile('story.md').then(f => f.text()).catch(e => { console.log('[TRACE:STARTUP] story.md not found or empty:', e.message); return ''; }),
      fileStorage.readFile('style.md').then(f => f.text()).catch(e => { console.log('[TRACE:STARTUP] style.md not found or empty:', e.message); return ''; }),
      fileStorage.readFile('characters.md').then(f => f.text()).catch(e => { console.log('[TRACE:STARTUP] characters.md not found or empty:', e.message); return ''; }),
      fileStorage.readFile('instructions.md').then(f => f.text()).catch(e => { console.log('[TRACE:STARTUP] instructions.md not found or empty:', e.message); return ''; })
    ]);

    console.log('[TRACE:STARTUP] Step 2: Raw file lengths:', {
      storyLen: storyRaw.length,
      styleLen: styleRaw.length,
      charactersLen: charactersRaw.length,
      instructionsLen: instructionsRaw.length
    });

    const story = parseStoryMarkdown(storyRaw);
    const style = parseStyleMarkdown(styleRaw);
    const characters = parseCharactersMarkdown(charactersRaw);
    const rawInstructions = parseInstructionsMarkdown(instructionsRaw);

    console.log('[TRACE:STARTUP] Step 3: Parsed entities:', {
      storyTitle: story.story_title,
      chaptersCount: story.chapters?.length || 0,
      charactersCount: characters.length,
      rawInstructionsCount: rawInstructions.length,
      rawInstructions: rawInstructions.map(i => ({ no: i.instructionNo, pNo: i.paragraph_no, currentDigest: i.current_prompt_digest, assignedDigests: i.assigned_prompt_digests }))
    });

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

    console.log('[TRACE:STARTUP] Step 3: flatParagraphs count =', flatParagraphs.length);

    // Build instruction list for all paragraphs, preserving existing instructions from instructions.md
    const instructions: Instruction[] = flatParagraphs.map((p, idx) => {
      const existing = rawInstructions.find(inst =>
        (inst.instructionNo === idx) ||
        (inst.paragraph_no === p.paragraph_no) ||
        (inst.paragraphId === p.paragraph_no)
      ) || rawInstructions[idx];

      const instCharacters = existing ? (existing.assigned_characters || existing.characters || []) : [];
      const charArr = Array.isArray(instCharacters) ? instCharacters : (typeof instCharacters === 'string' ? JSON.parse(instCharacters) : []);
      const cinematographicDirections = existing ? (existing.cinematographic_directions || existing.cinematographicDirections || existing.cinematographicText || '') : '';
      const isLocked = existing ? Boolean(existing.is_locked ?? existing.isLocked) : false;
      const currentPromptDigest = existing?.current_prompt_digest || existing?.promptDigest || null;
      let assignedPromptDigests: string[] = [];
      if (existing?.assigned_prompt_digests) {
        assignedPromptDigests = Array.isArray(existing.assigned_prompt_digests)
          ? existing.assigned_prompt_digests
          : (typeof existing.assigned_prompt_digests === 'string' ? JSON.parse(existing.assigned_prompt_digests) : []);
      }
      if (currentPromptDigest && !assignedPromptDigests.includes(currentPromptDigest)) {
        assignedPromptDigests.push(currentPromptDigest);
      }

      // Ensure imageIndex points to currentPromptDigest if present in assignedPromptDigests
      let imageIndex = existing?.imageIndex !== undefined ? existing.imageIndex : 0;
      if (currentPromptDigest && assignedPromptDigests.length > 0) {
        const foundIdx = assignedPromptDigests.indexOf(currentPromptDigest);
        if (foundIdx >= 0) {
          imageIndex = foundIdx;
        }
      }

      // Build images list from assigned_prompt_digests and disk cache
      const images: ImageEntry[] = (assignedPromptDigests.length > 0 ? assignedPromptDigests : (currentPromptDigest ? [currentPromptDigest] : [])).map(digest => {
        const isImageOnDisk = existingImagesSet.has(`images/${digest}.png`);
        return {
          status: isImageOnDisk ? 'SAVED' : 'PROCESSING',
          styleText: style.drawing_instructions || style.drawingInstructions || '',
          cinematographicText: cinematographicDirections,
          characterText: '',
          sceneText: p.paragraph_text,
          narrativeText: '',
          promptDigest: digest
        };
      });

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
        assigned_prompt_digests: assignedPromptDigests,
        current_prompt_digest: currentPromptDigest,
        promptDigest: currentPromptDigest || undefined,
        images,
        is_locked: isLocked,
        isLocked
      };
    });

    console.log('[TRACE:STARTUP] Step 3: Synthesized instructions for Dexie:', instructions.map(i => ({
      no: i.instructionNo,
      pNo: i.paragraph_no,
      currentPromptDigest: i.current_prompt_digest,
      assignedDigests: i.assigned_prompt_digests,
      imagesCount: i.images?.length,
      imageStatuses: i.images?.map(img => ({ digest: img.promptDigest, status: img.status }))
    })));

    // 3. Write into Dexie IndexedDB tables
    console.log('[TRACE:STARTUP] Step 4: Writing domain entities to Dexie tables...');
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

    console.log('[TRACE:STARTUP] Step 4: Dexie database successfully updated with', diskImages.length, 'disk images');

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
    console.log('[TRACE:STARTUP] Step 5: Ingested prompts count =', promptsToPut.length, 'summaries count =', summariesToPut.length);

    // 5. Update main thread state-mutex stores for reactive UI sync
    setState('story-data', story, StoragePersistence.none);
    setState('story-hash', generateTextDigest(storyRaw), StoragePersistence.local);

    setState('style-data', style, StoragePersistence.none);
    setState('style-hash', generateTextDigest(styleRaw), StoragePersistence.local);

    setState('characters-data', characters, StoragePersistence.none);
    setState('characters-hash', generateTextDigest(charactersRaw), StoragePersistence.local);

    setState('instructions-data', instructions, StoragePersistence.none);
    setState('instructions-hash', generateTextDigest(instructionsRaw), StoragePersistence.local);

    console.log('[TRACE:STARTUP] Step 6: Running post-ingestion summarization pipeline...');
    const reconciledStory = await generateSummaries(story).catch(err => {
      console.warn('[TRACE:STARTUP] Summaries pipeline warning:', err);
      return story;
    });

    console.log('[TRACE:STARTUP] Step 7/8: Running processImages pipeline...');
    processImages(reconciledStory, style, characters, instructions).catch(err => {
      console.warn('[TRACE:STARTUP] Image generation pipeline warning:', err);
    });

    console.log('[TRACE:STARTUP] =================== loadStartup() FINISHED ===================');
    return { story: reconciledStory, style, characters, instructions };
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed loadStartup';
    console.error('[TRACE:STARTUP] FATAL ERROR in loadStartup:', err);
    setState('process-startup-error', errorMsg, StoragePersistence.none);
    throw err;
  } finally {
    setState('process-startup-loading', false, StoragePersistence.none);
  }
  })().finally(() => {
    activeStartupPromise = null;
  });

  return activeStartupPromise;
}
