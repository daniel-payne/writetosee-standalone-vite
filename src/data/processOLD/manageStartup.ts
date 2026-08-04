import { writeLog } from '../storage/logStorage';
import { setState, StoragePersistence, useSharedState } from '@keldan-systems/state-mutex';
import { importFromFiles } from '../storage/db';

let startupPromise: Promise<void> | null = null;
let hasStartedUp = false;

export function useAppStartupLoading(): [boolean] {
  const [isStartingUp] = useSharedState<boolean>('app-is-starting-up', true);
  return [isStartingUp];
}

export async function manageStartup(): Promise<void> {
  if (hasStartedUp) {
    setState('app-is-starting-up', false, StoragePersistence.none);
    return;
  }
  if (startupPromise) return startupPromise;

  setState('app-is-starting-up', true, StoragePersistence.none);

  startupPromise = (async () => {
    try {
      hasStartedUp = true;
      await writeLog('info', 'manageStartup', 'Starting unified app startup loading...');
      await importFromFiles();
      await writeLog('info', 'manageStartup', 'Unified app startup completed successfully.');
    } catch (err: any) {
      await writeLog('error', 'manageStartup', `Startup failed: ${err.message || String(err)}`);
    } finally {
      startupPromise = null;
      setState('app-is-starting-up', false, StoragePersistence.none);
    }
  })();

  return startupPromise;
}

export default manageStartup;
