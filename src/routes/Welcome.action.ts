import * as fileStorage from '@/data/storage/fileStorage';
import { writeLog } from "@/data/storage/logStorage";
import { clearAllCaches } from '@/data/clearCaches';

export interface WelcomeActionResult {
  success: boolean;
  filename?: string;
  message?: string;
}

export async function clientAction({ request }: { request: Request }): Promise<WelcomeActionResult> {
  const formData = await request.formData();
  const intent = ((formData.get('intent') as string) ?? '').toUpperCase();

  const apiKey = formData.get('apiKey') as string;

  try {
    if (intent === 'SELECT-DIRECTORY') {
      await fileStorage.selectDirectory();
      clearAllCaches();

      return { success: true, message: 'Successfully connected to local directory!' };
    }

    if (intent === 'DISCONNECT-DIRECTORY') {
      await fileStorage.disconnectDirectory();
      clearAllCaches();

      return { success: true, message: 'Successfully disconnected from local directory!' };
    }

    if (intent === 'SAVE-APIKEY') {
      window.sessionStorage.setItem("apiKey", apiKey);

      return { success: true, message: 'Successfully connected to local directory!' };
    }

    if (intent === 'CLEAR-APIKEY') {
      window.sessionStorage.removeItem("apiKey");

      return { success: true, message: 'Successfully connected to local directory!' };
    }

    return { success: false, message: `Invalid action intent: ${intent}` };
  } catch (err: any) {
    await writeLog('error', 'welcome-action', `Action failed: ${intent}. Error: ${err.message}`);
    return { success: false, message: err.message || 'Action failed.' };
  }
}
