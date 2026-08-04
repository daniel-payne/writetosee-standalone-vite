import { loadStory } from './manageStory';
import { loadStyle } from './manageStyle';
import { loadInstructions } from './manageInstructions';
import processPublication from './workflow/workflowPublication';
import { writeLog } from '../storage/logStorage';
import * as fileStorage from '../storage/fileStorage';

let startupPromise: Promise<void> | null = null;
let hasStartedUp = false;

export async function manageStartup(): Promise<void> {
  if (hasStartedUp) return;
  if (startupPromise) return startupPromise;

  startupPromise = (async () => {
    try {
      hasStartedUp = true;
      await writeLog('info', 'manageStartup', 'Starting unified app startup loading...');

      // Load all primary data files in parallel on startup
      const [story, style, , instructions] = await Promise.all([
        loadStory().catch(() => ''),
        loadStyle().catch(() => ({})),
        fileStorage.readFile('characters.md').then(f => f.text()).catch(() => ''),
        loadInstructions().catch(() => ({}))
      ]);

      const instCount = Object.keys(instructions || {}).length;
      await writeLog('info', 'manageStartup', `Loaded story, style, and ${instCount} panel instructions.`);

      // Run single consolidated publication workflow call
      await processPublication({ story, style });
      await writeLog('info', 'manageStartup', 'Unified app startup completed successfully.');
    } catch (err: any) {
      await writeLog('error', 'manageStartup', `Startup failed: ${err.message || String(err)}`);
    } finally {
      startupPromise = null;
    }
  })();

  return startupPromise;
}

export default manageStartup;
