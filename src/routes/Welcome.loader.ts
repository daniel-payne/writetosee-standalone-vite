import * as fileStorage from '../lib/fileStorage';

export interface WelcomeLoaderData {
  hasDirectory: boolean;
  filesList: string[] | null;
  directoryName: string | null;
  apiKey: string | null;
}

export async function clientLoader(): Promise<WelcomeLoaderData> {
  let hasDirectory = false;
  let filesList: string[] = [];
  let directoryName: string | null = null;

  // Retrieve API Key directly from window.sessionStorage in clientLoader
  const apiKey = window.sessionStorage.getItem("apiKey") ?? '';

  try {
    hasDirectory = await fileStorage.hasSavedDirectory();

    if (hasDirectory) {
      filesList = await fileStorage.listFiles();
      directoryName = await fileStorage.getDirectoryName();
    }
  } catch (err) {
    console.warn('Could not auto-verify directory handle inside clientLoader.', err);
  }

  return {
    hasDirectory,
    filesList,
    directoryName,
    apiKey
  };
}
