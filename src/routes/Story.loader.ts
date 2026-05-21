import * as fileStorage from '../lib/fileStorage';

export interface StoryLoaderData {
  story: string;
  publication: Record<string, any>;
}

export async function clientLoader(): Promise<StoryLoaderData> {
  let story = '';
  let publication = {};

  try {
    const storyFile = await fileStorage.readFile('story.md');
    story = await storyFile.text();
  } catch (err) {
    console.warn('Could not read story.md', err);
  }

  try {
    const publicationFile = await fileStorage.readFile('publication.json');
    const text = await publicationFile.text();

    publication = JSON.parse(text);
  } catch (err) {
    console.warn('Could not read publication.json', err);
  }

  return { story, publication };
}
