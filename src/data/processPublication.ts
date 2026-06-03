import generateParagraphs from "@/data/utilities/generateParagraphs";
import generatePages from "@/data/utilities/generatePages";
import generateChapters from "@/data/utilities/generateChapters";
import { loadPublication, savePublication } from "@/data/managePublication";
import generateTextSummaries from "@/data/process/generateTextSummaries";
import generatePredicates from "./utilities/generatePredicates";
import generatePrompts from "./process/generatePrompts";
import generateImages from "./process/generateImages";

export default async function processPublication({ style, story }: { style?: Record<string, any>, story?: string } = {}) {
    // Load current publication state from disk or in-memory cache
    const publication = await loadPublication();

    // TODO load API KEY here and pass to generators

    if (style != null) {
        publication.style = style;
    }

    if (story != null) {
        publication.story = story;
    }

    // Processes mutate the object
    generateParagraphs(publication);
    generatePages(publication);
    generateChapters(publication);

    generatePredicates(publication)

    await generateTextSummaries(publication);

    await generatePrompts(publication);

    // Save updated publication back to disk and update the hash state
    await savePublication(publication);

    // Run image generation in the background so it does not block the webpage
    generateImages(publication).catch(err => {
        console.error("Failed to run image generation in background:", err);
    });

    return publication;
}

