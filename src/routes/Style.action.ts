import { writeFile } from "../lib/fileStorage";

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

    const newContent = JSON.stringify(style, null, 2);

    try {
      await writeFile('style.json', newContent);
      return { success: true };
    } catch (error) {
      console.error('Failed to save style.json:', error);
      return { success: false, error: 'Failed to save' };
    }
  }

  return { success: false, error: 'Unknown intent' };
}
