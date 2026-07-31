

import generateTextDigest from "@/data/process/generate/generateTextDigest";

export default function generateParagraphs(publication: Record<string, any>, characterThreshold = 20, paragraphSeparator = '\n\n') {
    const text = publication.story as string;

    if (text == null || text.trim() === '') {
        publication.paragraphs = [];
        return [];
    }

    let rawParagraphs: string[];
    if (text.replace(/\s/g, '').length < characterThreshold) {
        rawParagraphs = [text];
    } else {
        rawParagraphs = text.split(paragraphSeparator).map(p => p.trim()).filter(p => p);
    }

    const result: Array<{
        paragraphNo: number;
        paragraphIndex: number;
        text: string;
        chapterNo: number;
        pageNo: number;
        digest: string;
        image?: string;
        imageUrl?: string;
        images?: string[];
        needsRegenerate?: boolean;
        error?: string;
    }> = [];

    // Determine heading depth levels present in the text
    let hasH1 = false;
    let hasH2 = false;
    let hasH3 = false;

    for (const block of rawParagraphs) {
        const trimmed = block.trim();
        if (trimmed.startsWith('###')) hasH3 = true;
        else if (trimmed.startsWith('##')) hasH2 = true;
        else if (trimmed.startsWith('#')) hasH1 = true;
    }

    const maxLevel = hasH3 ? 3 : hasH2 ? 2 : hasH1 ? 1 : 0;

    let chapterNo = maxLevel === 1 || maxLevel === 0 ? 1 : 0;
    let pageNo = maxLevel === 0 ? 1 : 0;
    let paragraphNo = 0;

    const currentPageParagraphs: string[] = [];
    const oldParagraphs = publication.paragraphs || [];

    for (let i = 0; i < rawParagraphs.length; i++) {
        const block = rawParagraphs[i];
        const trimmed = block.trim();

        if (trimmed.startsWith('#')) {
            if (maxLevel === 3) {
                if (trimmed.startsWith('###')) {
                    pageNo++;
                    currentPageParagraphs.length = 0;
                } else if (trimmed.startsWith('##')) {
                    chapterNo++;
                    pageNo = 1;
                    currentPageParagraphs.length = 0;
                } else {
                    publication.storyTitle = trimmed.replace(/^#+\s*/, '').trim();
                }
            } else if (maxLevel === 2) {
                if (trimmed.startsWith('##')) {
                    pageNo++;
                    currentPageParagraphs.length = 0;
                } else {
                    chapterNo++;
                    pageNo = 1;
                    currentPageParagraphs.length = 0;
                }
            } else if (maxLevel === 1) {
                pageNo++;
                currentPageParagraphs.length = 0;
            }
            continue;
        }

        const digest = generateTextDigest(trimmed);
        const existing = oldParagraphs.find((op: any) => op.digest === digest || op.text === trimmed);

        result.push({
            paragraphNo,
            paragraphIndex: i,
            text: trimmed,
            chapterNo: Math.max(1, chapterNo),
            pageNo: Math.max(1, pageNo),
            digest,
            image: existing?.image,
            imageUrl: existing?.imageUrl,
            images: existing?.images,
            needsRegenerate: existing?.needsRegenerate,
            error: existing?.error,
        });

        currentPageParagraphs.push(trimmed);
        paragraphNo++;
    }

    publication.paragraphs = result;

    return result;
}

