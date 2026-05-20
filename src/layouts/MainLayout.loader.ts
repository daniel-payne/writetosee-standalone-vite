import * as fileStorage from '../lib/fileStorage';

export interface MainLayoutLoaderData {
  hasDirectory: boolean;
  apiKey: string | null;
  safeMode: boolean;
  manuscript?: string;
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

  const manuscript = filesList.find((file) => file === 'manuscript.md');
  const images = filesList.find((file) => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));
  const characters = filesList.find((file) => file === 'characters.json');
  const panels = filesList.find((file) => file === 'panels.json');

  return { hasDirectory, apiKey, safeMode, manuscript, images, characters, panels };
}
