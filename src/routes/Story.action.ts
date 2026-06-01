import { type ActionFunctionArgs } from 'react-router-dom';
import { saveStory, loadStory } from '@/data/manageStory';
import processPublication from '@/data/processPublication';

export async function clientAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'SAVE-UPDATES') {
    const story = formData.get('story') as string;

    try {
      if (story !== null) {
        // Save Story Process publication
        await saveStory(story);
      }

      return { success: true, message: 'Story updated successfully' };
    } catch (err: any) {
      return { error: err.message || 'Failed to save story' };
    }
  } else if (intent === 'CANCEL-UPDATES') {
    try {
      const originalStory = await loadStory();
      await processPublication({ story: originalStory });
      return { success: true, message: 'Changes cancelled', timestamp: Date.now() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel updates';
      return { error: errorMsg };
    }
  } else if (intent === 'UPDATE-STORY') {
    const story = formData.get('story') as string;

    try {
      // if (story !== null) {
      //   await saveStory(story);
      // }

      await processPublication({ story })

      return { success: true, message: 'Story updated successfully' };
    } catch (err: any) {
      return { error: err.message || 'Failed to save story' };
    }
  }

  return null;
}
