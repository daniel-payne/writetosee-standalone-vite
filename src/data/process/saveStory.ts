import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from './db';
import {
  parseStoryMarkdown,
  serializeStoryMarkdown,
  serializeInstructionsMarkdown,
  generateTextDigest
} from './parsers';
import { generateSummaries } from './workflows/generateSummaries';
import { processImages } from './workflows/processImages';
import type { Story, Chapter, Page, Paragraph, Style } from './TYPES';

/**
 * Saves story text (or Story object) to story.md and replaces story in IndexedDB.
 * Can replace whole story, or target a specific chapter or page.
 * Runs generateSummaries before saving and triggers processImages.
 */
export async function saveStory(
  input: string | Story,
  target?: { chapterNo?: number; pageNo?: number }
): Promise<Story> {
  setState('story-loading', true, StoragePersistence.none);
  setState('story-error', null, StoragePersistence.none);

  try {
    let currentStory: Story;

    if (typeof input === 'string') {
      currentStory = parseStoryMarkdown(input);
    } else {
      currentStory = input;
    }

    // Handle targeted chapter or page replacement if target option provided
    if (target && (target.chapterNo != null || target.pageNo != null)) {
      const existingRecord = await processDb.story.get('main');
      if (existingRecord) {
        const fullStory: Story = {
          story_id: 'main',
          id: 'main',
          story_title: existingRecord.story_title || existingRecord.title || currentStory.story_title || currentStory.title,
          title: existingRecord.story_title || existingRecord.title || currentStory.story_title || currentStory.title,
          chapters: [...(existingRecord.chapters || [])]
        };

        fullStory.chapters = fullStory.chapters || [];
        if (target.chapterNo != null && currentStory.chapters?.[0]) {
          fullStory.chapters[target.chapterNo] = currentStory.chapters[0];
        } else if (target.chapterNo != null && target.pageNo != null && currentStory.chapters?.[0]?.pages?.[0]) {
          const chap = fullStory.chapters[target.chapterNo];
          if (chap && chap.pages) {
            chap.pages[target.pageNo] = currentStory.chapters[0].pages[0];
          }
        }
        currentStory = fullStory;
      }
    }

    // 1. Run generateSummaries before saving
    currentStory = await generateSummaries(currentStory);

    // 2. Serialize and save to disk /story.md
    const markdown = serializeStoryMarkdown(currentStory);
    await fileStorage.writeFile('story.md', markdown);

    // 3. Update Dexie IndexedDB tables (story, chapters, pages, paragraphs)
    const flatChapters: Chapter[] = [];
    const flatPages: Page[] = [];
    const flatParagraphs: Paragraph[] = [];

    for (const chapter of currentStory.chapters || []) {
      const cNo = chapter.chapter_no ?? chapter.chapterNo ?? 0;
      flatChapters.push({
        chapter_no: cNo,
        chapterNo: cNo,
        story_id: 'main',
        storyId: 'main',
        chapter_title: chapter.chapter_title || chapter.chapterTitle || '',
        chapterTitle: chapter.chapter_title || chapter.chapterTitle || '',
        chapter_text: chapter.chapter_text || chapter.chapterText || '',
        chapterText: chapter.chapter_text || chapter.chapterText || '',
        chapter_summary: chapter.chapter_summary || chapter.chapterSummary || '',
        chapterSummary: chapter.chapter_summary || chapter.chapterSummary || '',
        chapter_digest: chapter.chapter_digest || chapter.chapterDigest || generateTextDigest(chapter.chapter_text || chapter.chapterText || '')
      });

      for (const page of chapter.pages || []) {
        const pNo = page.page_no ?? page.pageNo ?? 0;
        flatPages.push({
          page_no: pNo,
          pageNo: pNo,
          chapter_no: cNo,
          chapterNo: cNo,
          page_title: page.page_title || page.pageTitle || '',
          pageTitle: page.page_title || page.pageTitle || '',
          page_text: page.page_text || page.pageText || '',
          pageText: page.page_text || page.pageText || '',
          page_summary: page.page_summary || page.pageSummary || '',
          pageSummary: page.page_summary || page.pageSummary || '',
          page_digest: page.page_digest || page.pageDigest || generateTextDigest(page.page_text || page.pageText || '')
        });

        for (const paragraph of page.paragraphs || []) {
          const paraNo = paragraph.paragraph_no ?? paragraph.paragraphNo ?? 0;
          const narrativeText = paragraph.narrative_text ?? paragraph.narrativeText ?? [paragraph.preceding_text, paragraph.prior_text].filter(Boolean).join('\n\n').trim();
          const narrativeDigest = paragraph.narrative_digest || paragraph.narrativeDigest || (narrativeText ? generateTextDigest(narrativeText) : '');

          flatParagraphs.push({
            paragraph_no: paraNo,
            paragraphNo: paraNo,
            chapter_no: cNo,
            chapterNo: cNo,
            page_no: pNo,
            pageNo: pNo,
            paragraph_text: paragraph.paragraph_text || paragraph.paragraphText || '',
            paragraphText: paragraph.paragraph_text || paragraph.paragraphText || '',
            prior_text: paragraph.prior_text || paragraph.priorText || '',
            priorText: paragraph.prior_text || paragraph.priorText || '',
            preceding_text: paragraph.preceding_text || paragraph.precedingText || '',
            precedingText: paragraph.preceding_text || paragraph.precedingText || '',
            narrative_text: narrativeText,
            narrativeText: narrativeText,
            narrative_summary: paragraph.narrative_summary || paragraph.narrativeSummary || '',
            narrativeSummary: paragraph.narrative_summary || paragraph.narrativeSummary || '',
            narrative_digest: narrativeDigest,
            narrativeDigest: narrativeDigest
          });
        }
      }
    }

    await processDb.transaction('rw', [
      processDb.story,
      processDb.chapters,
      processDb.pages,
      processDb.paragraphs
    ], async () => {
      await processDb.story.put({
        story_id: 'main',
        id: 'main',
        story_title: currentStory.story_title || currentStory.title || 'Untitled Story',
        title: currentStory.story_title || currentStory.title || 'Untitled Story',
        story_text: markdown,
        story_summary: currentStory.story_summary || '',
        story_digest: generateTextDigest(markdown),
        chapters: currentStory.chapters
      });

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
    });

    // 4. Broadcast state updates
    const hash = generateTextDigest(markdown);
    setState('story-data', currentStory, StoragePersistence.none);
    setState('story-hash', hash, StoragePersistence.local);

    // 5. Fetch dependencies and run processImages
    const [styleRecord, charactersList, instructionsList] = await Promise.all([
      processDb.style.get('main'),
      processDb.characters.toArray(),
      processDb.instructions.toArray()
    ]);

    const style: Style = styleRecord || {
      story_id: 'main',
      drawing_instructions: '',
      panel_per_paragraph: true,
      reference_url: '',
      reference_instructions: '',
      use_reference_instructions: true,
      style_hash: ''
    };

    try {
      const updatedInstructions = await processImages(currentStory, style, charactersList, instructionsList);
      if (updatedInstructions && updatedInstructions.length > 0) {
        const instMd = serializeInstructionsMarkdown(updatedInstructions);
        await fileStorage.writeFile('instructions.md', instMd).catch(() => {});
      }
    } catch (err) {
      console.error('[saveStory] processImages error:', err);
    }

    return currentStory;
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to save story';
    console.error('[saveStory] Error:', err);
    setState('story-error', errorMsg, StoragePersistence.none);
    throw err;
  } finally {
    setState('story-loading', false, StoragePersistence.none);
  }
}
