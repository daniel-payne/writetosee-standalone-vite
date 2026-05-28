import { useEffect } from 'react';
import { useLocalState, useSharedState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import generateTextDigest from '@/data/utilities/generateTextDigest';
import processPublication from '@/data/processPublication';

// Module-level caches to keep a single, synchronous source of truth in memory
// across all components using the useStory hooks.
let inMemoryStory: string = "";
let inMemoryHash: string | null = null;
let activeLoadPromise: Promise<string> | null = null;

/**
 * Loads the story from disk, hashing it, and updating both the state-mutex shared data
 * and the loading/error states.
 */
export async function loadStory(): Promise<string> {
    if (activeLoadPromise) {
        return activeLoadPromise;
    }

    setState('story-loading', true, StoragePersistence.none);
    setState('story-error', null, StoragePersistence.none);

    activeLoadPromise = (async () => {
        try {
            const file = await fileStorage.readFile('story.md');
            const loadedStory = await file.text();
            const calculatedHash = generateTextDigest(loadedStory);

            inMemoryStory = loadedStory;
            inMemoryHash = calculatedHash;

            // Update state-mutex in-memory data and localStorage hash
            setState('story-data', loadedStory, StoragePersistence.none);
            setState('story-hash', calculatedHash, StoragePersistence.local);

            return loadedStory;
        } catch (e: any) {
            // Initialize empty story if file doesn't exist
            if (e.name === 'NotFoundError' || e.message?.includes('NotFoundError') || e.message?.includes('does not exist')) {
                const defaultStory = "";
                const defaultHash = generateTextDigest(defaultStory);

                inMemoryStory = defaultStory;
                inMemoryHash = defaultHash;

                setState('story-data', defaultStory, StoragePersistence.none);
                setState('story-hash', defaultHash, StoragePersistence.local);

                try {
                    await fileStorage.writeFile('story.md', defaultStory);
                } catch (writeErr) {
                    console.warn("Could not write default story.md:", writeErr);
                }

                return defaultStory;
            } else {
                console.error("Failed to load story in loadStory:", e);
                setState('story-error', e.message || "Failed to load story", StoragePersistence.none);
                throw e;
            }
        } finally {
            activeLoadPromise = null;
            setState('story-loading', false, StoragePersistence.none);
        }
    })();

    return activeLoadPromise;
}

/**
 * Saves a story string to disk, updates the in-memory cache, and updates state-mutex.
 * 
 * @param story The story content to save.
 * @param setStoryHashState Optional state-mutex updater function.
 * @returns The generated hash of the saved story.
 */
export async function saveStory(
    story: string,
    setStoryHashState?: (hash: string) => void
): Promise<string> {
    setState('story-loading', true, StoragePersistence.none);
    setState('story-error', null, StoragePersistence.none);

    try {
        const hash = generateTextDigest(story);

        // Save to disk
        await fileStorage.writeFile('story.md', story);

        // Update in-memory references
        inMemoryStory = story;
        inMemoryHash = hash;

        // Update state-mutex in-memory data
        setState('story-data', story, StoragePersistence.none);

        // Update state-mutex to notify all other hook instances and tabs
        if (setStoryHashState) {
            setStoryHashState(hash);
        } else {
            setState('story-hash', hash, StoragePersistence.local);
        }

        await processPublication({ story })

        return hash;
    } catch (e: any) {
        console.error("Failed to save story in saveStory:", e);
        setState('story-error', e.message || "Failed to save story", StoragePersistence.none);
        throw e;
    } finally {
        setState('story-loading', false, StoragePersistence.none);
    }
}

/**
 * A hook that returns the active story content and a function to update it.
 * Calls to setStory will save the new value to disk and synchronize all components.
 * 
 * @returns [story, setStory]
 */
export function useStory(): [string, (valOrFunc: string | ((prev: string) => string)) => Promise<void>] {
    const [storyHash, setStoryHash] = useLocalState<string>('story-hash', '');
    const [story] = useSharedState<string>('story-data', '');

    const setStory = async (valOrFunc: any) => {
        const newStory = typeof valOrFunc === 'function' ? valOrFunc(inMemoryStory) : valOrFunc;
        await saveStory(newStory, setStoryHash);
    };

    // Synchronize disk loads with changes to the local storage state hash
    useEffect(() => {
        // First load or empty hash -> force disk check
        if (!storyHash || inMemoryStory === null) {
            loadStory();
            return;
        }

        // Hash changed and differs from current in-memory version
        if (storyHash !== inMemoryHash) {
            loadStory();
        }
    }, [storyHash]);

    return [story || '', setStory];
}

/**
 * A hook to get the read-only story hash.
 * 
 * @returns [storyHash]
 */
export function useStoryHash(): [string] {
    const [storyHash] = useLocalState<string>('story-hash', '');
    return [storyHash];
}

/**
 * A hook to get the read-only loading status of the story.
 * 
 * @returns [isLoading]
 */
export function useStoryLoading(): [boolean] {
    const [isLoading] = useSharedState<boolean>('story-loading', false);
    return [isLoading];
}

/**
 * A hook to get the read-only loading/saving error status of the story.
 * 
 * @returns [isError]
 */
export function useStoryLoadingError(): [string | null] {
    const [error] = useSharedState<string | null>('story-error', null);
    return [error];
}
