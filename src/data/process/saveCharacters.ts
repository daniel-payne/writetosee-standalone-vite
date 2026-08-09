import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from './db';
import {
  parseCharactersMarkdown,
  serializeCharactersMarkdown,
  serializeInstructionsMarkdown,
  generateTextDigest,
  serializeStoryMarkdown
} from './parsers';
import { processImages } from './workflows/processImages';
import type { Character, Style } from './TYPES';
import llmGenerateText from '@/data/llm/llmGenerateText';
import llmGenerateAnalysis from '@/data/llm/llmGenerateAnalysis';
import { storeCost } from '@/data/storage/costStorage';

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

    // Ensure characterNo and character_no sequential numbering
    characters = characters.map((c, idx) => {
      const cNo = c.character_no ?? c.characterNo ?? idx;
      const cName = c.character_name || c.characterName || c.name || `Character ${idx + 1}`;
      const refUrl = c.reference_url || c.referenceUrl || c.image || '';
      const desc = c.description_text || c.descriptionText || c.description || '';
      const inst = c.instructions_text || c.instructionsText || c.instructions || '';
      const cId = c.character_id || c.characterId || `char_${idx}_${Date.now()}`;
      const box = c.cropBox || (typeof c.crop_box === 'object' ? c.crop_box : (typeof c.crop_box === 'string' ? JSON.parse(c.crop_box) : undefined));

      return {
        ...c,
        character_id: cId,
        characterId: cId,
        character_no: cNo,
        characterNo: cNo,
        character_name: cName,
        characterName: cName,
        name: cName,
        reference_url: refUrl,
        referenceUrl: refUrl,
        image: refUrl,
        cropBox: box || undefined,
        crop_box: box ? JSON.stringify(box) : undefined,
        crop_x: box ? box.x : undefined,
        crop_y: box ? box.y : undefined,
        crop_width: box ? box.width : undefined,
        crop_height: box ? box.height : undefined,
        description_text: desc,
        descriptionText: desc,
        description: desc,
        instructions_text: inst,
        instructionsText: inst,
        instructions: inst
      };
    });

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
    const style: Style = styleRecord || {
      story_id: 'main',
      drawing_instructions: '',
      panel_per_paragraph: true,
      reference_url: '',
      reference_instructions: '',
      use_reference_instructions: true,
      style_hash: ''
    };

    try {
      const updatedInstructions = await processImages(story, style, characters, instructionsList);
      if (updatedInstructions && updatedInstructions.length > 0) {
        const instMd = serializeInstructionsMarkdown(updatedInstructions);
        await fileStorage.writeFile('instructions.md', instMd).catch(() => {});
      }
    } catch (err) {
      console.error('[saveCharacters] processImages error:', err);
    }

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

