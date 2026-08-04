import Dexie, { type Table } from 'dexie';
import * as fileStorage from './fileStorage';
import generateTextDigest from '../processOLD/generate/generateTextDigest';
import storyToParagraphs from '../processOLD/generate/generateParagraphs';
import { parseCharactersMarkdown } from '../processOLD/manageCharacters';
import { parseInstructionsMarkdown } from '../processOLD/manageInstructions';

export interface PanelRecord {
    id?: number;
    panelNo: number;
    text: string;
    sceneText: string;
    narrativeText?: string;
    instructionsText?: string;
    cinematographicText?: string;
    characterText?: string;
    characters: string[];
    isLocked: boolean;
    digest: string;
    image: string;
    images: string[];
    currentImageIndex: number;
    imageStatus: 'pending' | 'generating' | 'completed' | 'failed';
    error?: string;
    needsRegenerate?: boolean;
}

export interface CharacterRecord {
    name: string;
    description: string;
    instructions?: string;
    cropBox?: { x: number; y: number; width: number; height: number };
}

export interface PromptRecord {
    digest: string;
    panelNo: number;
    paragraphIndex?: number;
    sceneText: string;
    narrativeText?: string;
    instructionsText?: string;
    cinematographicText?: string;
    characterText?: string;
    text: string;
    imageStatus: 'pending' | 'generating' | 'completed' | 'failed';
    image?: string;
    imageUrl?: string;
    error?: string;
    needsRegenerate?: boolean;
}

export interface AppMetadataRecord {
    key: string;
    value: any;
}

export class WriteToSeeDB extends Dexie {
    panels!: Table<PanelRecord, number>;
    characters!: Table<CharacterRecord, string>;
    prompts!: Table<PromptRecord, string>;
    metadata!: Table<AppMetadataRecord, string>;

    constructor() {
        super('WriteToSeeDB');
        this.version(2).stores({
            panels: 'panelNo, digest, imageStatus',
            characters: 'name',
            prompts: 'digest, panelNo',
            metadata: 'key'
        });
    }
}

export const db = new WriteToSeeDB();

/**
 * Ensures the Dexie database is open and handles primary key schema updates safely.
 */
export async function ensureDbOpen(): Promise<void> {
    try {
        if (!db.isOpen()) {
            await db.open();
        }
    } catch (err: any) {
        console.warn('[DEXIE] Primary key schema change detected. Deleting old IndexedDB database and recreating...', err);
        await Dexie.delete('WriteToSeeDB');
        await db.open();
    }
}

/**
 * Wipes all tables in the Dexie IndexedDB instance.
 * Used on app startup, homepage load, or directory disconnect for privacy.
 */
export async function wipeDatabase(): Promise<void> {
    try {
        await ensureDbOpen();
        await db.transaction('rw', [db.panels, db.characters, db.prompts, db.metadata], async () => {
            await db.panels.clear();
            await db.characters.clear();
            await db.prompts.clear();
            await db.metadata.clear();
        });
        console.log('[DEXIE] Database cleared successfully.');
    } catch (err) {
        console.error('[DEXIE] Error clearing database:', err);
    }
}

/**
 * Imports files from the connected local/remote directory into Dexie IndexedDB.
 * Always clears existing Dexie database first.
 */
