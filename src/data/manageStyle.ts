import { useEffect } from 'react';
import { useLocalState, useSharedState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import generateTextDigest from '@/data/utilities/generateTextDigest';
import processPublication from './processPublication';

// Module-level caches to keep a single, synchronous source of truth in memory
// across all components using the useStyle hooks.
let inMemoryStyle: any = null;
let inMemoryHash: string | null = null;
let activeLoadPromise: Promise<any> | null = null;

/**
 * Loads the style from disk, hashing it, and updating both the state-mutex shared data
 * and the loading/error states.
 */
export async function loadStyle(): Promise<any> {
    if (activeLoadPromise) {
        return activeLoadPromise;
    }

    setState('style-loading', true, StoragePersistence.none);
    setState('style-error', null, StoragePersistence.none);

    activeLoadPromise = (async () => {
        try {
            const file = await fileStorage.readFile('style.json');
            const text = await file.text();
            const loadedStyle = JSON.parse(text);
            const calculatedHash = generateTextDigest(text);

            inMemoryStyle = loadedStyle;
            inMemoryHash = calculatedHash;

            // Update state-mutex in-memory data and localStorage hash
            setState('style-data', loadedStyle, StoragePersistence.none);
            setState('style-hash', calculatedHash, StoragePersistence.local);

            return loadedStyle;
        } catch (e: any) {
            // Initialize empty style if file doesn't exist
            if (e.name === 'NotFoundError' || e.message?.includes('NotFoundError') || e.message?.includes('does not exist')) {
                const defaultStyle = {};
                const json = JSON.stringify(defaultStyle, null, 2);
                const defaultHash = generateTextDigest(json);

                inMemoryStyle = defaultStyle;
                inMemoryHash = defaultHash;

                setState('style-data', defaultStyle, StoragePersistence.none);
                setState('style-hash', defaultHash, StoragePersistence.local);

                try {
                    await fileStorage.writeFile('style.json', json);
                } catch (writeErr) {
                    console.warn("Could not write default style.json:", writeErr);
                }

                return defaultStyle;
            } else {
                console.error("Failed to load style in loadStyle:", e);
                setState('style-error', e.message || "Failed to load style", StoragePersistence.none);
                throw e;
            }
        } finally {
            activeLoadPromise = null;
            setState('style-loading', false, StoragePersistence.none);
        }
    })();

    return activeLoadPromise;
}

/**
 * Saves a style object to disk, updates the in-memory cache, and updates state-mutex.
 * 
 * @param style The style object to save.
 * @param setStyleHashState Optional state-mutex updater function.
 * @returns The generated hash of the saved style.
 */
export async function saveStyle(
    style: any,
    setStyleHashState?: (hash: string) => void
): Promise<string> {
    setState('style-loading', true, StoragePersistence.none);
    setState('style-error', null, StoragePersistence.none);

    try {
        const json = JSON.stringify(style, null, 2);
        const hash = generateTextDigest(json);

        // Save to disk
        await fileStorage.writeFile('style.json', json);

        // Update in-memory references
        inMemoryStyle = style;
        inMemoryHash = hash;

        // Update state-mutex in-memory data
        setState('style-data', style, StoragePersistence.none);

        // Update state-mutex to notify all other hook instances and tabs
        if (setStyleHashState) {
            setStyleHashState(hash);
        } else {
            setState('style-hash', hash, StoragePersistence.local);
        }

        await processPublication({ style })

        return hash;
    } catch (e: any) {
        console.error("Failed to save style in saveStyle:", e);
        setState('style-error', e.message || "Failed to save style", StoragePersistence.none);
        throw e;
    } finally {
        setState('style-loading', false, StoragePersistence.none);
    }
}

/**
 * A hook that returns the active style object and a function to update it.
 * Calls to setStyle will save the new value to disk and synchronize all components.
 * 
 * @returns [style, setStyle]
 */
export function useStyle(): [any, (valOrFunc: any) => Promise<void>] {
    const [styleHash, setStyleHash] = useLocalState<string>('style-hash', '');
    const [style] = useSharedState<any>('style-data', null);

    const setStyle = async (valOrFunc: any) => {
        const newStyle = typeof valOrFunc === 'function' ? valOrFunc(inMemoryStyle || {}) : valOrFunc;
        await saveStyle(newStyle, setStyleHash);
    };

    // Synchronize disk loads with changes to the local storage state hash
    useEffect(() => {
        // First load or empty hash -> force disk check
        if (!styleHash || inMemoryStyle === null) {
            loadStyle();
            return;
        }

        // Hash changed and differs from current in-memory version
        if (styleHash !== inMemoryHash) {
            loadStyle();
        }
    }, [styleHash]);

    return [style || {}, setStyle];
}

/**
 * A hook to get the read-only style hash.
 * 
 * @returns [styleHash]
 */
export function useStyleHash(): [string] {
    const [styleHash] = useLocalState<string>('style-hash', '');
    return [styleHash];
}

/**
 * A hook to get the read-only loading status of the style.
 * 
 * @returns [isLoading]
 */
export function useStyleLoading(): [boolean] {
    const [isLoading] = useSharedState<boolean>('style-loading', false);
    return [isLoading];
}

/**
 * A hook to get the read-only loading/saving error status of the style.
 * 
 * @returns [isError]
 */
export function useStyleLoadingError(): [string | null] {
    const [error] = useSharedState<string | null>('style-error', null);
    return [error];
}
