import { useEffect } from 'react';
import { useLocalState, useSharedState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import generateTextDigest from '@/data/process/generate/generateTextDigest';
import processPublication from './workflow/workflowPublication';
import { writeLog } from '../storage/logStorage';

export interface PanelInstruction {
  panelNo: number;
  characters: string[];
  cinematographicText: string;
  isLocked: boolean;
}

let inMemoryInstructions: Record<number, PanelInstruction> | null = null;
let inMemoryHash: string | null = null;
let activeLoadPromise: Promise<Record<number, PanelInstruction>> | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'instructions-hash' && event.newValue && event.newValue !== inMemoryHash) {
      inMemoryInstructions = null;
      inMemoryHash = null;
      loadInstructions().catch((err) => {
        console.warn('Failed to auto-reload instructions from storage change:', err);
      });
    }
  });
}

export function parseInstructionsMarkdown(markdown: string): Record<number, PanelInstruction> {
  const result: Record<number, PanelInstruction> = {};
  if (!markdown || !markdown.trim()) return result;

  const sections = markdown.split(/(?=^#{1,6}\s+Panel\s+\d+)/mi);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^#{1,6}\s+Panel\s+(\d+)/i);
    if (!headerMatch) continue;

    const panelNum = parseInt(headerMatch[1], 10);
    const panelNo = panelNum > 0 ? panelNum - 1 : 0;

    const charMatch = trimmed.match(/\*{0,2}Characters:\*{0,2}\s*(.+)/i);
    const characters = charMatch ? charMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];

    const lockedMatch = trimmed.match(/\*{0,2}Locked:\*{0,2}\s*(true|false|yes|no)/i);
    const isLocked = lockedMatch ? (lockedMatch[1].toLowerCase() === 'true' || lockedMatch[1].toLowerCase() === 'yes') : false;

    let cinematographicText = '';
    const tagMatch = trimmed.match(/<cinematographic-text>([\s\S]*?)<\/cinematographic-text>/i);
    if (tagMatch) {
      cinematographicText = tagMatch[1].trim();
    } else {
      const lines = trimmed.split(/\r?\n/).filter(l =>
        !l.match(/^#{1,6}\s+Panel/i) &&
        !l.match(/\*{0,2}Characters:\*{0,2}/i) &&
        !l.match(/\*{0,2}Locked:\*{0,2}/i)
      );
      cinematographicText = lines.join('\n').trim();
    }

    result[panelNo] = {
      panelNo,
      characters,
      cinematographicText,
      isLocked
    };
  }

  return result;
}

export function serializeInstructionsMarkdown(instructions: Record<number, PanelInstruction> | PanelInstruction[]): string {
  const items = Array.isArray(instructions) ? instructions : Object.values(instructions);
  if (!items || items.length === 0) return '';

  return items
    .filter(inst => (inst.characters && inst.characters.length > 0) || (inst.cinematographicText && inst.cinematographicText.trim()) || inst.isLocked)
    .sort((a, b) => a.panelNo - b.panelNo)
    .map(inst => {
      const parts: string[] = [`## Panel ${inst.panelNo + 1}`];
      if (inst.characters && inst.characters.length > 0) {
        parts.push(`**Characters:** ${inst.characters.join(', ')}`);
      }
      if (inst.isLocked) {
        parts.push(`**Locked:** true`);
      }
      if (inst.cinematographicText && inst.cinematographicText.trim()) {
        parts.push(`<cinematographic-text>\n${inst.cinematographicText.trim()}\n</cinematographic-text>`);
      }
      return parts.join('\n\n');
    })
    .join('\n\n');
}

export async function loadInstructions(): Promise<Record<number, PanelInstruction>> {
  if (inMemoryInstructions !== null && inMemoryHash !== null) {
    return inMemoryInstructions;
  }

  if (activeLoadPromise) {
    return activeLoadPromise;
  }

  setState('instructions-loading', true, StoragePersistence.none);
  setState('instructions-error', null, StoragePersistence.none);

  activeLoadPromise = (async () => {
    try {
      const file = await fileStorage.readFile('instructions.md');
      const text = await file.text();
      const loaded = parseInstructionsMarkdown(text);
      const calculatedHash = generateTextDigest(text);

      inMemoryInstructions = loaded;
      inMemoryHash = calculatedHash;

      setState('instructions-data', loaded as any, StoragePersistence.none);
      setState('instructions-hash', calculatedHash, StoragePersistence.local);

      return loaded;
    } catch (e: any) {
      if (e.name === 'NotFoundError' || e.message?.includes('NotFoundError') || e.message?.includes('does not exist')) {
        const defaultInstructions: Record<number, PanelInstruction> = {};
        const markdown = '';
        const defaultHash = generateTextDigest(markdown);

        inMemoryInstructions = defaultInstructions;
        inMemoryHash = defaultHash;

        setState('instructions-data', defaultInstructions as any, StoragePersistence.none);
        setState('instructions-hash', defaultHash, StoragePersistence.local);

        try {
          await fileStorage.writeFile('instructions.md', markdown);
        } catch (writeErr) {
          console.warn('Could not write default instructions.md:', writeErr);
        }

        return defaultInstructions;
      } else {
        await writeLog('error', 'loadInstructions', `Failed to load instructions: ${e.message || String(e)}`);
        setState('instructions-error', e.message || 'Failed to load instructions', StoragePersistence.none);
        throw e;
      }
    } finally {
      activeLoadPromise = null;
      setState('instructions-loading', false, StoragePersistence.none);
    }
  })();

  return activeLoadPromise;
}

export async function saveInstructions(
  instructions: Record<number, PanelInstruction> | PanelInstruction[],
  setInstructionsHashState?: (hash: string) => void
): Promise<string> {
  setState('instructions-loading', true, StoragePersistence.none);
  setState('instructions-error', null, StoragePersistence.none);

  try {
    const map = Array.isArray(instructions)
      ? instructions.reduce((acc, item) => { acc[item.panelNo] = item; return acc; }, {} as Record<number, PanelInstruction>)
      : instructions;

    const markdown = serializeInstructionsMarkdown(map);
    const hash = generateTextDigest(markdown);

    await fileStorage.writeFile('instructions.md', markdown);

    inMemoryInstructions = map;
    inMemoryHash = hash;

    setState('instructions-data', map as any, StoragePersistence.none);

    if (setInstructionsHashState) {
      setInstructionsHashState(hash);
    } else {
      setState('instructions-hash', hash, StoragePersistence.local);
    }

    await processPublication();

    return hash;
  } catch (e: any) {
    await writeLog('error', 'saveInstructions', `Failed to save instructions: ${e.message || String(e)}`);
    setState('instructions-error', e.message || 'Failed to save instructions', StoragePersistence.none);
    throw e;
  } finally {
    setState('instructions-loading', false, StoragePersistence.none);
  }
}

export function useInstructions(): [Record<number, PanelInstruction>, (val: Record<number, PanelInstruction> | PanelInstruction[]) => Promise<void>] {
  const [instructionsHash, setInstructionsHash] = useLocalState<string>('instructions-hash', '');
  const [instructions] = useSharedState<any>('instructions-data', {});

  const setInstructions = async (val: Record<number, PanelInstruction> | PanelInstruction[]) => {
    await saveInstructions(val, setInstructionsHash);
  };

  useEffect(() => {
    if (!instructionsHash || inMemoryInstructions === null) {
      loadInstructions();
      return;
    }

    if (instructionsHash !== inMemoryHash) {
      loadInstructions();
    }
  }, [instructionsHash]);

  return [instructions || {}, setInstructions];
}

export function clearInstructionsCache(): void {
  inMemoryInstructions = null;
  inMemoryHash = null;
  activeLoadPromise = null;
  setState('instructions-data', {} as any, StoragePersistence.none);
  setState('instructions-hash', '', StoragePersistence.local);
}
