import { loadStory } from '@/data/processOLD/manageStory';
import { loadStyle } from '@/data/processOLD/manageStyle';
import { isPermissionGranted } from '@/data/storage/fileStorage';

export interface StoryLoaderData {
  story: string;
}

export async function clientLoader(): Promise<StoryLoaderData> {
  console.log("Story.loader: starting clientLoader...");
  let story = '';

  try {
    console.log("Story.loader: checking permission...");
    const permissionGranted = await isPermissionGranted();
    console.log("Story.loader: permissionGranted =", permissionGranted);
    if (permissionGranted) {
      console.log("Story.loader: loading story...");
      story = await loadStory();
      console.log("Story.loader: loading style...");
      await loadStyle();
    }
  } catch (err) {
    console.warn('Could not load story in clientLoader:', err);
  }

  console.log("Story.loader: clientLoader finished!");
  return { story };
}