export function mergeCharactersAdditively(existing: Character[], extracted: Character[]): Character[] {
  const result: Character[] = existing.map(c => ({ ...c }));

  for (const newChar of extracted) {
    const newName = newChar.character_name || newChar.characterName || (newChar as any).name || '';
    if (!newName.trim()) continue;

    const existingIndex = result.findIndex(
      c => (c.character_name || c.characterName || (c as any).name || '').trim().toLowerCase() === newName.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      const desc = newChar.description_text || newChar.descriptionText || (newChar as any).description;
      if (desc && !result[existingIndex].description_text && !result[existingIndex].descriptionText) {
        result[existingIndex].description_text = desc;
        result[existingIndex].descriptionText = desc;
        result[existingIndex].description = desc;
      }
      const inst = newChar.instructions_text || newChar.instructionsText || (newChar as any).instructions;
      if (inst && !result[existingIndex].instructions_text && !result[existingIndex].instructionsText) {
        result[existingIndex].instructions_text = inst;
        result[existingIndex].instructionsText = inst;
        result[existingIndex].instructions = inst;
      }
      const ref = newChar.reference_url || newChar.referenceUrl || (newChar as any).image;
      if (ref && !result[existingIndex].reference_url && !result[existingIndex].referenceUrl) {
        result[existingIndex].reference_url = ref;
        result[existingIndex].referenceUrl = ref;
        result[existingIndex].image = ref;
      }
      const box = newChar.cropBox || (typeof newChar.crop_box === 'object' ? newChar.crop_box : (typeof newChar.crop_box === 'string' ? JSON.parse(newChar.crop_box) : undefined));
      if (box && !result[existingIndex].cropBox && !result[existingIndex].crop_box) {
        result[existingIndex].cropBox = box;
        result[existingIndex].crop_box = typeof box === 'string' ? box : JSON.stringify(box);
        result[existingIndex].crop_x = box.x;
        result[existingIndex].crop_y = box.y;
        result[existingIndex].crop_width = box.width;
        result[existingIndex].crop_height = box.height;
      }
    } else {
      const desc = newChar.description_text || newChar.descriptionText || (newChar as any).description || '';
      const inst = newChar.instructions_text || newChar.instructionsText || (newChar as any).instructions || '';
      const ref = newChar.reference_url || newChar.referenceUrl || (newChar as any).image || '';
      const box = newChar.cropBox || (typeof newChar.crop_box === 'object' ? newChar.crop_box : (typeof newChar.crop_box === 'string' ? JSON.parse(newChar.crop_box) : undefined));

      result.push({
        character_id: `char_${result.length}_${Date.now()}`,
        characterId: `char_${result.length}_${Date.now()}`,
        character_no: result.length,
        characterNo: result.length,
        character_name: newName.trim(),
        characterName: newName.trim(),
        name: newName.trim(),
        reference_url: ref,
        referenceUrl: ref,
        image: ref,
        cropBox: box || undefined,
        crop_box: box ? JSON.stringify(box) : undefined,
        crop_x: box ? box.x : undefined,
        crop_y: box ? box.y : undefined,
        crop_width: box ? box.width : undefined,
        crop_height: box ? box.height : undefined,
        description_text: desc,
        descriptionText: desc,
        description: desc,
        instructions_text: inst,
        instructionsText: inst,
        instructions: inst
      });
    }
  }

  return result;
}

export async function analyzeCharacterStory(
  characterName: string,
  currentDescription: string = ''
): Promise<{ description: string; cost: number }> {
  if (!characterName || !characterName.trim()) {
    throw new Error('Character name is required for story analysis.');
  }

  const storyRecord = await processDb.story.get('main');
  const storyText = storyRecord ? serializeStoryMarkdown(storyRecord) : '';
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

async function cropImageBase64(
  base64Data: string,
  mimeType: string,
  cropBox: { x: number; y: number; width: number; height: number }
): Promise<{ base64Data: string; mimeType: string }> {
  const MAX_DIM = 2048;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        const sx = Math.max(0, Math.floor(cropBox.x * naturalWidth));
        const sy = Math.max(0, Math.floor(cropBox.y * naturalHeight));
        const sw = Math.min(naturalWidth - sx, Math.ceil(cropBox.width * naturalWidth));
        const sh = Math.min(naturalHeight - sy, Math.ceil(cropBox.height * naturalHeight));

        if (sw <= 0 || sh <= 0) {
          resolve({ base64Data, mimeType });
          return;
        }

        let outW = sw;
        let outH = sh;
        if (outW > MAX_DIM || outH > MAX_DIM) {
          const scale = Math.min(MAX_DIM / outW, MAX_DIM / outH);
          outW = Math.round(outW * scale);
          outH = Math.round(outH * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ base64Data, mimeType });
          return;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const croppedBase64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
        resolve({ base64Data: croppedBase64, mimeType: 'image/jpeg' });
      } catch (err) {
        console.warn('Failed to crop image on canvas:', err);
        resolve({ base64Data, mimeType });
      }
    };
    img.onerror = (err) => {
      console.warn('Failed to load image for cropping:', err);
      resolve({ base64Data, mimeType });
    };
    img.src = `data:${mimeType};base64,${base64Data}`;
  });
}

export async function analyzeCharacterImage(
  imagePath: string,
  characterName: string = 'Character',
  cropBox?: { x: number; y: number; width: number; height: number } | null
): Promise<{ instructions: string; cost: number }> {
  if (!imagePath || !imagePath.trim()) {
    throw new Error('No picture selected to analyze.');
  }

  const cleanPath = imagePath.trim();
  let base64Data: string;
  let mimeType: string;

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

  if (cropBox && cropBox.width > 0 && cropBox.height > 0) {
    const cropped = await cropImageBase64(base64Data, mimeType, cropBox);
    base64Data = cropped.base64Data;
    mimeType = cropped.mimeType;
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
