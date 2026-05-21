import * as fileStorage from '../data/fileStorage';

export interface EmptyLayoutLoaderData {
  hasDirectory: boolean;
  apiKey: string | null;
  story?: string;
  images?: string;
  characters?: string;
  panels?: string;
}

export async function clientLoader(): Promise<EmptyLayoutLoaderData> {
  let hasDirectory = false;
  let filesList: string[] = [];
  const apiKey = window.sessionStorage.getItem("apiKey") ?? '';

  try {
    hasDirectory = await fileStorage.hasSavedDirectory();
    filesList = await fileStorage.listFiles();
  } catch (err) {
    console.warn('Could not check directory status in EmptyLayout.', err);
  }

  const story = filesList.find((file) => file === 'story.md');
  const images = filesList.find((file) => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));
  const characters = filesList.find((file) => file === 'characters.json');
  const panels = filesList.find((file) => file === 'panels.json');

  return { hasDirectory, apiKey, story, images, characters, panels };
}
