import Dexie, { type Table } from 'dexie';
import type {
  Story,
  Chapter,
  Page,
  Paragraph,
  Style,
  Character,
  Instruction,
  ImageEntity,
  Prompt,
  Summary
} from './TYPES';

export class ProcessDB extends Dexie {
  story!: Table<Story, string>;
  chapters!: Table<Chapter, number>;
  pages!: Table<Page, number>;
  paragraphs!: Table<Paragraph, number>;
  style!: Table<Style, string>;
  characters!: Table<Character, string>;
  instructions!: Table<Instruction, any>;
  images!: Table<ImageEntity, string>;
  prompts!: Table<Prompt, string>;
  summaries!: Table<Summary, string>;

  constructor() {
    super('WriteToSeeProcessDB');
    this.version(3).stores({
      story: 'story_id, id',
      chapters: 'chapter_no, story_id',
      pages: 'page_no, chapter_no, [chapter_no+page_no]',
      paragraphs: 'paragraph_no, chapter_no, page_no, [chapter_no+page_no+paragraph_no]',
      style: 'story_id, id',
      characters: 'character_id, character_no, character_name, name',
      instructions: 'paragraph_no, instructionNo, [chapter_no+page_no+paragraph_no], current_prompt_digest',
      images: 'image_digest, image_status, created_at',
      prompts: 'prompt_digest, digest',
      summaries: 'summary_digest, digest, summaryId'
    });
  }
}

export const processDb = new ProcessDB();
export const db = processDb;

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
    processDb.chapters,
    processDb.pages,
    processDb.paragraphs,
    processDb.style,
    processDb.characters,
    processDb.instructions,
    processDb.images,
    processDb.prompts,
    processDb.summaries
  ], async () => {
    await processDb.story.clear();
    await processDb.chapters.clear();
    await processDb.pages.clear();
    await processDb.paragraphs.clear();
    await processDb.style.clear();
    await processDb.characters.clear();
    await processDb.instructions.clear();
    await processDb.images.clear();
    await processDb.prompts.clear();
    await processDb.summaries.clear();
  });
}
