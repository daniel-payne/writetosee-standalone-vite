import * as fileStorage from '@/data/storage/fileStorage';
import { clearLogs } from '@/data/storage/logStorage';

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

  let permissionGranted = false;

  try {
    hasDirectory = await fileStorage.hasSavedDirectory();

    if (hasDirectory) {
      permissionGranted = await fileStorage.isPermissionGranted();
      directoryName = await fileStorage.getSavedDirectoryName();

      if (permissionGranted) {
        filesList = await fileStorage.listFiles();
        try {
          await clearLogs();
        } catch (logErr) {
          console.warn('Could not clear logs inside clientLoader.', logErr);
        }
      }
    }
  } catch (err) {
    console.warn('Could not auto-verify directory handle inside clientLoader.', err);
  }

  return {
    safeMode,
    hasDirectory,
    permissionGranted,
    filesList,
    directoryName,
    apiKey
  };
}
