import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from './db';
import {
  parseInstructionsMarkdown,
  serializeInstructionsMarkdown,
  generateTextDigest
} from './parsers';
import { processImages } from './workflows/processImages';
import type { Instruction, Style } from './TYPES';

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

    // Ensure instructionNo and DDL columns are present
    instructions = instructions.map((inst, idx) => {
      const num = inst.instructionNo ?? inst.paragraph_no ?? inst.paragraphNo ?? idx;
      const paraId = inst.paragraph_no ?? inst.paragraphNo ?? inst.paragraphId ?? num;
      const pageId = inst.page_no ?? inst.pageNo ?? inst.pageId ?? 0;
      const chapId = inst.chapter_no ?? inst.chapterNo ?? inst.chapterId ?? 0;
      const chars = inst.assigned_characters ?? inst.characters ?? [];
      const charArr = Array.isArray(chars) ? chars : [];
      const dirs = inst.cinematographic_directions ?? inst.cinematographicDirections ?? inst.cinematographicText ?? '';
      const isLocked = Boolean(inst.is_locked ?? inst.isLocked);

      return {
        ...inst,
        instructionNo: num,
        paragraph_no: paraId,
        paragraphNo: paraId,
        paragraphId: paraId,
        page_no: pageId,
        pageNo: pageId,
        pageId,
        chapter_no: chapId,
        chapterNo: chapId,
        chapterId: chapId,
        cinematographic_directions: dirs,
        cinematographicDirections: dirs,
        cinematographicText: dirs,
        assigned_characters: charArr,
        characters: charArr,
        is_locked: isLocked,
        isLocked
      };
    });

    // 1. Fetch dependencies and run processImages
    const [storyRecord, styleRecord, charactersList] = await Promise.all([
      processDb.story.get('main'),
      processDb.style.get('main'),
      processDb.characters.toArray()
    ]);

    const story = storyRecord || { title: '', chapters: [] };
    const style: Style = styleRecord || {
      story_id: 'main',
      drawing_instructions: '',
      panel_per_paragraph: true,
      reference_url: '',
      reference_instructions: '',
      use_reference_instructions: true,
      style_hash: ''
    };

    let finalInstructions = instructions;
    try {
      const updated = await processImages(story, style, charactersList, instructions);
      if (updated && updated.length > 0) {
        finalInstructions = updated;
      }
    } catch (err) {
      console.error('[saveInstructions] processImages error:', err);
    }

    // 2. Serialize and write to disk /instructions.md
    const markdown = serializeInstructionsMarkdown(finalInstructions);
    await fileStorage.writeFile('instructions.md', markdown);

    // 3. Replace in Dexie IndexedDB
    await processDb.instructions.clear();
    if (finalInstructions.length > 0) {
      await processDb.instructions.bulkPut(finalInstructions);
    }

    // 4. Update main-thread state
    const hash = generateTextDigest(markdown);
    setState('instructions-data', finalInstructions, StoragePersistence.none);
    setState('instructions-hash', hash, StoragePersistence.local);

    return finalInstructions;
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to save instructions';
    console.error('[saveInstructions] Error:', err);
    setState('instructions-error', errorMsg, StoragePersistence.none);
    throw err;
  } finally {
    setState('instructions-loading', false, StoragePersistence.none);
  }
}

export async function savePanelInstructions(
  panelNo: number,
  updates: { characters?: string[]; cinematographicText?: string; isLocked?: boolean; imageIndex?: number }
): Promise<Instruction[]> {
  const currentInstructions = await processDb.instructions.toArray();
  const index = currentInstructions.findIndex(inst =>
    (inst.instructionNo === panelNo) ||
    (inst.paragraph_no === panelNo) ||
    (inst.paragraphId === panelNo)
  );

  let updatedList: Instruction[];
  if (index >= 0) {
    updatedList = [...currentInstructions];
    const selectedDigest = updates.imageIndex !== undefined ?
      (updatedList[index].images?.[updates.imageIndex]?.promptDigest || updatedList[index].assigned_prompt_digests?.[updates.imageIndex])
      : undefined;

    updatedList[index] = {
      ...updatedList[index],
      ...(updates.characters !== undefined ? { characters: updates.characters, assigned_characters: updates.characters } : {}),
      ...(updates.cinematographicText !== undefined ? { cinematographicDirections: updates.cinematographicText, cinematographic_directions: updates.cinematographicText, cinematographicText: updates.cinematographicText } : {}),
      ...(updates.isLocked !== undefined ? { isLocked: updates.isLocked, is_locked: updates.isLocked } : {}),
      ...(updates.imageIndex !== undefined ? { imageIndex: updates.imageIndex } : {}),
      ...(selectedDigest ? { current_prompt_digest: selectedDigest, promptDigest: selectedDigest } : {})
    };
  } else {
    updatedList = [
      ...currentInstructions,
      {
        instructionNo: panelNo,
        paragraph_no: panelNo,
        paragraphNo: panelNo,
        paragraphId: panelNo,
        page_no: 0,
        pageNo: 0,
        pageId: 0,
        chapter_no: 0,
        chapterNo: 0,
        chapterId: 0,
        imageIndex: updates.imageIndex || 0,
        cinematographic_directions: updates.cinematographicText || '',
        cinematographicDirections: updates.cinematographicText || '',
        cinematographicText: updates.cinematographicText || '',
        assigned_characters: updates.characters || [],
        characters: updates.characters || [],
        images: [],
        is_locked: Boolean(updates.isLocked),
        isLocked: Boolean(updates.isLocked)
      }
    ];
  }

  return saveInstructions(updatedList);
}
