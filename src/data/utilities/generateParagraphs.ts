

import generateTextDigest from "@/data/utilities/generateTextDigest";

export default function generateParagraphs(publication: Record<string, any>, characterThreshold = 20, paragraphSeparator = '\n\n') {
  const text = publication.story as string;

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
    paragraphIndex: number;
    text: string;
    chapterNo: number;
    pageNo: number;
    digest: string;
  }> = [];

  let chapterNo = 0;
  let pageNo = 0;
  let paragraphNo = 0;

  const currentPageParagraphs: string[] = [];

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
      result.push({
        paragraphNo,
        paragraphIndex: i,
        text: trimmed,
        chapterNo,
        pageNo,
        digest: generateTextDigest(trimmed)
      });

      currentPageParagraphs.push(trimmed);
      paragraphNo++;
    }
  }

  publication.paragraphs = result;

  return result;
}

