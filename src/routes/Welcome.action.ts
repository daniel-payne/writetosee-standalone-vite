import * as fileStorage from '@/data/storage/fileStorage';
import writeLog from '@/data/utilities/storeLog';

export interface WelcomeActionResult {
  success: boolean;
  filename?: string;
  message?: string;
}

export async function clientAction({ request }: { request: Request }): Promise<WelcomeActionResult> {
  try {
    const formData = await request.formData();
    const intent = ((formData.get('intent') as string) ?? '').toUpperCase();

    const apiKey = formData.get('apiKey') as string;

    if (intent === 'SELECT-DIRECTORY') {
      await fileStorage.selectDirectory();
      const dirName = await fileStorage.getDirectoryName();
      await writeLog('info', 'directory', `Connected to local directory: ${dirName}`);
      return { success: true, message: 'Successfully connected to local directory!' };
    }

    if (intent === 'DISCONNECT-DIRECTORY') {
      const dirName = await fileStorage.getDirectoryName();
      await fileStorage.disconnectDirectory();
      await writeLog('info', 'directory', `Disconnected from local directory (was: ${dirName})`);
      return { success: true, message: 'Successfully disconnected from local directory!' };
    }

    if (intent === 'SAVE-APIKEY') {
      window.sessionStorage.setItem("apiKey", apiKey);
      await writeLog('info', 'apikey', `Saved LLM API Key (length: ${apiKey?.length || 0})`);
      return { success: true, message: 'Successfully connected to local directory!' };
    }

    if (intent === 'CLEAR-APIKEY') {
      window.sessionStorage.removeItem("apiKey");
      await writeLog('info', 'apikey', 'Cleared LLM API Key');
      return { success: true, message: 'Successfully connected to local directory!' };
    }

    return { success: false, message: `Invalid action intent: ${intent}` };
  } catch (err: any) {
    await writeLog('error', 'welcome-action', `Action failed: ${intent}. Error: ${err.message}`);
    return { success: false, message: err.message || 'Action failed.' };
  }
}
