import * as fileStorage from '../lib/fileStorage';

export interface StoryLoaderData {
  manuscript: string;
  story: Record<string, any>;
}

export async function clientLoader(): Promise<StoryLoaderData> {
  let manuscript = '';
  let story = {};

  try {
    const manuscriptFile = await fileStorage.readFile('manuscript.md');
    manuscript = await manuscriptFile.text();
  } catch (err) {
    console.warn('Could not read manuscript.md', err);
  }

  try {
    const storyFile = await fileStorage.readFile('story.json');
    const text = await storyFile.text();

    story = JSON.parse(text);
  } catch (err) {
    console.warn('Could not read story.json', err);
  }

  return { manuscript, story };
}
