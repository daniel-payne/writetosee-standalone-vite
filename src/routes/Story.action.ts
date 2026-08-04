import { type ActionFunctionArgs } from 'react-router-dom';
import { saveStory, loadStory } from '@/data/processOLD/manageStory';
import processPublication, { workflowImageGeneration } from '@/data/processOLD/workflow/workflowPublication';
import { loadPublication, savePublication } from '@/data/processOLD/managePublication';
import { loadInstructions, saveInstructions } from '@/data/processOLD/manageInstructions';
import { exportToFiles } from '@/data/storage/db';

export async function clientAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');
  console.log('[STORY-DEBUG] Story.action clientAction intent:', intent);

  if (intent === 'SAVE-UPDATES') {
    const story = formData.get('story') as string;
    console.log('[STORY-DEBUG] SAVE-UPDATES received story length:', story?.length);

    try {
      if (story !== null) {
        console.log('[STORY-DEBUG] Saving story...');
        await saveStory(story);
      }

      console.log('[STORY-DEBUG] Processing publication text...');
      await processPublication({ story });

      console.log('[STORY-DEBUG] Starting workflowImageGeneration...');
      await workflowImageGeneration();
      console.log('[STORY-DEBUG] Finished workflowImageGeneration');

      // Export state from Dexie IndexedDB back to local directory files
      await exportToFiles();

      return { success: true, message: 'Changes saved successfully' };
    } catch (err: any) {
      console.error('[STORY-DEBUG] Error in SAVE-UPDATES:', err);
      return { error: err.message || 'Failed to save changes' };
    }
  } else if (intent === 'CANCEL-UPDATES') {
    try {
      const originalStory = await loadStory();
      const originalInstructions = await loadInstructions();
      await saveInstructions(originalInstructions);
      await processPublication({ story: originalStory });
      return { success: true, message: 'Changes cancelled', timestamp: Date.now() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel updates';
      return { error: errorMsg };
    }
  } else if (intent === 'UPDATE-STORY') {
    const story = formData.get('story') as string;

    try {
      if (story !== null) {
        await saveStory(story);
        await processPublication({ story });
      }

      return { success: true, message: 'Story updated successfully' };
    } catch (err: any) {
      return { error: err.message || 'Failed to save story' };
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
      const instructions = await loadInstructions();
      instructions[panelNo] = {
        panelNo,
        characters,
        cinematographicText,
        isLocked
      };

      await saveInstructions(instructions);
      return { success: true, message: 'Panel instructions saved', timestamp: Date.now() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save panel instructions';
      return { error: errorMsg };
    }
  } else if (intent === 'REGENERATE-IMAGE') {
    const imagePath = formData.get('imagePath') as string;
    const paragraphIndexStr = formData.get('paragraphIndex') as string;
    try {
      const pub = await loadPublication();
      let paragraphIndex = -1;
      if (paragraphIndexStr != null && paragraphIndexStr !== '') {
        paragraphIndex = parseInt(paragraphIndexStr, 10);
      }

      let changed = false;

      if (pub.panels) {
        for (let i = 0; i < pub.panels.length; i++) {
          const p = pub.panels[i];
          const isMatch = (!isNaN(paragraphIndex) && paragraphIndex >= 0 && (i === paragraphIndex || p.panelNo === paragraphIndex || p.paragraphNo === paragraphIndex))
            || (imagePath && (p.image === imagePath || p.imageUrl === imagePath || (Array.isArray(p.images) && p.images.includes(imagePath))));

          if (isMatch) {
            delete p.image;
            delete p.imageUrl;
            delete p.error;
            p.needsRegenerate = true;
            p.isManualRegenerate = true;
            p.imageStatus = 'pending';
            changed = true;
          }
        }
      }

      if (pub.prompts) {
        for (let i = 0; i < pub.prompts.length; i++) {
          const prompt = pub.prompts[i];
          const isMatch = (!isNaN(paragraphIndex) && paragraphIndex >= 0 && (i === paragraphIndex || prompt.paragraphIndex === paragraphIndex || prompt.paragraphNo === paragraphIndex || prompt.panelIndex === paragraphIndex))
            || (imagePath && (prompt.image === imagePath || prompt.imageUrl === imagePath));

          if (isMatch) {
            delete prompt.image;
            delete prompt.imageUrl;
            delete prompt.error;
            prompt.needsRegenerate = true;
            prompt.isManualRegenerate = true;
            prompt.imageStatus = 'pending';
            changed = true;
          }
        }
      }

      if (changed) {
        await savePublication(pub);
      }

      // Re-run the image generation pipeline to regenerate the missing image
      await workflowImageGeneration();

      return { success: true, message: 'Image regenerated successfully', timestamp: Date.now() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to regenerate image';
      return { error: errorMsg };
    }
  } else if (intent === 'SELECT-PARAGRAPH-IMAGE') {
    const paragraphIndexStr = formData.get('paragraphIndex') as string;
    const imagePath = formData.get('imagePath') as string;
    let paragraphIndex = parseInt(paragraphIndexStr, 10);

    try {
      const pub = await loadPublication();
      const items = pub.panels || [];

      if (isNaN(paragraphIndex) || paragraphIndex < 0 || !items[paragraphIndex]) {
        const foundIdx = items.findIndex((p: any) =>
          p.image === imagePath || p.imageUrl === imagePath || (Array.isArray(p.images) && p.images.includes(imagePath))
        );
        if (foundIdx >= 0) {
          paragraphIndex = foundIdx;
        }
      }

      if (!isNaN(paragraphIndex) && paragraphIndex >= 0 && items[paragraphIndex]) {
        const item = items[paragraphIndex];
        item.image = imagePath;
        item.imageUrl = imagePath;
        item.imageStatus = 'completed';
        delete item.error;
        delete item.needsRegenerate;
        delete item.isManualRegenerate;
        if (Array.isArray(item.images)) {
          const idx = item.images.indexOf(imagePath);
          if (idx >= 0) {
            item.currentImageIndex = idx;
          }
        }

        if (pub.prompts && pub.prompts[paragraphIndex]) {
          pub.prompts[paragraphIndex].image = imagePath;
          pub.prompts[paragraphIndex].imageUrl = imagePath;
          pub.prompts[paragraphIndex].imageStatus = 'completed';
          delete pub.prompts[paragraphIndex].error;
          delete pub.prompts[paragraphIndex].needsRegenerate;
          delete pub.prompts[paragraphIndex].isManualRegenerate;
        }

        await savePublication(pub);
      }
      return { success: true, message: 'Image selected successfully', timestamp: Date.now() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to select image';
      return { error: errorMsg };
    }
  }

  return null;
}

