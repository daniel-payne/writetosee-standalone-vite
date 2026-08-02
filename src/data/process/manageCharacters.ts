import { useEffect } from 'react';
import { useLocalState, useSharedState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import generateTextDigest from '@/data/process/generate/generateTextDigest';
import processPublication from './workflow/workflowPublication';
import { writeLog } from '../storage/logStorage';
import llmGenerateText from '@/data/llm/llmGenerateText';
import llmGenerateAnalysis from '@/data/llm/llmGenerateAnalysis';
import { loadStory } from './manageStory';
import { storeCost } from '../storage/costStorage';

export interface Character {
  name: string;
  description: string;
  image?: string;
  instructions?: string;
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
  let currentImage = '';
  let currentDescLines: string[] = [];
  let currentInstLines: string[] = [];
  let inInstructions = false;

  const flush = () => {
    const trimmedName = currentName.trim();
    if (trimmedName && trimmedName.toLowerCase() !== 'characters') {
      characters.push({
        name: trimmedName,
        description: currentDescLines.join('\n').trim(),
        ...(currentImage ? { image: currentImage.trim() } : {}),
        ...(currentInstLines.length > 0 ? { instructions: currentInstLines.join('\n').trim() } : {})
      });
    }
    currentName = '';
    currentImage = '';
    currentDescLines = [];
    currentInstLines = [];
    inInstructions = false;
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    const bulletMatch = line.match(/^\s*[-*+]\s+\*{0,2}(.+?)\*{0,2}\s*:\s*(.+)$/);

    if (headingMatch) {
      flush();
      currentName = headingMatch[1].trim();
    } else if (bulletMatch && !currentName) {
      flush();
      characters.push({
        name: bulletMatch[1].trim(),
        description: bulletMatch[2].trim()
      });
    } else if (currentName) {
      const mdImageMatch = line.match(/!\[.*?\]\((.*?)\)/);
      const keyValImageMatch = line.match(/^\s*Image:\s*(.+)$/i);
      const instructionsMatch = line.match(/^\s*\*{0,2}Instructions:\*{0,2}\s*(.*)$/i);

      if (mdImageMatch) {
        currentImage = mdImageMatch[1].trim();
      } else if (keyValImageMatch) {
        currentImage = keyValImageMatch[1].trim();
      } else if (instructionsMatch) {
        inInstructions = true;
        if (instructionsMatch[1] && instructionsMatch[1].trim()) {
          currentInstLines.push(instructionsMatch[1].trim());
        }
      } else {
        if (inInstructions) {
          currentInstLines.push(line);
        } else {
          currentDescLines.push(line);
        }
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
    .map(c => {
      const parts: string[] = [`## ${c.name.trim()}`];
      if (c.image && c.image.trim()) {
        parts.push(`![${c.name.trim()}](${c.image.trim()})`);
      }
      if (c.description && c.description.trim()) {
        parts.push(c.description.trim());
      }
      if (c.instructions && c.instructions.trim()) {
        parts.push(`**Instructions:**\n${c.instructions.trim()}`);
      }
      return parts.join('\n\n');
    })
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
      if (newChar.instructions && newChar.instructions.trim()) {
        if (!result[existingIndex].instructions || !result[existingIndex].instructions.trim()) {
          result[existingIndex].instructions = newChar.instructions.trim();
        }
      }
      if (newChar.image && newChar.image.trim()) {
        if (!result[existingIndex].image || !result[existingIndex].image.trim()) {
          result[existingIndex].image = newChar.image.trim();
        }
      }
    } else {
      result.push({
        name: newChar.name.trim(),
        description: newChar.description.trim(),
        ...(newChar.image ? { image: newChar.image.trim() } : {}),
        ...(newChar.instructions ? { instructions: newChar.instructions.trim() } : {})
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

export async function analyzeCharacterStory(
  characterName: string,
  currentDescription: string = ''
): Promise<{ description: string; cost: number }> {
  if (!characterName || !characterName.trim()) {
    throw new Error('Character name is required for story analysis.');
  }

  const storyText = await loadStory().catch(() => '');
  if (!storyText || !storyText.trim()) {
    throw new Error('No story text available to analyze.');
  }

  const systemPrompt = `You are an expert literary character analyst.
Your task is to analyze the provided story text and generate a detailed, rich, comprehensive character description for the character named "${characterName}".
Focus on physical appearance, facial features, age, body type, clothing style, personality, key traits, and role in the story.
Return ONLY the description text. Do not include markdown headers or commentary wrapper tags.`;

  const userPrompt = `<character-name>${characterName}</character-name>\n<current-description>${currentDescription}</current-description>\n<story>\n${storyText}\n</story>`;

  const { content, totalCost } = await llmGenerateText(systemPrompt, userPrompt);

  if (totalCost) {
    await storeCost([totalCost], 'character');
  }

  return {
    description: (content || '').trim(),
    cost: totalCost || 0
  };
}

export async function analyzeCharacterImage(
  imagePath: string,
  characterName: string = 'Character'
): Promise<{ instructions: string; cost: number }> {
  if (!imagePath || !imagePath.trim()) {
    throw new Error('No picture selected to analyze.');
  }

  const cleanPath = imagePath.trim();
  let base64Data = '';
  let mimeType = 'image/png';

  if (cleanPath.startsWith('blob:') || cleanPath.startsWith('data:')) {
    const res = await fetch(cleanPath);
    const blob = await res.blob();
    mimeType = blob.type || 'image/png';
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64Data = btoa(binary);
  } else {
    let imageFile: File;
    try {
      imageFile = await fileStorage.readFile(cleanPath);
    } catch {
      if (!cleanPath.startsWith('images/')) {
        imageFile = await fileStorage.readFile(`images/${cleanPath}`);
      } else {
        throw new Error(`Image file not found: ${cleanPath}`);
      }
    }
    mimeType = imageFile.type || 'image/png';
    const arrayBuffer = await imageFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64Data = btoa(binary);
  }

  const systemPrompt = `You are an expert visual artist and character illustrator.
Analyze the provided image of the character "${characterName}".
Generate precise, highly detailed step-by-step drawing instructions for illustrating this character.
Cover: art style, body proportions, facial structure & features, eye shape/color, hair style/color, outfit & clothing details, color palette, lighting/shadowing, and key visual attributes.
Return ONLY the drawing instructions text. Do not include markdown headers or wrapper commentary.`;

  const userPrompt = `Analyze the character picture for "${characterName}" and provide detailed drawing instructions.`;

  const { content, totalCost } = await llmGenerateAnalysis(systemPrompt, userPrompt, {
    mimeType,
    base64Data
  });

  if (totalCost) {
    await storeCost([totalCost], 'character');
  }

  return {
    instructions: (content || '').trim(),
    cost: totalCost || 0
  };
}
