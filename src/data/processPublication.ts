import generateParagraphs from "@/data/utilities/generateParagraphs";
import generatePages from "./utilities/generatePages";
import generateChapters from "./utilities/generateChapters";
import { loadPublication, savePublication } from "./managePublication";

export default async function processPublication({ style, story }: { style?: Record<string, any>, story?: string } = {}) {
    // Load current publication state from disk or in-memory cache
    const publication = await loadPublication();

    if (style != null) {
        publication.style = style;
    }

    if (story != null) {
        publication.story = story;
    }


    publication.paragraphs = generateParagraphs(publication.story);
    publication.pages = generatePages(publication.paragraphs);
    publication.chapters = generateChapters(publication.pages);

    // Save updated publication back to disk and update the hash state
    await savePublication(publication);

    return publication;
}