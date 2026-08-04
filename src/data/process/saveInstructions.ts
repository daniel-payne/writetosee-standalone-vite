import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from './db';
import {
  parseInstructionsMarkdown,
  serializeInstructionsMarkdown,
  generateTextDigest
} from './parsers';
import { processImages } from './workflows/processImages';
import type { Instruction } from './types';

/**
 * Saves instructions list (or markdown string) to instructions.md and replaces instructions in IndexedDB.
 * Triggers processImages.
 */
export async function saveInstructions(input: string | Instruction[]): Promise<Instruction[]> {
  setState('instructions-loading', true, StoragePersistence.none);
  setState('instructions-error', null, StoragePersistence.none);

  try {
    let instructions: Instruction[];
    if (typeof input === 'string') {
      instructions = parseInstructionsMarkdown(input);
    } else {
      instructions = input;
    }

    // Ensure instructionNo sequential numbering
    instructions = instructions.map((inst, idx) => ({
      ...inst,
      instructionNo: inst.instructionNo ?? idx
    }));

    // 1. Serialize and write to disk /instructions.md
    const markdown = serializeInstructionsMarkdown(instructions);
    await fileStorage.writeFile('instructions.md', markdown);

    // 2. Replace in Dexie IndexedDB
    await processDb.instructions.clear();
    if (instructions.length > 0) {
      await processDb.instructions.bulkPut(instructions);
    }

    // 3. Update main-thread state
    const hash = generateTextDigest(markdown);
    setState('instructions-data', instructions, StoragePersistence.none);
    setState('instructions-hash', hash, StoragePersistence.local);

    // 4. Fetch dependencies and trigger processImages
    const [storyRecord, styleRecord, charactersList] = await Promise.all([
      processDb.story.get('main'),
      processDb.style.get('main'),
      processDb.characters.toArray()
    ]);

    const story = storyRecord || { title: '', chapters: [] };
    const style = styleRecord || {
      drawingInstructions: '',
      panelPerParagraph: true,
      referenceUrl: '',
      referenceInstructions: '',
      useReferenceInstructions: true
    };

    processImages(story, style, charactersList, instructions).catch(err => {
      console.error('[saveInstructions] processImages error:', err);
    });

    return instructions;
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to save instructions';
    console.error('[saveInstructions] Error:', err);
    setState('instructions-error', errorMsg, StoragePersistence.none);
    throw err;
  } finally {
    setState('instructions-loading', false, StoragePersistence.none);
  }
}
