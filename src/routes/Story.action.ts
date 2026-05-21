import * as fileStorage from '../lib/fileStorage';
import { type ActionFunctionArgs } from 'react-router-dom';

export async function clientAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'SAVE-UPDATES') {
    const manuscript = formData.get('manuscript');
    const story = formData.get('story');

    try {
      if (manuscript !== null) {
        await fileStorage.writeFile('manuscript.md', manuscript as string);
      }
      if (story !== null) {
        await fileStorage.writeFile('story.json', story as string);
      }
      return { success: true, message: 'Story updated successfully' };
    } catch (err: any) {
      return { error: err.message || 'Failed to save story' };
    }
  } else if (intent === 'UPDATE-MANUSCRIPT') {
    const manuscript = formData.get('manuscript');

    // await processManuscript(manuscript as string); 

    // try {
    //   if (manuscript !== null) {
    //     await fileStorage.writeFile('manuscript.md', manuscript as string);
    //   }
    //   return { success: true, message: 'Manuscript updated successfully' };
    // } catch (err: any) {
    //   return { error: err.message || 'Failed to save manuscript' };
    // }
  }

  return null;
}
