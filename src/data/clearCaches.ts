import { setState, StoragePersistence } from '@keldan-systems/state-mutex';
import { clearStoryCache } from './manageStory';
import { clearStyleCache } from './manageStyle';
import { clearPublicationCache } from './managePublication';

/**
 * Resets all in-memory caches, state-mutex keys, and background processing flags
 * to ensure that switching to a new folder loads all files freshly from disk.
 */
export function clearAllCaches(): void {
    // Clear the specific file/data caches
    clearStoryCache();
    clearStyleCache();
    clearPublicationCache();

    // Reset processing state keys to avoid stale background tasks or spinners
    setState('publication-processing-status', 'idle', StoragePersistence.local);
    setState('publication-needs-processing', false, StoragePersistence.local);
    setState('publication-image-processing-status', 'idle', StoragePersistence.local);
    setState('image-generation-needs-processing', false, StoragePersistence.local);
}
