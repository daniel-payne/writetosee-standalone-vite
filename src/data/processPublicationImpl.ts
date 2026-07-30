import generateParagraphs from "@/data/utilities/generateParagraphs";
import generatePages from "@/data/utilities/generatePages";
import generateChapters from "@/data/utilities/generateChapters";
import { loadPublication, savePublication } from "@/data/managePublication";
import generateTextSummaries from "@/data/process/generateTextSummaries";
import generatePredicates from "./utilities/generatePredicates";
import generatePrompts from "./process/generatePrompts";
import generateImages from "./process/generateImages";
import { writeLog } from "./storage/logStorage";
import { listFiles } from "./storage/fileStorage";

export default async function processPublicationImpl({ style, story }: { style?: Record<string, any>, story?: string } = {}) {
    // Load current publication state from disk or in-memory cache
    const publication = await loadPublication();

    if (style != null) {
        publication.style = style;
    }

    if (story != null) {
        publication.story = story;
    }

    await writeLog('info', 'processPublicationImpl', 'Started processing publication prompts');

    // Processes mutate the object
    generateParagraphs(publication);
    await savePublication(publication);
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({ type: 'PROGRESS' });
    }

    generatePages(publication);
    await savePublication(publication);
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({ type: 'PROGRESS' });
    }

    generateChapters(publication);
    await savePublication(publication);
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({ type: 'PROGRESS' });
    }

    generatePredicates(publication);
    await savePublication(publication);
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({ type: 'PROGRESS' });
    }

    await generateTextSummaries(publication);
    await savePublication(publication);
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({ type: 'PROGRESS' });
    }

    await generatePrompts(publication);

    // Initial check of image file statuses so the UI receives status data instantly
    const prompts = publication.prompts || [];
    const paragraphs = publication.paragraphs || [];
    const existingFiles = await listFiles().catch(() => []);
    const existingSet = new Set(existingFiles);

    for (const prompt of prompts) {
        const digest = prompt.digest;
        if (!digest) continue;

        const imagePath = `images/${digest}.png`;
        const exists = existingSet.has(imagePath);
        
        const expectedStatus = exists ? 'completed' : (prompt.error ? 'failed' : 'pending');
        prompt.imageStatus = expectedStatus;

        if (exists) {
            prompt.image = imagePath;
            prompt.imageUrl = imagePath;
            delete prompt.error;
        } else {
            delete prompt.image;
            delete prompt.imageUrl;
        }

        if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
            const paragraph = paragraphs[prompt.paragraphIndex];
            paragraph.imageStatus = expectedStatus;
            if (exists) {
                paragraph.image = imagePath;
                paragraph.imageUrl = imagePath;
                delete paragraph.error;
            } else {
                delete paragraph.image;
                delete paragraph.imageUrl;
                if (prompt.error) {
                    paragraph.error = prompt.error;
                } else {
                    delete paragraph.error;
                }
            }
        }
    }

    const failedAny = prompts.some((p: any) => p.imageStatus === 'failed');
    const pendingAny = prompts.some((p: any) => p.imageStatus === 'pending');
    publication.imageGenerationStatus = pendingAny ? 'pending' : (failedAny ? 'failed' : 'completed');

    await savePublication(publication);
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({ type: 'PROGRESS' });
    }

    await writeLog('info', 'processPublicationImpl', 'Finished processing publication prompts');

    return publication;
}

export async function processImageGenerationImpl() {
    await writeLog('info', 'processImageGenerationImpl', 'Started background image generation');

    // Load publication from disk
    const publication = await loadPublication();

    try {
        await generateImages(publication);
    } catch (err) {
        await writeLog('error', 'processImageGenerationImpl', "Failed to run image generation: " + err);
    }

    await writeLog('info', 'processImageGenerationImpl', 'Finished background image generation');

    return publication;
}
