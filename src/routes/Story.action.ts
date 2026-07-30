import { type ActionFunctionArgs } from 'react-router-dom';
import { saveStory, loadStory } from '@/data/manageStory';
<<<<<<< Updated upstream
import processPublication from '@/data/processPublication';
=======
import processPublication, { processImageGeneration } from '@/data/processPublication';
import { deleteFile } from '@/data/storage/fileStorage';
>>>>>>> Stashed changes
import { loadPublication, savePublication } from '@/data/managePublication';

export async function clientAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'SAVE-UPDATES') {
    const story = formData.get('story') as string;

    try {
      if (story !== null) {
        // Save Story Process publication
        await saveStory(story);
      }

      return { success: true, message: 'Story updated successfully' };
    } catch (err: any) {
      return { error: err.message || 'Failed to save story' };
    }
  } else if (intent === 'CANCEL-UPDATES') {
    try {
      const originalStory = await loadStory();
      await processPublication({ story: originalStory });
      return { success: true, message: 'Changes cancelled', timestamp: Date.now() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel updates';
      return { error: errorMsg };
    }
  } else if (intent === 'UPDATE-STORY') {
    // const story = formData.get('story') as string;

    // try {
    //   // if (story !== null) {
    //   //   await saveStory(story);
    //   // }

    //   await processPublication({ story })

    //   return { success: true, message: 'Story updated successfully' };
    // } catch (err: any) {
    //   return { error: err.message || 'Failed to save story' };
    // }
  } else if (intent === 'REGENERATE-IMAGE') {
    const imagePath = formData.get('imagePath') as string;
    const paragraphIndexStr = formData.get('paragraphIndex') as string;
    try {
      const pub = await loadPublication();
      let paragraphIndex = -1;
      if (paragraphIndexStr != null && paragraphIndexStr !== '') {
        paragraphIndex = parseInt(paragraphIndexStr, 10);
      }

<<<<<<< Updated upstream
      let changed = false;

      if (pub.paragraphs) {
        for (let i = 0; i < pub.paragraphs.length; i++) {
          const p = pub.paragraphs[i];
          if ((paragraphIndex >= 0 && i === paragraphIndex) || (imagePath && (p.image === imagePath || p.imageUrl === imagePath))) {
            delete p.image;
            delete p.imageUrl;
            delete p.error;
            p.needsRegenerate = true;
            changed = true;
          }
        }
      }

      if (pub.prompts) {
        for (const prompt of pub.prompts) {
          if ((paragraphIndex >= 0 && prompt.paragraphIndex === paragraphIndex) || (imagePath && (prompt.image === imagePath || prompt.imageUrl === imagePath))) {
            delete prompt.image;
            delete prompt.imageUrl;
            delete prompt.error;
            prompt.needsRegenerate = true;
            changed = true;
          }
        }
      }

      if (changed) {
        await savePublication(pub);
      }

      // Re-run the publication pipeline to generate the missing image
      await processPublication();
=======
        // Also clean up the image fields inside the publication JSON!
        try {
          const pub = await loadPublication();
          let changed = false;
          if (pub.prompts) {
            for (const prompt of pub.prompts) {
              if (prompt.image === imagePath || prompt.imageUrl === imagePath) {
                delete prompt.image;
                delete prompt.imageUrl;
                delete prompt.error;
                prompt.imageStatus = 'pending';
                changed = true;
              }
            }
          }
          if (pub.paragraphs) {
            for (const paragraph of pub.paragraphs) {
              if (paragraph.image === imagePath || paragraph.imageUrl === imagePath) {
                delete paragraph.image;
                delete paragraph.imageUrl;
                delete paragraph.error;
                paragraph.imageStatus = 'pending';
                changed = true;
              }
            }
          }
          if (changed) {
            await savePublication(pub);
          }
        } catch (pubErr) {
          console.warn("Failed to clear image path references in publication:", pubErr);
        }
      }

      // Re-run the image generation pipeline to regenerate the missing image
      await processImageGeneration();
>>>>>>> Stashed changes

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
      const pub = await loadPublication();
      if (!isNaN(paragraphIndex) && pub.paragraphs?.[paragraphIndex]) {
        const paragraph = pub.paragraphs[paragraphIndex];
        paragraph.image = imagePath;
        paragraph.imageUrl = imagePath;

        if (pub.prompts) {
          const prompt = pub.prompts.find((p: any) => p.paragraphIndex === paragraphIndex);
          if (prompt) {
            prompt.image = imagePath;
            prompt.imageUrl = imagePath;
          }
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
