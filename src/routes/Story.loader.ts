import { isStoryLoaded, loadStory } from '@/data/manageStory';
import { isStyleLoaded, loadStyle } from '@/data/manageStyle';
import processPublication from '@/data/processPublication';

export interface StoryLoaderData {
  story: string;
}

export async function clientLoader(): Promise<StoryLoaderData> {
  let story = '';

  const isSystemLoaded = isStoryLoaded() && isStyleLoaded()

  try {
    story = await loadStory();
    const style = await loadStyle();

    if (isSystemLoaded === false) {
      await processPublication({ style, story });
    }

  } catch (err) {
    console.warn('Could not load story in clientLoader:', err);
  }

  return { story };
}
