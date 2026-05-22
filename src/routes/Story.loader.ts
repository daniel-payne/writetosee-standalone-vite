import * as fileStorage from '@/data/fileStorage';

export interface StoryLoaderData {
  story: string;

}

export async function clientLoader(): Promise<StoryLoaderData> {
  let story = '';


  try {
    const storyFile = await fileStorage.readFile('story.md');
    story = await storyFile.text();
  } catch (err) {
    console.warn('Could not read story.md', err);
  }



  return { story };
}
