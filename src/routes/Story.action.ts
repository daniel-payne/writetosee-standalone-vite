import { type ActionFunctionArgs } from 'react-router-dom';
import { saveStory } from '@/data/manageStory';

export async function clientAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'SAVE-UPDATES') {
    const story = formData.get('story') as string;

    try {
      if (story !== null) {
        await saveStory(story);
      }

      return { success: true, message: 'Story updated successfully' };
    } catch (err: any) {
      return { error: err.message || 'Failed to save story' };
    }
  } else if (intent === 'UPDATE-STORY') {
    const story = formData.get('story') as string;

    try {
      if (story !== null) {
        await saveStory(story);
      }
      return { success: true, message: 'Story updated successfully' };
    } catch (err: any) {
      return { error: err.message || 'Failed to save story' };
    }
  }

  return null;
}
