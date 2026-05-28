import * as fileStorage from '@/data/storage/fileStorage';

export interface MainLayoutLoaderData {
  hasDirectory: boolean;
  apiKey: string | null;
  safeMode: boolean;
  story?: string;
  images?: string;
  characters?: string;
  panels?: string;
}

export async function clientLoader(): Promise<MainLayoutLoaderData> {
  let hasDirectory = false;
  let filesList: string[] = [];
  const apiKey = window.sessionStorage.getItem("apiKey") ?? '';
  const safeMode = (window.localStorage.getItem("safeMode") ?? '1') === '1' ? true : false;

  try {
    hasDirectory = await fileStorage.hasSavedDirectory();
    filesList = await fileStorage.listFiles();
  } catch (err) {
    console.warn('Could not check directory status in MainLayout.', err);
  }

  const story = filesList.find((file) => file === 'story.md');
  const images = filesList.find((file) => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));
  const characters = filesList.find((file) => file === 'characters.json');
  const panels = filesList.find((file) => file === 'panels.json');

  return { hasDirectory, apiKey, safeMode, story, images, characters, panels };
}
