import { useEffect } from 'react';
import { useLocalState, useSharedState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/fileStorage';
import generateTextDigest from '@/data/utilities/generateTextDigest';

// Module-level caches to keep a single, synchronous source of truth in memory
// across all components using the usePublication hooks.
let inMemoryPublication: any = null;
let inMemoryHash: string | null = null;
let activeLoadPromise: Promise<any> | null = null;

/**
 * Loads the publication from disk, hashing it, and updating both the state-mutex shared data
 * and the loading/error states.
 */
export async function loadPublication(): Promise<any> {
    if (activeLoadPromise) {
        return activeLoadPromise;
    }

    setState('publication-loading', true, StoragePersistence.none);
    setState('publication-error', null, StoragePersistence.none);

    activeLoadPromise = (async () => {
        try {
            const file = await fileStorage.readFile('publication.json');
            const text = await file.text();
            const loadedPub = JSON.parse(text);
            const calculatedHash = generateTextDigest(text);

            inMemoryPublication = loadedPub;
            inMemoryHash = calculatedHash;

            // Update state-mutex in-memory data and localStorage hash
            setState('publication-data', loadedPub, StoragePersistence.none);
            setState('publication-hash', calculatedHash, StoragePersistence.local);

            return loadedPub;
        } catch (e: any) {
            // Initialize empty publication if file doesn't exist
            if (e.name === 'NotFoundError' || e.message?.includes('NotFoundError') || e.message?.includes('does not exist')) {
                const defaultPub = {};
                const json = JSON.stringify(defaultPub, null, 2);
                const defaultHash = generateTextDigest(json);

                inMemoryPublication = defaultPub;
                inMemoryHash = defaultHash;

                setState('publication-data', defaultPub, StoragePersistence.none);
                setState('publication-hash', defaultHash, StoragePersistence.local);

                try {
                    await fileStorage.writeFile('publication.json', json);
                } catch (writeErr) {
                    console.warn("Could not write default publication.json:", writeErr);
                }

                return defaultPub;
            } else {
                console.error("Failed to load publication in loadPublication:", e);
                setState('publication-error', e.message || "Failed to load publication", StoragePersistence.none);
                throw e;
            }
        } finally {
            activeLoadPromise = null;
            setState('publication-loading', false, StoragePersistence.none);
        }
    })();

    return activeLoadPromise;
}

/**
 * Saves a publication object to disk, updates the in-memory cache, and updates state-mutex.
 * 
 * @param pub The publication object to save.
 * @param setPubHashState Optional state-mutex updater function.
 * @returns The generated hash of the saved publication.
 */
export async function savePublication(
    pub: any,
    setPubHashState?: (hash: string) => void
): Promise<string> {
    setState('publication-loading', true, StoragePersistence.none);
    setState('publication-error', null, StoragePersistence.none);

    try {
        const json = JSON.stringify(pub, null, 2);
        const hash = generateTextDigest(json);

        // Save to disk
        await fileStorage.writeFile('publication.json', json);

        // Update in-memory references
        inMemoryPublication = pub;
        inMemoryHash = hash;

        // Update state-mutex in-memory data
        setState('publication-data', pub, StoragePersistence.none);

        // Update state-mutex to notify all other hook instances and tabs
        if (setPubHashState) {
            setPubHashState(hash);
        } else {
            setState('publication-hash', hash, StoragePersistence.local);
        }

        return hash;
    } catch (e: any) {
        console.error("Failed to save publication in savePublication:", e);
        setState('publication-error', e.message || "Failed to save publication", StoragePersistence.none);
        throw e;
    } finally {
        setState('publication-loading', false, StoragePersistence.none);
    }
}

/**
 * A hook that returns the active publication object and a function to update it.
 * Calls to setPublication will save the new value to disk and synchronize all components.
 * 
 * @returns [publication, setPublication]
 */
export function usePublication(): [any, (valOrFunc: any) => Promise<void>] {
    const [pubHash, setPubHash] = useLocalState<string>('publication-hash', '');
    const [publication] = useSharedState<any>('publication-data', null);

    const setPub = async (valOrFunc: any) => {
        const newPub = typeof valOrFunc === 'function' ? valOrFunc(inMemoryPublication || {}) : valOrFunc;
        await savePublication(newPub, setPubHash);
    };

    // Synchronize disk loads with changes to the local storage state hash
    useEffect(() => {
        // First load or empty hash -> force disk check
        if (!pubHash || inMemoryPublication === null) {
            loadPublication();
            return;
        }

        // Hash changed and differs from current in-memory version
        if (pubHash !== inMemoryHash) {
            loadPublication();
        }
    }, [pubHash]);

    return [publication || {}, setPub];
}

/**
 * A hook to get the read-only publication hash.
 * 
 * @returns [publicationHash]
 */
export function usePublicationHash(): [string] {
    const [pubHash] = useLocalState<string>('publication-hash', '');
    return [pubHash];
}

/**
 * A hook to get the read-only loading status of the publication.
 * 
 * @returns [isLoading]
 */
export function usePublicationLoading(): [boolean] {
    const [isLoading] = useSharedState<boolean>('publication-loading', false);
    return [isLoading];
}

/**
 * A hook to get the read-only loading/saving error status of the publication.
 * 
 * @returns [isError]
 */
export function usePublicationLoadingError(): [string | null] {
    const [error] = useSharedState<string | null>('publication-error', null);
    return [error];
}
