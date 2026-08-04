import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from './db';
import {
  parseStoryMarkdown,
  serializeStoryMarkdown,
  generateTextDigest
} from './parsers';
import { generateSummaries } from './workflows/generateSummaries';
import { processImages } from './workflows/processImages';
import type { Story, Chapter, Page } from './types';

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
          title: existingRecord.title || currentStory.title,
          chapters: [...(existingRecord.chapters || [])]
        };

        if (target.chapterNo != null && currentStory.chapters[0]) {
          fullStory.chapters[target.chapterNo] = currentStory.chapters[0];
        } else if (target.chapterNo != null && target.pageNo != null && currentStory.chapters[0]?.pages[0]) {
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

    // 3. Update Dexie IndexedDB
    await processDb.story.put({
      id: 'main',
      title: currentStory.title,
      chapters: currentStory.chapters
    });

    // 4. Broadcast state updates
    const hash = generateTextDigest(markdown);
    setState('story-data', currentStory, StoragePersistence.none);
    setState('story-hash', hash, StoragePersistence.local);

    // 5. Fetch dependencies and trigger processImages
    const [styleRecord, charactersList, instructionsList] = await Promise.all([
      processDb.style.get('main'),
      processDb.characters.toArray(),
      processDb.instructions.toArray()
    ]);

    const style = styleRecord ? {
      drawingInstructions: styleRecord.drawingInstructions,
      panelPerParagraph: styleRecord.panelPerParagraph,
      referenceUrl: styleRecord.referenceUrl,
      referenceInstructions: styleRecord.referenceInstructions,
      useReferenceInstructions: styleRecord.useReferenceInstructions
    } : {
      drawingInstructions: '',
      panelPerParagraph: true,
      referenceUrl: '',
      referenceInstructions: '',
      useReferenceInstructions: true
    };

    // Trigger processImages asynchronously
    processImages(currentStory, style, charactersList, instructionsList).catch(err => {
      console.error('[saveStory] processImages error:', err);
    });

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
