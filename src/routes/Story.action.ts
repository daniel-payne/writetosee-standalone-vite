import { type ActionFunctionArgs } from 'react-router-dom';
import { saveStory } from '@/data/process/saveStory';
import { savePanelInstructions } from '@/data/process/saveInstructions';
import { loadStartup } from '@/data/process/loadStartup';
import { processImages } from '@/data/process/workflows/processImages';
import { processDb } from '@/data/process/db';

export async function clientAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');
  console.log('[STORY-DEBUG] Story.action clientAction intent:', intent);

  if (intent === 'SAVE-UPDATES' || intent === 'UPDATE-STORY') {
    const story = formData.get('story') as string;
    console.log('[STORY-DEBUG] SAVE-UPDATES received story length:', story?.length);

    try {
      if (story !== null) {
        console.log('[STORY-DEBUG] Saving story & running image processing...');
        await saveStory(story);
      }

      return { success: true, message: 'Changes saved successfully', timestamp: Date.now() };
    } catch (err: any) {
      console.error('[STORY-DEBUG] Error in SAVE-UPDATES:', err);
      return { error: err.message || 'Failed to save changes' };
    }
  } else if (intent === 'CANCEL-UPDATES') {
    try {
      await loadStartup();
      return { success: true, message: 'Changes cancelled', timestamp: Date.now() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel updates';
      return { error: errorMsg };
    }
  } else if (intent === 'SAVE-PANEL-INSTRUCTIONS') {
    const panelNoStr = formData.get('panelNo') as string;
    const charactersJson = formData.get('characters') as string;
    const cinematographicText = (formData.get('cinematographicText') as string) || '';
    const isLockedStr = formData.get('isLocked') as string;

    const panelNo = parseInt(panelNoStr, 10);
    const characters = charactersJson ? JSON.parse(charactersJson) : [];
    const isLocked = isLockedStr === 'true';

    try {
      await savePanelInstructions(panelNo, {
        characters,
        cinematographicText,
        isLocked
      });
      return { success: true, message: 'Panel instructions saved', timestamp: Date.now() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save panel instructions';
      return { error: errorMsg };
    }
  } else if (intent === 'REGENERATE-IMAGE') {
    const paragraphIndexStr = formData.get('paragraphIndex') as string;
    const paragraphIndex = paragraphIndexStr ? parseInt(paragraphIndexStr, 10) : 0;

    try {
      const storyRec = await processDb.story.get('main');
      const styleRec = await processDb.style.get('main');
      let charactersList = await processDb.characters.toArray();
      let instructionsList = await processDb.instructions.toArray();

      let story: any = storyRec;
      let style: any = styleRec;

      if (!story || !story.chapters || story.chapters.length === 0 || instructionsList.length === 0) {
        const startup = await loadStartup();
        story = startup.story;
        style = startup.style;
        charactersList = startup.characters;
        instructionsList = startup.instructions;
      }

      const styleObj = style || {
        drawingInstructions: '',
        panelPerParagraph: true,
        referenceUrl: '',
        referenceInstructions: '',
        useReferenceInstructions: true
      };

      await processImages(story, styleObj, charactersList, instructionsList, {
        forceRegenerateInstructionNo: paragraphIndex
      });

      return { success: true, message: 'Image regenerated successfully', timestamp: Date.now() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to regenerate image';
      return { error: errorMsg };
    }
  } else if (intent === 'SELECT-PARAGRAPH-IMAGE') {
    const paragraphIndexStr = formData.get('paragraphIndex') as string;
    const imagePath = formData.get('imagePath') as string;
    const paragraphIndex = parseInt(paragraphIndexStr, 10);

    try {
      const instructions = await processDb.instructions.toArray();
      const inst = instructions.find(i => i.instructionNo === paragraphIndex || i.paragraphId === paragraphIndex);
      if (inst) {
        const targetDigest = imagePath.replace(/^images\//, '').replace(/\.(png|jpe?g|gif|webp|svg)$/i, '');
        const assignedDigests: string[] = Array.isArray(inst.assigned_prompt_digests)
          ? inst.assigned_prompt_digests
          : (typeof inst.assigned_prompt_digests === 'string' ? JSON.parse(inst.assigned_prompt_digests) : []);

        let idx = assignedDigests.indexOf(targetDigest);
        if (idx === -1 && Array.isArray(inst.images)) {
          idx = inst.images.findIndex(img => img.promptDigest === targetDigest || `images/${img.promptDigest}.png` === imagePath);
        }

        await savePanelInstructions(paragraphIndex, {
          imageIndex: idx >= 0 ? idx : 0,
          currentPromptDigest: targetDigest
        });
      }
      return { success: true, message: 'Image selected successfully', timestamp: Date.now() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to select image';
      return { error: errorMsg };
    }
  }

  return null;
}
