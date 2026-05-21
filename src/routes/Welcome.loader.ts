import * as fileStorage from '../data/fileStorage';
import processStory from '../data/processStory';

export interface WelcomeLoaderData {
  hasDirectory: boolean;
  filesList: string[] | null;
  directoryName: string | null;
  apiKey: string | null;
  safeMode: boolean;
}

export async function clientLoader(): Promise<WelcomeLoaderData> {
  let hasDirectory = false;
  let filesList: string[] = [];
  let directoryName: string | null = null;

  const safeMode = (window.localStorage.getItem("safeMode") ?? '1') === '1' ? true : false;

  // Retrieve API Key directly from window.sessionStorage in clientLoader
  const apiKey = window.sessionStorage.getItem("apiKey") ?? '';

  try {
    hasDirectory = await fileStorage.hasSavedDirectory();

    if (hasDirectory) {
      filesList = await fileStorage.listFiles();
      directoryName = await fileStorage.getDirectoryName();

      let story = '';
      if (filesList && filesList.includes('story.md')) {
        try {
          const storyFile = await fileStorage.readFile('story.md');
          story = await storyFile.text();
        } catch (err) {
          console.warn('Could not read story.md inside Welcome loader', err);
        }
      }
      await processStory({ story });
    }
  } catch (err) {
    console.warn('Could not auto-verify directory handle inside clientLoader.', err);
  }

  return {
    safeMode,
    hasDirectory,
    filesList,
    directoryName,
    apiKey
  };
}
