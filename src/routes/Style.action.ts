import { saveStyle, loadStyle } from "@/data/processOLD/manageStyle";
import { writeLog } from "@/data/storage/logStorage";
import { STYLE_PRESETS } from "@/data/stylePresets";
import generateStyleReference from "@/data/processOLD/generate/generateStyleReference";

export async function clientAction({ request }: any) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'CANCEL-UPDATES') {
    return { success: true, cancelled: true, timestamp: Date.now() };
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
        drawingInstructions: presetText.trim(),
      };

      await saveStyle(updatedStyle);
      return { success: true };
    } catch (error) {
      await writeLog('error', 'Style.action', `Failed to update style preset to ${stylePreset}: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, error: 'Failed to update style' };
    }
  }

  if (intent === 'UPDATE_REFERENCE') {
    const referenceUrl = formData.get('referenceUrl') as string;
    if (!referenceUrl) {
      return { success: false, error: 'No reference URL provided' };
    }

    try {
      const generatedText = await generateStyleReference(referenceUrl);
      return { success: true, linkInstructions: generatedText };
    } catch (error) {
      await writeLog('error', 'Style.action', `Failed to analyze reference style: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, error: 'Failed to analyze reference style' };
    }
  }

  if (intent === 'SAVE-UPDATES') {
    const storyTitle = (formData.get('storyTitle') as string) || '';
    const imageDisplayMode = (formData.get('imageDisplayMode') as string) || 'per_paragraph';
    const drawingInstructionsText = (formData.get('drawingInstructions') as string) || '';
    const referenceUrl = (formData.get('referenceUrl') as string) || '';
    const linkInstructionsText = (formData.get('linkInstructions') as string) || '';

    console.log("Style.action SAVE-UPDATES:", { storyTitle, imageDisplayMode, drawingInstructionsText, referenceUrl, linkInstructionsText });

    const style = {
      storyTitle,
      imageDisplayMode,
      drawingInstructions: drawingInstructionsText.trim(),
      referenceUrl,
      linkInstructions: linkInstructionsText.trim(),
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
