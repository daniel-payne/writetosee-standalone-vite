

import generateTextDigest from "@/data/utilities/generateTextDigest";

export default function generateParagraphs(publication: Record<string, any>, characterThreshold = 20, paragraphSeparator = '\n\n') {
  const text = publication.story

  if (text == null) {
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
    text: string;
    precedingText: string | null;
    chapterNo: number;
    pageNo: number;
    textDigest: string;
  }> = [];

  let chapterNo = 0;
  let pageNo = 0;
  let paragraphNo = 0;

  const currentPageParagraphs: string[] = [];

  for (const block of rawParagraphs) {
    const trimmed = block.trim();
    if (trimmed.startsWith('##')) {
      pageNo++;
      currentPageParagraphs.length = 0; // Clear paragraphs for the new page
    } else if (trimmed.startsWith('#')) {
      chapterNo++;
      pageNo = 0;
      currentPageParagraphs.length = 0; // Clear paragraphs for the new chapter/page
    } else {
      const precedingText = currentPageParagraphs.length === 0
        ? null
        : currentPageParagraphs.join(paragraphSeparator);

      result.push({
        paragraphNo,
        text: trimmed,
        precedingText,
        chapterNo,
        pageNo,
        textDigest: generateTextDigest(trimmed)
      });

      currentPageParagraphs.push(trimmed);
      paragraphNo++;
    }
  }

  publication.paragraphs = result;

  return result;
}

