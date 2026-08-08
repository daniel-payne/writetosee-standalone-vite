import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import { clearProcessDb } from './process/db';

/**
 * Resets all in-memory caches, state-mutex keys, and background processing flags
 * to ensure that switching to a new folder loads all files freshly from disk.
 */
export async function clearAllCaches(): Promise<void> {
  await clearProcessDb().catch(() => {});

  // Reset state-mutex keys
  setState('story-data', null, StoragePersistence.none);
  setState('story-hash', '', StoragePersistence.local);

  setState('style-data', null, StoragePersistence.none);
  setState('style-hash', '', StoragePersistence.local);

  setState('characters-data', [], StoragePersistence.none);
  setState('characters-hash', '', StoragePersistence.local);

  setState('instructions-data', [], StoragePersistence.none);
  setState('instructions-hash', '', StoragePersistence.local);

  setState('image-processing-status', 'idle', StoragePersistence.local);
  setState('process-startup-loading', false, StoragePersistence.none);
  setState('process-startup-error', null, StoragePersistence.none);
}
