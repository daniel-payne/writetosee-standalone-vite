import { type ActionFunctionArgs } from 'react-router-dom';
import { saveCharacters, loadCharacters, mergeCharactersAdditively } from '@/data/process/manageCharacters';
import generateCharacters from '@/data/process/generate/generateCharacters';
import { loadStory } from '@/data/process/manageStory';
import { writeLog } from '@/data/storage/logStorage';

export async function clientAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'SAVE-UPDATES') {
    const charactersJson = formData.get('charactersJson') as string;
    try {
      let charactersToSave = [];
      if (charactersJson) {
        charactersToSave = JSON.parse(charactersJson);
      }
      await saveCharacters(charactersToSave);
      return { success: true, message: 'Characters saved to characters.md', timestamp: Date.now() };
    } catch (err: any) {
      await writeLog('error', 'Characters.action', `Failed to save characters: ${err.message}`);
      return { error: err.message || 'Failed to save characters' };
    }
  } else if (intent === 'CANCEL-UPDATES') {
    try {
      const original = await loadCharacters();
      return { success: true, message: 'Changes cancelled', characters: original, timestamp: Date.now() };
    } catch (err: any) {
      return { error: err.message || 'Failed to cancel updates' };
    }
  } else if (intent === 'EXTRACT-CHARACTERS') {
    try {
      const storyText = await loadStory();
      if (!storyText || storyText.trim() === '') {
        return { error: 'No story text available to extract characters from.' };
      }

      const existingCharacters = await loadCharacters();
      const extracted = await generateCharacters(storyText);

      const merged = mergeCharactersAdditively(existingCharacters, extracted);
      await saveCharacters(merged);

      return {
        success: true,
        message: `Successfully extracted ${extracted.length} character(s)`,
        extractedCount: extracted.length,
        characters: merged,
        timestamp: Date.now()
      };
    } catch (err: any) {
      await writeLog('error', 'Characters.action', `Failed to extract characters: ${err.message}`);
      return { error: err.message || 'Failed to extract characters' };
    }
  }

  return null;
}
