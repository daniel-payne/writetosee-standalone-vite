import llmGenerateText from '@/data/llm/llmGenerateText';
import { storeCost } from '@/data/storage/costStorage';
import { writeLog } from '@/data/storage/logStorage';
import type { Character } from '@/data/process/TYPES';
import { createExtractCharactersSystemPrompt } from '@/data/llm/prompts/createExtractCharactersSystemPrompt';
import { createExtractCharactersUserPrompt } from '@/data/llm/prompts/createExtractCharactersUserPrompt';

export default async function generateCharacters(storyText: string): Promise<Character[]> {
  if (!storyText || storyText.trim() === '') {
    return [];
  }

  try {
    const { content, totalCost } = await llmGenerateText(
      createExtractCharactersSystemPrompt(),
      createExtractCharactersUserPrompt({ storyText })
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
          character_id: `char_${idx}_${Date.now()}`,
          characterId: `char_${idx}_${Date.now()}`,
          character_no: idx,
          characterNo: idx,
          character_name: String(item.characterName || item.name || '').trim(),
          characterName: String(item.characterName || item.name || '').trim(),
          name: String(item.characterName || item.name || '').trim(),
          description_text: String(item.descriptionText || item.description || '').trim(),
          descriptionText: String(item.descriptionText || item.description || '').trim(),
          description: String(item.descriptionText || item.description || '').trim(),
          instructions_text: '',
          instructionsText: '',
          reference_url: '',
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
