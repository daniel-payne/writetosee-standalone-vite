import { saveStyle } from "@/data/manageStyle";
import { writeLog } from "@/data/storage/logStorage";

export async function clientAction({ request }: any) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'CANCEL-UPDATES') {
    return { success: true };
  }

  if (intent === 'SAVE-UPDATES') {
    const storyTitle = formData.get('storyTitle') as string;
    const drawingInstructionsText = formData.get('drawingInstructions') as string;
    const linkUrl = formData.get('linkUrl') as string;
    const linkInstructionsText = formData.get('linkInstructions') as string;

    const style = {
      storyTitle,
      drawingInstructions: drawingInstructionsText.split('\n').map(line => line.trim()).filter(Boolean),
      linkUrl,
      linkInstructions: linkInstructionsText.split('\n').map(line => line.trim()).filter(Boolean),
    };

    try {
      await saveStyle(style);
      return { success: true };
    } catch (error) {
      await writeLog('error', 'Style.action', `Failed to save style.json: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, error: 'Failed to save' };
    }
  }

  return { success: false, error: 'Unknown intent' };
}
