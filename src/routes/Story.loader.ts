import { isStoryLoaded, loadStory } from '@/data/process/manageStory';
import { isStyleLoaded, loadStyle } from '@/data/process/manageStyle';
import processPublication from '@/data/process/workflow/workflowPublication';
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
      const isSystemLoaded = isStoryLoaded() && isStyleLoaded();
      console.log("Story.loader: loading story...");
      story = await loadStory();
      console.log("Story.loader: loading style...");
      const style = await loadStyle();

      if (isSystemLoaded === false) {
        console.log("Story.loader: processing publication (background)...");
        processPublication({ style, story }).catch(err => {
          console.warn('Background publication processing failed:', err);
        });
      }
    }
  } catch (err) {
    console.warn('Could not load story in clientLoader:', err);
  }

  console.log("Story.loader: clientLoader finished!");
  return { story };
}
