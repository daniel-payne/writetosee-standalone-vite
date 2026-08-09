import { saveStyle } from "@/data/process/saveStyle";
import { processDb } from "@/data/process/db";
import { writeLog } from "@/data/storage/logStorage";
import { STYLE_PRESETS } from "@/data/stylePresets";
import generateStyleReference from "@/data/llm/generateStyleReference";
import type { Style } from "@/data/process/TYPES";

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
      const currentRecord = await processDb.style.get('main');
      const currentStyle: Style = currentRecord || {
        story_id: 'main',
        drawing_instructions: '',
        panel_per_paragraph: true,
        reference_url: '',
        reference_instructions: '',
        use_reference_instructions: true,
        style_hash: ''
      };

      const updatedStyle: Style = {
        ...currentStyle,
        drawing_instructions: presetText.trim(),
        drawingInstructions: presetText.trim()
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
    const drawingInstructionsText = (formData.get('drawingInstructions') as string) || '';
    const referenceUrl = (formData.get('referenceUrl') as string) || '';
    const linkInstructionsText = (formData.get('linkInstructions') as string) || '';

    const style: Style = {
      story_id: 'main',
      drawing_instructions: drawingInstructionsText.trim(),
      drawingInstructions: drawingInstructionsText.trim(),
      panel_per_paragraph: true,
      panelPerParagraph: true,
      reference_url: referenceUrl,
      referenceUrl,
      reference_instructions: linkInstructionsText.trim(),
      referenceInstructions: linkInstructionsText.trim(),
      use_reference_instructions: true,
      useReferenceInstructions: true,
      style_hash: ''
    };

    try {
      await saveStyle(style);
      return { success: true };
    } catch (error) {
      await writeLog('error', 'Style.action', `Failed to save style: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, error: 'Failed to save' };
    }
  }

  return { success: false, error: 'Unknown intent' };
}
