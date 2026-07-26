

import generateTextDigest from "@/data/utilities/generateTextDigest";

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

  let chapterNo = 0;
  let pageNo = 0;
  let paragraphNo = 0;

  const currentPageParagraphs: string[] = [];
  const oldParagraphs = publication.paragraphs || [];

  for (let i = 0; i < rawParagraphs.length; i++) {
    const block = rawParagraphs[i];
    const trimmed = block.trim();
    if (trimmed.startsWith('##')) {
      pageNo++;
      currentPageParagraphs.length = 0; // Clear paragraphs for the new page
    } else if (trimmed.startsWith('#')) {
      chapterNo++;
      pageNo = 0;
      currentPageParagraphs.length = 0; // Clear paragraphs for the new chapter/page
    } else {
      const digest = generateTextDigest(trimmed);
      const existing = oldParagraphs.find((op: any) => op.digest === digest || op.text === trimmed);

      result.push({
        paragraphNo,
        paragraphIndex: i,
        text: trimmed,
        chapterNo,
        pageNo,
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
  }

  publication.paragraphs = result;

  return result;
}

