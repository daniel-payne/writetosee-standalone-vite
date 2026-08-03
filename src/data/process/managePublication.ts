import { useEffect } from 'react';
import { useLocalState, useSharedState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import * as fileStorage from '@/data/storage/fileStorage';
import generateTextDigest from '@/data/process/generate/generateTextDigest';
import { writeLog } from '../storage/logStorage';
import storyToParagraphs from './generate/generateParagraphs';


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
    if (inMemoryPublication !== null) {
        return inMemoryPublication;
    }

    setState('publication-loading', true, StoragePersistence.none);
    setState('publication-error', null, StoragePersistence.none);

    activeLoadPromise = (async () => {
        try {
            let file: File;
            try {
                file = await fileStorage.readFile('data/publication.json');
                fileStorage.deleteFile('publication.json').catch(() => {});
            } catch (err) {
                file = await fileStorage.readFile('publication.json');
                try {
                    const legacyText = await file.text();
                    await fileStorage.writeFile('data/publication.json', legacyText);
                    await fileStorage.deleteFile('publication.json').catch(() => {});
                } catch (migrateErr) {
                    console.warn("Could not migrate legacy publication.json to data/publication.json:", migrateErr);
                }
            }
            const text = await file.text();
            const loadedPub = JSON.parse(text);

            let panels = loadedPub.panels || [];
            if (panels.length === 0 && (loadedPub.story || loadedPub.paragraphs)) {
                const storyText = loadedPub.story || "";
                if (storyText) {
                    panels = buildPanelsFromStory(storyText, loadedPub.style);
                }
            }

            loadedPub.panels = panels;

            // Normalize panels using prompts and images info
            loadedPub.panels = buildPanelsFromPublication(loadedPub);

            const calculatedHash = generateTextDigest(text);
            inMemoryPublication = loadedPub;
            inMemoryHash = calculatedHash;

            setState('publication-data', loadedPub, StoragePersistence.none);
            setState('publication-hash', calculatedHash, StoragePersistence.local);

            return loadedPub;
        } catch (e: any) {
            if (e.name === 'NotFoundError' || e.message?.includes('NotFoundError') || e.message?.includes('does not exist')) {
                const defaultPub = {
                    version: '1.0',
                    lastUpdated: new Date().toISOString(),
                    story: "",
                    style: {},
                    panels: [],
                    prompts: [],
                    images: []
                };
                const defaultText = JSON.stringify(defaultPub, null, 2);
                const defaultHash = generateTextDigest(defaultText);

                inMemoryPublication = defaultPub;
                inMemoryHash = defaultHash;

                setState('publication-data', defaultPub, StoragePersistence.none);
                setState('publication-hash', defaultHash, StoragePersistence.local);

                try {
                    await fileStorage.writeFile('data/publication.json', defaultText);
                    await fileStorage.deleteFile('publication.json').catch(() => {});
                } catch (writeErr) {
                    console.warn("Could not write default publication.json:", writeErr);
                }

                return defaultPub;
            } else {
                await writeLog('error', 'loadPublication', `Failed to load publication: ${e.message || String(e)}`);
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

export function buildPanelsFromStory(storyText: string, style?: any) {
    if (!storyText || storyText.trim() === "") return [];

    const styleInstructions = Array.isArray(style?.drawingInstructions)
        ? style.drawingInstructions.join('\n\n')
        : (style?.drawingInstructions || "");

    const tempPub = { story: storyText };
    const paragraphs = storyToParagraphs(tempPub);

    return paragraphs.map((p, idx) => {
        const comboText = [p.text, "", styleInstructions].filter(Boolean).join("\n\n");
        const digest = generateTextDigest(comboText);
        return {
            panelNo: idx,
            paragraphNo: p.paragraphNo,
            chapterNo: p.chapterNo,
            pageNo: p.pageNo,
            text: p.text,
            sceneText: p.text,
            narrativeText: "",
            instructionsText: styleInstructions,
            digest,
            images: [],
            image: "",
            currentImageIndex: 0,
            imageStatus: "pending"
        };
    });
}

export function buildPanelsFromPublication(pub: any) {
    const rawItems = pub?.panels || [];
    const prompts = pub?.prompts || [];
    const isOnePerPage = pub?.style?.imageDisplayMode === 'one_per_page' || pub?.options?.imageDisplayMode === 'one_per_page';

    if (isOnePerPage && rawItems.length > 0) {
        const pageGroups: Map<number, any[]> = new Map();
        rawItems.forEach((p: any, idx: number) => {
            const pageNo = p.pageNo ?? 1;
            if (!pageGroups.has(pageNo)) {
                pageGroups.set(pageNo, []);
            }
            pageGroups.get(pageNo)!.push({ item: p, idx });
        });

        const panels: any[] = [];
        let panelIndex = 0;

        pageGroups.forEach((items, pageNo) => {
            const combinedText = items.map(x => x.item.text || "").filter(Boolean).join("\n\n");

            const allImagesSet = new Set<string>();
            let activeImage = "";

            for (const x of items) {
                const p = x.item;
                const imgs = Array.isArray(p.images) && p.images.length > 0
                    ? p.images
                    : p.image
                        ? [p.image]
                        : p.imageUrl
                            ? [p.imageUrl]
                            : [];
                imgs.forEach((img: string) => allImagesSet.add(img));
                if (!activeImage && (p.image || p.imageUrl)) {
                    activeImage = p.image || p.imageUrl;
                }
            }

            const imagesList = Array.from(allImagesSet);
            if (!activeImage && imagesList.length > 0) {
                activeImage = imagesList[0];
            }

            const firstItem = items[0]?.item || {};
            const error = firstItem.error || items.find(x => x.item.error)?.item.error;
            const rawIndex = firstItem.currentImageIndex ?? Math.max(0, imagesList.indexOf(activeImage));
            const currentImageIndex = rawIndex >= 0 ? rawIndex : 0;

            const hasImage = imagesList.length > 0 && Boolean(activeImage);
            const imageStatus = firstItem.imageStatus
                ? firstItem.imageStatus
                : (error ? 'failed' : (hasImage ? 'completed' : 'pending'));

            const styleInstructions = Array.isArray(pub?.style?.drawingInstructions)
                ? pub.style.drawingInstructions.join('\n\n')
                : (pub?.style?.drawingInstructions || "");

            panels.push({
                panelNo: panelIndex,
                pageNo,
                text: combinedText,
                sceneText: combinedText,
                narrativeText: firstItem.narrativeText || "",
                instructionsText: firstItem.instructionsText || styleInstructions,
                cinematographicText: firstItem.cinematographicText || "",
                characterText: firstItem.characterText || "",
                characters: firstItem.characters || [],
                isLocked: firstItem.isLocked || false,
                digest: firstItem.digest || "",
                images: imagesList,
                image: activeImage,
                currentImageIndex,
                imageStatus,
                ...(error ? { error } : {})
            });

            panelIndex++;
        });

        return panels;
    }

    const styleInstructions = Array.isArray(pub?.style?.drawingInstructions)
        ? pub.style.drawingInstructions.join('\n\n')
        : (pub?.style?.drawingInstructions || "");

    return rawItems.map((p: any, idx: number) => {
        const matchingPrompt = prompts.find((pr: any) =>
            (pr.paragraphIndex === idx || pr.paragraphNo === idx || (pr.digest && pr.digest === p.digest))
        );

        const promptImage = matchingPrompt?.image || matchingPrompt?.imageUrl || "";

        const imagesList: string[] = Array.isArray(p.images) && p.images.length > 0
            ? p.images
            : p.image
                ? [p.image]
                : p.imageUrl
                    ? [p.imageUrl]
                    : promptImage
                        ? [promptImage]
                        : [];

        const activeImage = p.image || p.imageUrl || promptImage || imagesList[imagesList.length - 1] || "";
        const rawIndex = p.currentImageIndex ?? Math.max(0, imagesList.indexOf(activeImage));
        const currentImageIndex = rawIndex >= 0 ? rawIndex : (imagesList.length > 0 ? imagesList.length - 1 : 0);
        const hasImage = imagesList.length > 0 && Boolean(activeImage);
        const promptStatus = matchingPrompt?.imageStatus;
        const needsRegenerate = Boolean(p.needsRegenerate || matchingPrompt?.needsRegenerate);
        const errorMsg = p.error || matchingPrompt?.error || "";
        const isFailed = p.imageStatus === 'failed' || promptStatus === 'failed' || Boolean(errorMsg);

        const isPendingOrGenerating = !isFailed && (needsRegenerate || p.imageStatus === 'pending' || p.imageStatus === 'generating' || promptStatus === 'pending' || promptStatus === 'generating');

        const imageStatus = isFailed
            ? 'failed'
            : (isPendingOrGenerating
                ? (p.imageStatus && p.imageStatus !== 'completed' ? p.imageStatus : (promptStatus || 'pending'))
                : (p.imageStatus ? p.imageStatus : (hasImage ? 'completed' : (promptStatus || 'pending'))));

        return {
            panelNo: p.panelNo ?? p.paragraphNo ?? idx,
            text: p.text || p.sceneText || "",
            sceneText: p.sceneText || p.text || "",
            narrativeText: p.narrativeText || "",
            instructionsText: p.instructionsText || styleInstructions,
            cinematographicText: p.cinematographicText || matchingPrompt?.cinematographicText || "",
            characterText: p.characterText || matchingPrompt?.characterText || "",
            characters: p.characters || matchingPrompt?.characters || [],
            isLocked: Boolean(p.isLocked || matchingPrompt?.isLocked),
            digest: p.digest || "",
            images: imagesList,
            image: needsRegenerate ? "" : activeImage,
            currentImageIndex,
            imageStatus,
            needsRegenerate,
            ...(errorMsg ? { error: errorMsg } : {})
        };
    });
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
        const panels = pub && typeof pub === 'object' ? buildPanelsFromPublication(pub) : [];
        const cleanPub: any = {
            panels
        };

        // Persist prompts so image generation can read them back from disk
        if (pub?.prompts && Array.isArray(pub.prompts) && pub.prompts.length > 0) {
            cleanPub.prompts = pub.prompts;
        }

        // Persist image generation status
        if (pub?.imageGenerationStatus) {
            cleanPub.imageGenerationStatus = pub.imageGenerationStatus;
        }

        const json = JSON.stringify(cleanPub, null, 2);
        const hash = generateTextDigest(json);

        // Save to disk - write to data/publication.json only and clean up top-level file
        await fileStorage.writeFile('data/publication.json', json);
        await fileStorage.deleteFile('publication.json').catch(() => {});

        // Ensure in-memory object contains panels
        if (pub && typeof pub === 'object') {
            pub.panels = panels;
        }

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
        await writeLog('error', 'savePublication', `Failed to save publication in savePublication: ${e.message || String(e)}`);
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


export function getChapter(chapterNo: any) {
    return inMemoryPublication?.chapters?.find((c: any) => c.chapterNo === chapterNo);
}

export function getPage(chapterNo: any, pageNo: any) {
    return inMemoryPublication?.pages?.find((p: any) => p.chapterNo === chapterNo && p.pageNo === pageNo);
}

export function getParagraph(chapterNo: any, pageNo: any, paragraphNo: any) {
    return inMemoryPublication?.paragraphs?.find((p: any) => p.chapterNo === chapterNo && p.pageNo === pageNo && p.paragraphNo === paragraphNo);
}

export function getPredicates(chapterNo: any, pageNo: any, paragraphNo: any) {
    return inMemoryPublication?.predicates?.find((p: any) => p.chapterNo === chapterNo && p.pageNo === pageNo && p.paragraphNo === paragraphNo);
}

export function getPrompts(chapterNo: any, pageNo: any, paragraphNo: any) {
    return inMemoryPublication?.prompts?.find((p: any) => p.chapterNo === chapterNo && p.pageNo === pageNo && p.paragraphNo === paragraphNo);
}

/**
 * Resets the in-memory publication cache and its state-mutex representations.
 */
export function clearPublicationCache(): void {
    inMemoryPublication = null;
    inMemoryHash = null;
    activeLoadPromise = null;
    setState('publication-data', null, StoragePersistence.none);
    setState('publication-hash', '', StoragePersistence.local);
}