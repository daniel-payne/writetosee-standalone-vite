import Dexie, { type Table } from 'dexie';
import type {
  StoryRecord,
  StyleRecord,
  Character,
  Instruction,
  Prompt,
  Summary
} from './types';

export class ProcessDB extends Dexie {
  story!: Table<StoryRecord, string>;
  style!: Table<StyleRecord, string>;
  characters!: Table<Character, number>;
  instructions!: Table<Instruction, number>;
  prompts!: Table<Prompt, string>;
  summaries!: Table<Summary, number>;

  constructor() {
    super('WriteToSeeProcessDB');
    this.version(1).stores({
      story: 'id',
      style: 'id',
      characters: 'characterNo, characterName',
      instructions: 'instructionNo, paragraphId, pageId, chapterId',
      prompts: 'digest',
      summaries: 'summaryId, digest'
    });
  }
}

export const processDb = new ProcessDB();

export async function ensureProcessDbOpen(): Promise<void> {
  try {
    if (!processDb.isOpen()) {
      await processDb.open();
    }
  } catch (err) {
    console.warn('[ProcessDB] Failed to open database, deleting and recreating...', err);
    await Dexie.delete('WriteToSeeProcessDB');
    await processDb.open();
  }
}

export async function clearProcessDb(): Promise<void> {
  await ensureProcessDbOpen();
  await processDb.transaction('rw', [
    processDb.story,
    processDb.style,
    processDb.characters,
    processDb.instructions,
    processDb.prompts,
    processDb.summaries
  ], async () => {
    await processDb.story.clear();
    await processDb.style.clear();
    await processDb.characters.clear();
    await processDb.instructions.clear();
    await processDb.prompts.clear();
    await processDb.summaries.clear();
  });
}
