import { useSharedState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import generateTextDigest from '@/data/processOLD/generate/generateTextDigest';
import storyToParagraphs from './generate/generateParagraphs';
import { db, importFromFiles, exportToFiles, ensureDbOpen } from '@/data/storage/db';
import { useLiveQuery } from 'dexie-react-hooks';

let activeLoadPromise: Promise<any> | null = null;

/**
 * Loads the publication from Dexie database. If Dexie is empty or forceReload is true,
 * imports from local storage files into Dexie first.
 */
export async function loadPublication(forceReload = false): Promise<any> {
    if (activeLoadPromise) {
        return activeLoadPromise;
    }

    setState('publication-loading', true, StoragePersistence.none);
    setState('publication-error', null, StoragePersistence.none);

    activeLoadPromise = (async () => {
        try {
            await ensureDbOpen();
            const count = await db.panels.count().catch(() => 0);
            if (count === 0 || forceReload) {
                await importFromFiles();
            }

            const panels = await db.panels.orderBy('panelNo').toArray();
            const prompts = await db.prompts.toArray();
            const metadata = await db.metadata.toArray();
            const metaMap = new Map(metadata.map(m => [m.key, m.value]));

            const loadedPub = {
                version: '1.0',
                story: metaMap.get('story') || '',
                imageGenerationStatus: metaMap.get('imageGenerationStatus') || 'completed',
                panels,
                prompts
            };

            const hash = generateTextDigest(JSON.stringify(loadedPub));
            setState('publication-hash', hash, StoragePersistence.local);

            return loadedPub;
        } catch (e: any) {
            console.error('[DEXIE] Failed to load publication:', e);
            setState('publication-error', e.message || 'Failed to load publication', StoragePersistence.none);
            throw e;
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
            imageStatus: "pending" as const
        };
    });
}

export function buildPanelsFromPublication(pub: any) {
    return pub?.panels || [];
}

/**
 * Saves a publication object directly to Dexie database.
 */
export async function savePublication(
    pub: any,
    setPubHashState?: (hash: string) => void
): Promise<string> {
    setState('publication-loading', true, StoragePersistence.none);
    setState('publication-error', null, StoragePersistence.none);

    try {
        if (pub?.panels && Array.isArray(pub.panels)) {
            await db.panels.clear();
            await db.panels.bulkPut(pub.panels.map((p: any, idx: number) => {
                const imagesList: string[] = Array.isArray(p.images) && p.images.length > 0
                    ? p.images
                    : (p.image ? [p.image] : (p.imageUrl ? [p.imageUrl] : []));
                const activeImage = p.image || p.imageUrl || (imagesList.length > 0 ? imagesList[imagesList.length - 1] : '');
                const calculatedIdx = imagesList.indexOf(activeImage);
                const currentImageIndex = calculatedIdx >= 0 ? calculatedIdx : (p.currentImageIndex ?? (imagesList.length > 0 ? imagesList.length - 1 : 0));

                return {
                    ...p,
                    panelNo: p.panelNo ?? idx,
                    images: imagesList,
                    image: activeImage,
                    currentImageIndex
                };
            }));
        }

        if (pub?.prompts && Array.isArray(pub.prompts)) {
            await db.prompts.bulkPut(pub.prompts);
        }

        if (pub?.imageGenerationStatus) {
            await db.metadata.put({ key: 'imageGenerationStatus', value: pub.imageGenerationStatus });
        }

        const panels = await db.panels.orderBy('panelNo').toArray();
        const prompts = await db.prompts.toArray();

        const updatedPub = {
            ...pub,
            panels,
            prompts
        };

        const hash = generateTextDigest(JSON.stringify(updatedPub));

        if (setPubHashState) {
            setPubHashState(hash);
        } else {
            setState('publication-hash', hash, StoragePersistence.local);
        }

        exportToFiles().catch((err: any) => console.warn('[DEXIE] Background export to files error:', err));
        return hash;
    } catch (e: any) {
        console.error('[DEXIE] Failed to save publication:', e);
        setState('publication-error', e.message || 'Failed to save publication', StoragePersistence.none);
        throw e;
    } finally {
        setState('publication-loading', false, StoragePersistence.none);
    }
}

/**
 * A hook that returns the active publication object reactively directly from Dexie live queries.
 */
export function usePublication(): [any, (valOrFunc: any) => Promise<void>] {
    const livePanels = useLiveQuery(() => db.panels.orderBy('panelNo').toArray());
    const livePrompts = useLiveQuery(() => db.prompts.toArray());

    const publication = {
        panels: livePanels || [],
        prompts: livePrompts || []
    };

    const setPub = async (valOrFunc: any) => {
        const newPub = typeof valOrFunc === 'function' ? valOrFunc(publication) : valOrFunc;
        await savePublication(newPub);
    };

    return [publication, setPub];
}

export function usePublicationHash(): [string] {
    const [pubHash] = useSharedState<string>('publication-hash', '');
    return [pubHash];
}

export function usePublicationLoading(): [boolean] {
    const [isLoading] = useSharedState<boolean>('publication-loading', false);
    return [isLoading];
}

export function usePublicationLoadingError(): [string | null] {
    const [error] = useSharedState<string | null>('publication-error', null);
    return [error];
}

export function getChapter(_chapterNo: any) {
    return undefined;
}

export function getPage(_chapterNo: any, _pageNo: any) {
    return undefined;
}

export function getParagraph(_chapterNo: any, _pageNo: any, _paragraphNo: any) {
    return undefined;
}

export function getPredicates(_chapterNo: any, _pageNo: any, _paragraphNo: any) {
    return undefined;
}

export function getPrompts(_chapterNo: any, _pageNo: any, _paragraphNo: any) {
    return undefined;
}

export function clearPublicationCache(): void {
    activeLoadPromise = null;
    setState('publication-hash', '', StoragePersistence.local);
}