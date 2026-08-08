import { loadStartup } from '@/data/process/loadStartup';
import { serializeStoryMarkdown } from '@/data/process/parsers';
import { isPermissionGranted } from '@/data/storage/fileStorage';

export interface StoryLoaderData {
  story: string;
}

export async function clientLoader(): Promise<StoryLoaderData> {
  console.log("Story.loader: starting clientLoader...");
  let story = '';

  try {
    const permissionGranted = await isPermissionGranted();
    if (permissionGranted) {
      const data = await loadStartup();
      story = serializeStoryMarkdown(data.story);
    }
  } catch (err) {
    console.warn('Could not load story in clientLoader:', err);
  }

  return { story };
}