export async function importFromFiles(): Promise<void> {
    console.log('[DEXIE] Importing directory files into IndexedDB...');
    await ensureDbOpen();

    // 1. Load raw files from directory storage first (in parallel)
    const [storyText, styleText, charactersMarkdown, instructionsMarkdown] = await Promise.all([
        fileStorage.readFile('story.md').then(f => f.text()).catch(() => ''),
        fileStorage.readFile('style.md').then(f => f.text()).catch(() => ''),
        fileStorage.readFile('characters.md').then(f => f.text()).catch(() => ''),
        fileStorage.readFile('instructions.md').then(f => f.text()).catch(() => '')
    ]);

    let loadedPub: any = null;
    try {
        const file = await fileStorage.readFile('data/publication.json').catch(() => fileStorage.readFile('publication.json'));
        const text = await file.text();
        loadedPub = JSON.parse(text);
    } catch {
        loadedPub = null;
    }

    // 2. Update metadata
    await db.metadata.bulkPut([
        { key: 'story', value: storyText },
        { key: 'styleText', value: styleText },
        { key: 'charactersText', value: charactersMarkdown },
        { key: 'instructionsText', value: instructionsMarkdown },
        { key: 'imageGenerationStatus', value: loadedPub?.imageGenerationStatus || 'idle' }
    ]);

    // 3. Characters
    const parsedChars = parseCharactersMarkdown(charactersMarkdown);
    await db.characters.clear();
    if (parsedChars.length > 0) {
        await db.characters.bulkPut(parsedChars.map(c => ({
            name: c.name,
            description: c.description || '',
            instructions: c.instructions || '',
            cropBox: c.cropBox
        })));
    }

    // 4. Instructions Map
    const instructionsMap = parseInstructionsMarkdown(instructionsMarkdown);

    // 5. Existing publication panels / prompts
    const existingPanels = loadedPub?.panels || [];
    const existingPrompts = loadedPub?.prompts || [];

    await db.prompts.clear();
    if (existingPrompts.length > 0) {
        await db.prompts.bulkPut(existingPrompts.map((p: any) => ({
            digest: p.digest || generateTextDigest(p.text || ''),
            panelNo: p.panelNo ?? p.paragraphNo ?? 0,
            paragraphIndex: p.paragraphIndex ?? p.panelNo ?? 0,
            sceneText: p.sceneText || p.text || '',
            narrativeText: p.narrativeText || '',
            instructionsText: p.instructionsText || '',
            cinematographicText: p.cinematographicText || '',
            characterText: p.characterText || '',
            text: p.text || '',
            imageStatus: p.imageStatus || 'pending',
            image: p.image || p.imageUrl || '',
            imageUrl: p.imageUrl || p.image || '',
            error: p.error,
            needsRegenerate: p.needsRegenerate
        })));
    }

    // 6. Build panels from story
    const tempPub = { story: storyText };
    const paragraphs = storyToParagraphs(tempPub);

    const panelsToInsert: PanelRecord[] = paragraphs.map((p, idx) => {
        const matchingExisting = existingPanels.find((ep: any) =>
            (ep.panelNo === idx) || (ep.text && ep.text === p.text) || (ep.sceneText && ep.sceneText === p.text)
        ) || existingPanels[idx];

        const panelInst = instructionsMap[idx] ?? instructionsMap[p.paragraphNo];
        const characters = panelInst ? (panelInst.characters || []) : (matchingExisting?.characters || []);
        const cinematographicText = panelInst ? (panelInst.cinematographicText || "") : (matchingExisting?.cinematographicText || "");
        const isLocked = panelInst ? Boolean(panelInst.isLocked) : Boolean(matchingExisting?.isLocked);

        const imagesList = matchingExisting?.images || (matchingExisting?.image ? [matchingExisting.image] : []);
        const activeImage = matchingExisting?.image || matchingExisting?.imageUrl || (imagesList.length > 0 ? imagesList[imagesList.length - 1] : '');
        const hasImage = imagesList.length > 0 && Boolean(activeImage);

        const calculatedIndex = imagesList.indexOf(activeImage);
        const currentImageIndex = calculatedIndex >= 0 ? calculatedIndex : (matchingExisting?.currentImageIndex ?? (imagesList.length > 0 ? imagesList.length - 1 : 0));

        const digest = matchingExisting?.digest || generateTextDigest([p.text, "", styleText].filter(Boolean).join("\n\n"));

        return {
            panelNo: idx,
            text: p.text,
            sceneText: p.text,
            narrativeText: matchingExisting?.narrativeText || '',
            instructionsText: matchingExisting?.instructionsText || styleText,
            cinematographicText,
            characterText: matchingExisting?.characterText || '',
            characters,
            isLocked,
            digest,
            image: activeImage,
            images: imagesList,
            currentImageIndex,
            imageStatus: matchingExisting?.imageStatus && matchingExisting.imageStatus !== 'completed'
                ? matchingExisting.imageStatus
                : (hasImage ? 'completed' : (matchingExisting?.error ? 'failed' : 'pending')),
            error: matchingExisting?.error,
            needsRegenerate: Boolean(matchingExisting?.needsRegenerate)
        };
    });

    await db.panels.where('panelNo').aboveOrEqual(panelsToInsert.length).delete();
    await db.panels.bulkPut(panelsToInsert);
    console.log('[DEXIE] Import completed. Imported', panelsToInsert.length, 'panels into Dexie.');
}

/**
 * Exports current Dexie IndexedDB tables out to local/remote directory files on Save.
 */
export async function exportToFiles(): Promise<void> {
    await ensureDbOpen();
    console.log('[DEXIE] Exporting Dexie state to local storage files...');

    const [panels, prompts, metadata] = await Promise.all([
        db.panels.orderBy('panelNo').toArray(),
        db.prompts.toArray(),
        db.metadata.toArray()
    ]);

    const metaMap = new Map(metadata.map(m => [m.key, m.value]));
    const storyText = metaMap.get('story') || '';
    const imageGenStatus = metaMap.get('imageGenerationStatus') || 'completed';

    // Build publication object for data/publication.json
    const cleanPub = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        imageGenerationStatus: imageGenStatus,
        panels: panels.map(p => ({
            panelNo: p.panelNo,
            text: p.text,
            sceneText: p.sceneText,
            narrativeText: p.narrativeText || '',
            instructionsText: p.instructionsText || '',
            cinematographicText: p.cinematographicText || '',
            characterText: p.characterText || '',
            characters: p.characters || [],
            isLocked: p.isLocked || false,
            digest: p.digest || '',
            image: p.image || '',
            images: p.images || [],
            currentImageIndex: p.currentImageIndex || 0,
            imageStatus: p.imageStatus,
            ...(p.error ? { error: p.error } : {}),
            ...(p.needsRegenerate ? { needsRegenerate: true } : {})
        })),
        prompts
    };

    const pubJson = JSON.stringify(cleanPub, null, 2);

    // Save story.md and publication.json to local directory
    await Promise.all([
        fileStorage.writeFile('story.md', storyText),
        fileStorage.writeFile('data/publication.json', pubJson)
    ]);

    console.log('[DEXIE] Export to storage files completed successfully.');
}
