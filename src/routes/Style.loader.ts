import { loadStartup } from '@/data/process/loadStartup';
import { isPermissionGranted } from '@/data/storage/fileStorage';
import { processDb } from '@/data/process/db';

export async function clientLoader() {
  console.log("Style.loader: starting clientLoader...");
  let style = {};

  try {
    const permissionGranted = await isPermissionGranted();
    if (permissionGranted) {
      const existingStyle = await processDb.style.get('main');
      if (existingStyle && (existingStyle.drawing_instructions || existingStyle.drawingInstructions)) {
        style = existingStyle;
      } else {
        const data = await loadStartup();
        style = data.style;
      }
    }
  } catch (err) {
    console.warn('Could not load style in clientLoader:', err);
  }

  return { style };
}
