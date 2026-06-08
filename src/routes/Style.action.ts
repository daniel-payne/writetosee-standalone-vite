import { saveStyle, loadStyle } from "@/data/manageStyle";
import { writeLog } from "@/data/storage/logStorage";
import { STYLE_PRESETS } from "@/data/stylePresets";

export async function clientAction({ request }: any) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'CANCEL-UPDATES') {
    return { success: true };
  }

  if (intent === 'UPDATE_STYLE') {
    const stylePreset = formData.get('stylePreset') as string;
    const presetText = STYLE_PRESETS[stylePreset];

    if (!presetText) {
      return { success: false, error: `Invalid style preset: ${stylePreset}` };
    }

    try {
      const currentStyle = await loadStyle();
      const updatedStyle = {
        ...currentStyle,
        drawingInstructions: presetText.split('\n').map(line => line.trim()).filter(Boolean),
      };

      await saveStyle(updatedStyle);
      return { success: true };
    } catch (error) {
      await writeLog('error', 'Style.action', `Failed to update style preset to ${stylePreset}: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, error: 'Failed to update style' };
    }
  }

  if (intent === 'UPDATE_REFERENCE') {
    // TODO: Implement UPDATE_REFERENCE action
  }

  if (intent === 'SAVE-UPDATES') {
    const storyTitle = formData.get('storyTitle') as string;
    const drawingInstructionsText = formData.get('drawingInstructions') as string;
    const referenceUrl = formData.get('referenceUrl') as string;
    const linkInstructionsText = formData.get('linkInstructions') as string;

    const style = {
      storyTitle,
      drawingInstructions: drawingInstructionsText.split('\n').map(line => line.trim()).filter(Boolean),
      referenceUrl,
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
