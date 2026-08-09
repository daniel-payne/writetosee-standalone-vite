import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from './db';
import {
  parseStyleMarkdown,
  serializeStyleMarkdown,
  generateTextDigest
} from './parsers';
import { processImages } from './workflows/processImages';
import type { Style } from './TYPES';

/**
 * Saves style text (or Style object) to style.md and replaces style in IndexedDB.
 * Triggers processImages.
 */
export async function saveStyle(input: string | Style): Promise<Style> {
  setState('style-loading', true, StoragePersistence.none);
  setState('style-error', null, StoragePersistence.none);

  try {
    let style: Style;
    if (typeof input === 'string') {
      style = parseStyleMarkdown(input);
    } else {
      style = input;
    }

    // 1. Serialize and write to disk /style.md
    const markdown = serializeStyleMarkdown(style);
    await fileStorage.writeFile('style.md', markdown);

    const hash = generateTextDigest(markdown);
    style.style_hash = hash;
    style.styleHash = hash;

    // 2. Replace in Dexie IndexedDB
    await processDb.style.put({
      story_id: 'main',
      id: 'main',
      ...style
    });

    // 3. Update main-thread state
    setState('style-data', style, StoragePersistence.none);
    setState('style-hash', hash, StoragePersistence.local);

    // 4. Fetch dependencies and trigger processImages
    const [storyRecord, charactersList, instructionsList] = await Promise.all([
      processDb.story.get('main'),
      processDb.characters.toArray(),
      processDb.instructions.toArray()
    ]);

    const story = storyRecord || { title: '', chapters: [] };

    processImages(story, style, charactersList, instructionsList).catch(err => {
      console.error('[saveStyle] processImages error:', err);
    });

    return style;
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to save style';
    console.error('[saveStyle] Error:', err);
    setState('style-error', errorMsg, StoragePersistence.none);
    throw err;
  } finally {
    setState('style-loading', false, StoragePersistence.none);
  }
}
