import generateParagraphs from "@/data/utilities/generateParagraphs";
import generatePages from "@/data/utilities/generatePages";
import generateChapters from "@/data/utilities/generateChapters";
import { loadPublication, savePublication } from "@/data/managePublication";
import generateTextSummaries from "@/data/process/generateTextSummaries";
import generatePredicates from "./utilities/generatePredicates";
import generatePrompts from "./process/generatePrompts";
import generateImages from "./process/generateImages";
import { writeLog } from "./storage/logStorage";

export default async function processPublicationImpl({ style, story }: { style?: Record<string, any>, story?: string } = {}) {
    // Load current publication state from disk or in-memory cache
    const publication = await loadPublication();

    if (style != null) {
        publication.style = style;
    }

    if (story != null) {
        publication.story = story;
    }

    await writeLog('info', 'processPublicationImpl', 'Started processing publication');

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
    await savePublication(publication);
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({ type: 'PROGRESS' });
    }

    // Run image generation to completion inside the worker context
    try {
        await generateImages(publication);
    } catch (err) {
        await writeLog('error', 'processPublicationImpl', "Failed to run image generation: " + err);
    }

    await writeLog('info', 'processPublicationImpl', 'Finished processing publication');

    return publication;
}
