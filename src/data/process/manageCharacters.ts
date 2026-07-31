import { useEffect } from 'react';
import { useLocalState, useSharedState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import generateTextDigest from '@/data/process/generate/generateTextDigest';
import processPublication from './workflow/workflowPublication';
import { writeLog } from '../storage/logStorage';

export interface Character {
  name: string;
  description: string;
  [key: string]: any;
}

let inMemoryCharacters: Character[] | null = null;
let inMemoryHash: string | null = null;
let activeLoadPromise: Promise<Character[]> | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'characters-hash' && event.newValue && event.newValue !== inMemoryHash) {
      inMemoryCharacters = null;
      inMemoryHash = null;
      loadCharacters().catch((err) => {
        console.warn('Failed to auto-reload characters from storage change:', err);
      });
    }
  });
}

export function parseCharactersMarkdown(markdown: string): Character[] {
  if (!markdown || markdown.trim() === '') return [];

  const characters: Character[] = [];
  const lines = markdown.split(/\r?\n/);

  let currentName = '';
  let currentDescLines: string[] = [];

  const flush = () => {
    const trimmedName = currentName.trim();
    if (trimmedName && trimmedName.toLowerCase() !== 'characters') {
      characters.push({
        name: trimmedName,
        description: currentDescLines.join('\n').trim()
      });
    }
    currentName = '';
    currentDescLines = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    const bulletMatch = line.match(/^\s*[-*+]\s+\*{0,2}(.+?)\*{0,2}\s*:\s*(.+)$/);

    if (headingMatch) {
      flush();
      currentName = headingMatch[1].trim();
    } else if (bulletMatch) {
      flush();
      characters.push({
        name: bulletMatch[1].trim(),
        description: bulletMatch[2].trim()
      });
    } else {
      if (currentName) {
        currentDescLines.push(line);
      }
    }
  }
  flush();

  return characters;
}

export function serializeCharactersMarkdown(characters: Character[]): string {
  if (!characters || characters.length === 0) return '';
  return characters
    .filter(c => c.name && c.name.trim() !== '')
    .map(c => `## ${c.name.trim()}\n${c.description.trim()}`)
    .join('\n\n');
}

export function mergeCharactersAdditively(existing: Character[], extracted: Character[]): Character[] {
  const result: Character[] = existing.map(c => ({ ...c }));

  for (const newChar of extracted) {
    if (!newChar.name || !newChar.name.trim()) continue;

    const existingIndex = result.findIndex(
      c => c.name.trim().toLowerCase() === newChar.name.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      if (newChar.description && newChar.description.trim()) {
        if (!result[existingIndex].description || !result[existingIndex].description.trim()) {
          result[existingIndex] = {
            ...result[existingIndex],
            description: newChar.description.trim()
          };
        }
      }
    } else {
      result.push({
        name: newChar.name.trim(),
        description: newChar.description.trim()
      });
    }
  }

  return result;
}

export async function loadCharacters(): Promise<Character[]> {
  if (inMemoryCharacters !== null && inMemoryHash !== null) {
    return inMemoryCharacters;
  }

  if (activeLoadPromise) {
    return activeLoadPromise;
  }

  setState('characters-loading', true, StoragePersistence.none);
  setState('characters-error', null, StoragePersistence.none);

  activeLoadPromise = (async () => {
    try {
      const file = await fileStorage.readFile('characters.md');
      const text = await file.text();
      const loaded = parseCharactersMarkdown(text);
      const calculatedHash = generateTextDigest(text);

      inMemoryCharacters = loaded;
      inMemoryHash = calculatedHash;

      setState('characters-data', loaded, StoragePersistence.none);
      setState('characters-hash', calculatedHash, StoragePersistence.local);

      return loaded;
    } catch (e: any) {
      if (e.name === 'NotFoundError' || e.message?.includes('NotFoundError') || e.message?.includes('does not exist')) {
        const defaultCharacters: Character[] = [];
        const markdown = '';
        const defaultHash = generateTextDigest(markdown);

        inMemoryCharacters = defaultCharacters;
        inMemoryHash = defaultHash;

        setState('characters-data', defaultCharacters, StoragePersistence.none);
        setState('characters-hash', defaultHash, StoragePersistence.local);

        try {
          await fileStorage.writeFile('characters.md', markdown);
        } catch (writeErr) {
          console.warn('Could not write default characters.md:', writeErr);
        }

        return defaultCharacters;
      } else {
        await writeLog('error', 'loadCharacters', `Failed to load characters: ${e.message || String(e)}`);
        setState('characters-error', e.message || 'Failed to load characters', StoragePersistence.none);
        throw e;
      }
    } finally {
      activeLoadPromise = null;
      setState('characters-loading', false, StoragePersistence.none);
    }
  })();

  return activeLoadPromise;
}

export async function saveCharacters(
  characters: Character[],
  setCharactersHashState?: (hash: string) => void
): Promise<string> {
  setState('characters-loading', true, StoragePersistence.none);
  setState('characters-error', null, StoragePersistence.none);

  try {
    const markdown = serializeCharactersMarkdown(characters);
    const hash = generateTextDigest(markdown);

    await fileStorage.writeFile('characters.md', markdown);

    inMemoryCharacters = characters;
    inMemoryHash = hash;

    setState('characters-data', characters, StoragePersistence.none);

    if (setCharactersHashState) {
      setCharactersHashState(hash);
    } else {
      setState('characters-hash', hash, StoragePersistence.local);
    }

    await processPublication();

    return hash;
  } catch (e: any) {
    await writeLog('error', 'saveCharacters', `Failed to save characters: ${e.message || String(e)}`);
    setState('characters-error', e.message || 'Failed to save characters', StoragePersistence.none);
    throw e;
  } finally {
    setState('characters-loading', false, StoragePersistence.none);
  }
}

export function useCharacters(): [Character[], (val: Character[]) => Promise<void>] {
  const [charactersHash, setCharactersHash] = useLocalState<string>('characters-hash', '');
  const [characters] = useSharedState<Character[]>('characters-data', []);

  const setCharacters = async (val: Character[]) => {
    await saveCharacters(val, setCharactersHash);
  };

  useEffect(() => {
    if (!charactersHash || inMemoryCharacters === null) {
      loadCharacters();
      return;
    }

    if (charactersHash !== inMemoryHash) {
      loadCharacters();
    }
  }, [charactersHash]);

  return [characters || [], setCharacters];
}

export function useCharactersHash(): [string] {
  const [charactersHash] = useLocalState<string>('characters-hash', '');
  return [charactersHash];
}

export function clearCharactersCache(): void {
  inMemoryCharacters = null;
  inMemoryHash = null;
  activeLoadPromise = null;
  setState('characters-data', [], StoragePersistence.none);
  setState('characters-hash', '', StoragePersistence.local);
}
