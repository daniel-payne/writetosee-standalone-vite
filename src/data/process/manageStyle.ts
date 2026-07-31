import { useEffect } from 'react';
import { useLocalState, useSharedState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import generateTextDigest from '@/data/process/generate/generateTextDigest';
import processPublication from './workflow/workflowPublication';
import { writeLog } from '../storage/logStorage';
import markdownToJSON from '../utilities/markdownToJSON';
import jsonToMarkdown from '../utilities/jsonToMarkdown';

const defaultStyle = {
    storyTitle: "A story about [name]",
    imageDisplayMode: "per_paragraph",
    drawingInstructions: [
        "Vibrant, colorful children's book illustration style, bright colors, clear shapes, happy atmosphere, fameless, full-bleed, no white margins, edge-to-edge environment. Keep the background in focus and of the same style as the foreground.",
        "Ensure that the illustrations complement the text, are lively and expressive, and simple enough for young children aged 4 to 8 years old to understand.",
        "The target persona is a boy or girl aged between 4 and 8 years old.",
        "The lighting is from all directions, creating a happy and childlike landscape.",
        "Use bright colors and clear shapes to capture the attention of young readers.",
        "Each illustration should be lively and expressive, conveying the emotions and actions of the characters clearly.",
        "The illustrations should be colorful, engaging, and simple enough for young children to understand.",
        "Ensure that the illustrations complement the text and help to tell the story visually."
    ].join('\n\n'),
}

// Module-level caches to keep a single, synchronous source of truth in memory
// across all components using the useStyle hooks.
let inMemoryStyle: any = null;
let inMemoryHash: string | null = null;
let activeLoadPromise: Promise<any> | null = null;

// Synchronize style edits across open tabs when storage changes
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key === 'style-hash' && event.newValue && event.newValue !== inMemoryHash) {
            inMemoryStyle = null;
            inMemoryHash = null;
            loadStyle().catch((err) => {
                console.warn('Failed to auto-reload style from storage change:', err);
            });
        }
    });
}

/**
 * Loads the style from disk, hashing it, and updating both the state-mutex shared data
 * and the loading/error states.
 */
export async function loadStyle(): Promise<any> {
    if (inMemoryStyle !== null) {
        return inMemoryStyle;
    }

    if (activeLoadPromise) {
        return activeLoadPromise;
    }

    setState('style-loading', true, StoragePersistence.none);
    setState('style-error', null, StoragePersistence.none);

    activeLoadPromise = (async () => {
        try {
            const file = await fileStorage.readFile('style.md');
            const text = await file.text();
            const loadedStyle = markdownToJSON(text);
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

                const markdown = jsonToMarkdown(defaultStyle);
                const defaultHash = generateTextDigest(markdown);

                inMemoryStyle = defaultStyle;
                inMemoryHash = defaultHash;

                setState('style-data', defaultStyle, StoragePersistence.none);
                setState('style-hash', defaultHash, StoragePersistence.local);

                try {
                    await fileStorage.writeFile('style.md', markdown);
                } catch (writeErr) {
                    console.warn("Could not write default style.md:", writeErr);
                }

                return defaultStyle;
            } else {
                await writeLog('error', 'loadStyle', `Failed to load style in loadStyle: ${e.message || String(e)}`);
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
        const markdown = jsonToMarkdown(style);
        const hash = generateTextDigest(markdown);


        // Save to disk
        await fileStorage.writeFile('style.md', markdown);

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
        await writeLog('error', 'saveStyle', `Failed to save style in saveStyle: ${e.message || String(e)}`);
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

    return [style, setStyle];
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

/**
 * Checks if the style is already loaded in memory.
 * 
 * @returns boolean
 */
export function isStyleLoaded(): boolean {
    return inMemoryStyle !== null;
}

/**
 * Resets the in-memory style cache and its state-mutex representations.
 */
export function clearStyleCache(): void {
    inMemoryStyle = null;
    inMemoryHash = null;
    activeLoadPromise = null;
    setState('style-data', null, StoragePersistence.none);
    setState('style-hash', '', StoragePersistence.local);
}

