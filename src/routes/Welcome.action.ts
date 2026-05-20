import * as fileStorage from '../lib/fileStorage';

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
      return { success: true, message: 'Successfully connected to local directory!' };
    }

    if (intent === 'DISCONNECT-DIRECTORY') {
      await fileStorage.disconnectDirectory();
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
    return { success: false, message: err.message || 'Action failed.' };
  }
}
