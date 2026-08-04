import { isStoryLoaded, loadStory } from '@/data/processOLD/manageStory';
import { isStyleLoaded, loadStyle } from "@/data/processOLD/manageStyle";
import processPublication from '@/data/processOLD/workflow/workflowPublication';
import { isPermissionGranted } from '@/data/storage/fileStorage';

export async function clientLoader() {
  console.log("Style.loader: starting clientLoader...");
  let style = {};

  try {
    console.log("Style.loader: checking permission...");
    const permissionGranted = await isPermissionGranted();
    console.log("Style.loader: permissionGranted =", permissionGranted);
    if (permissionGranted) {
      const isSystemLoaded = isStoryLoaded() && isStyleLoaded();
      console.log("Style.loader: loading style...");
      style = await loadStyle();
      console.log("Style.loader: loading story...");
      const story = await loadStory();

      if (isSystemLoaded === false) {
        console.log("Style.loader: processing publication (background)...");
        processPublication({ style, story }).catch(err => {
          console.warn('Background publication processing failed:', err);
        });
      }
    }
  } catch (err) {
    console.warn('Could not load style in clientLoader:', err);
  }

  console.log("Style.loader: clientLoader finished!");
  return { style };
}

