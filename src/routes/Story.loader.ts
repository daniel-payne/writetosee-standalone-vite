import { loadStory } from '@/data/manageStory';

export interface StoryLoaderData {
  story: string;
}

export async function clientLoader(): Promise<StoryLoaderData> {
  let story = '';

  try {
    story = await loadStory();
  } catch (err) {
    console.warn('Could not load story in clientLoader:', err);
  }

  return { story };
}
