import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from './db';
import {
  parseCharactersMarkdown,
  serializeCharactersMarkdown,
  generateTextDigest
} from './parsers';
import { processImages } from './workflows/processImages';
import type { Character } from './types';

/**
 * Saves characters list (or markdown string) to characters.md and replaces characters in IndexedDB.
 * Triggers processImages.
 */
export async function saveCharacters(input: string | Character[]): Promise<Character[]> {
  setState('characters-loading', true, StoragePersistence.none);
  setState('characters-error', null, StoragePersistence.none);

  try {
    let characters: Character[];
    if (typeof input === 'string') {
      characters = parseCharactersMarkdown(input);
    } else {
      characters = input;
    }

    // Ensure characterNo sequential numbering
    characters = characters.map((c, idx) => ({
      ...c,
      characterNo: c.characterNo ?? idx
    }));

    // 1. Serialize and write to disk /characters.md
    const markdown = serializeCharactersMarkdown(characters);
    await fileStorage.writeFile('characters.md', markdown);

    // 2. Replace in Dexie IndexedDB
    await processDb.characters.clear();
    if (characters.length > 0) {
      await processDb.characters.bulkPut(characters);
    }

    // 3. Update main-thread state
    const hash = generateTextDigest(markdown);
    setState('characters-data', characters, StoragePersistence.none);
    setState('characters-hash', hash, StoragePersistence.local);

    // 4. Fetch dependencies and trigger processImages
    const [storyRecord, styleRecord, instructionsList] = await Promise.all([
      processDb.story.get('main'),
      processDb.style.get('main'),
      processDb.instructions.toArray()
    ]);

    const story = storyRecord || { title: '', chapters: [] };
    const style = styleRecord || {
      drawingInstructions: '',
      panelPerParagraph: true,
      referenceUrl: '',
      referenceInstructions: '',
      useReferenceInstructions: true
    };

    processImages(story, style, characters, instructionsList).catch(err => {
      console.error('[saveCharacters] processImages error:', err);
    });

    return characters;
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to save characters';
    console.error('[saveCharacters] Error:', err);
    setState('characters-error', errorMsg, StoragePersistence.none);
    throw err;
  } finally {
    setState('characters-loading', false, StoragePersistence.none);
  }
}
