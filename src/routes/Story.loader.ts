import { loadStartup } from '@/data/process/loadStartup';
import { serializeStoryMarkdown } from '@/data/process/parsers';
import { isPermissionGranted } from '@/data/storage/fileStorage';
import { processDb } from '@/data/process/db';

export interface StoryLoaderData {
  story: string;
}

export async function clientLoader(): Promise<StoryLoaderData> {
  console.log("[TRACE:LOADER] Story.loader: clientLoader() started");
  let story = '';

  try {
    const permissionGranted = await isPermissionGranted();
    console.log("[TRACE:LOADER] Story.loader: isPermissionGranted =", permissionGranted);
    if (permissionGranted) {
      const existingStory = await processDb.story.get('main');
      if (existingStory && (existingStory.story_text || existingStory.chapters?.length)) {
        story = existingStory.story_text || serializeStoryMarkdown(existingStory);
        console.log("[TRACE:LOADER] Story.loader: Using existing Dexie story, length =", story.length);
      } else {
        console.log("[TRACE:LOADER] Story.loader: Calling loadStartup()...");
        const data = await loadStartup();
        story = serializeStoryMarkdown(data.story);
        console.log("[TRACE:LOADER] Story.loader: loadStartup() completed, story length =", story.length);
      }
    } else {
      console.log("[TRACE:LOADER] Story.loader: Permission not granted yet.");
    }
  } catch (err) {
    console.warn('[TRACE:LOADER] Could not load story in clientLoader:', err);
  }

  return { story };
}
