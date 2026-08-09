import * as fileStorage from '@/data/storage/fileStorage';

export interface MainLayoutLoaderData {
  hasDirectory: boolean;
  permissionGranted: boolean;
  directoryName: string | null;
  apiKey: string | null;
  safeMode: boolean;
  story?: string;
  images?: string;
  characters?: string;
  panels?: string;
}

export async function clientLoader({ request }: any): Promise<MainLayoutLoaderData> {
  console.log("[TRACE:LOADER] MainLayout.loader: clientLoader() started");
  const url = new URL(request.url);
  let urlApiKey = url.searchParams.get('apiKey');

  // Fallback checks in case the API key is passed in the hash portion or window.location
  if (!urlApiKey && typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    urlApiKey = searchParams.get('apiKey');
    if (!urlApiKey) {
      const hash = window.location.hash;
      if (hash.includes('?')) {
        const hashSearch = hash.split('?')[1];
        const hashParams = new URLSearchParams(hashSearch);
        urlApiKey = hashParams.get('apiKey');
      }
    }
  }

  if (urlApiKey) {
    window.sessionStorage.setItem("apiKey", urlApiKey);
  }

  let hasDirectory = false;
  let filesList: string[] = [];
  const apiKey = window.sessionStorage.getItem("apiKey") ?? '';
  const rawSafeMode = window.localStorage.getItem("safeMode") ?? '1';
  const safeMode = rawSafeMode === '1' || rawSafeMode === 'true';

  let permissionGranted = false;
  let directoryName: string | null = null;

  try {
    console.log("[TRACE:LOADER] MainLayout.loader: checking saved directory...");
    hasDirectory = await fileStorage.hasSavedDirectory();
    console.log("[TRACE:LOADER] MainLayout.loader: hasDirectory =", hasDirectory);
    if (hasDirectory) {
      console.log("[TRACE:LOADER] MainLayout.loader: checking permission...");
      permissionGranted = await fileStorage.isPermissionGranted();
      console.log("[TRACE:LOADER] MainLayout.loader: permissionGranted =", permissionGranted);
      directoryName = await fileStorage.getSavedDirectoryName();
      if (permissionGranted) {
        console.log("[TRACE:LOADER] MainLayout.loader: listing files...");
        filesList = await fileStorage.listFiles();
        console.log("[TRACE:LOADER] MainLayout.loader: filesList =", filesList);
      }
    }
  } catch (err) {
    console.warn('[TRACE:LOADER] Could not check directory status in MainLayout.', err);
  }

  const story = filesList.find((file) => file === 'story.md');
  const images = filesList.find((file) => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));
  const characters = filesList.find((file) => file === 'characters.json');
  const panels = filesList.find((file) => file === 'panels.json');

  console.log("[TRACE:LOADER] MainLayout.loader: clientLoader finished, directoryName =", directoryName);
  return { hasDirectory, permissionGranted, directoryName, apiKey, safeMode, story, images, characters, panels };
}
