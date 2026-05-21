import * as fileStorage from '../lib/fileStorage';
import { type ActionFunctionArgs } from 'react-router-dom';

export async function clientAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'SAVE-UPDATES') {
    const story = formData.get('story');
    const publication = formData.get('publication');

    try {
      if (story !== null) {
        await fileStorage.writeFile('story.md', story as string);
      }
      if (publication !== null) {
        await fileStorage.writeFile('publication.json', publication as string);
      }
      return { success: true, message: 'Story updated successfully' };
    } catch (err: any) {
      return { error: err.message || 'Failed to save story' };
    }
  } else if (intent === 'UPDATE-STORY') {
    const story = formData.get('story');

    // await processStory(story as string); 

    try {
      if (story !== null) {
        await fileStorage.writeFile('story.md', story as string);
      }
      return { success: true, message: 'Story updated successfully' };
    } catch (err: any) {
      return { error: err.message || 'Failed to save story' };
    }
  }

  return null;
}
