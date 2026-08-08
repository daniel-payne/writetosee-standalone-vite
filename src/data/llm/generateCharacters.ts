import llmGenerateText from '@/data/llm/llmGenerateText';
import { storeCost } from '@/data/storage/costStorage';
import { writeLog } from '@/data/storage/logStorage';
import type { Character } from '@/data/process/TYPES';

const SYSTEM_PROMPT = `
You are an expert literary analyst and character extractor.
Your task is to analyze the story text provided by the user and extract all key characters.

Strict Constraints:
1. Extract at most 10 characters (maximum of 10 characters).
2. For each character, provide a "name" and a clear, descriptive summary ("description") covering their physical appearance, traits, and role in the story.
3. Return ONLY a valid JSON array of character objects with keys "name" and "description".
4. Do not include markdown formatting tags, fences, or introductory text.

Example format:
[
  {"name": "Alice", "description": "A curious young girl with blue eyes and blonde hair who explores Wonderland."},
  {"name": "White Rabbit", "description": "A frantic, waistcoat-wearing rabbit who is always running late."}
]
`;

export default async function generateCharacters(storyText: string): Promise<Character[]> {
  if (!storyText || storyText.trim() === '') {
    return [];
  }

  try {
    const { content, totalCost } = await llmGenerateText(
      SYSTEM_PROMPT,
      `<story>\n${storyText}\n</story>`
    );

    if (totalCost) {
      await storeCost([totalCost], 'character');
    }

    const rawContent = (content || '').trim();
    if (!rawContent) return [];

    const cleaned = rawContent
      .replace(/^```(json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      const extracted: Character[] = parsed
        .filter((item: any) => item && (item.name || item.characterName))
        .map((item: any, idx: number) => ({
          characterNo: idx,
          characterName: String(item.characterName || item.name || '').trim(),
          descriptionText: String(item.descriptionText || item.description || '').trim(),
          instructionsText: '',
          referenceUrl: ''
        }))
        .slice(0, 10);

      return extracted;
    }

    return [];
  } catch (err: unknown) {
    await writeLog(
      'error',
      'generateCharacters',
      `Failed to extract characters with LLM: ${err instanceof Error ? err.message : String(err)}`
    );
    return [];
  }
}
