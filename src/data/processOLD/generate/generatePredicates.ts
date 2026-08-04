import generateTextDigest from "@/data/processOLD/generate/generateTextDigest";

interface ParagraphItem {
  paragraphIndex: number;
  chapterNo: number;
  pageNo: number;
  paragraphNo: number;
  text: string;
}

interface PublicationData {
  paragraphs?: ParagraphItem[];
  predicates?: unknown[];
}

export default function generatePredicates(publication: PublicationData) {
  const paragraphs = publication.paragraphs || [];

  let currentChapter = -1;
  let currentPage = -1;

  let priorText: string | undefined;

  const result = paragraphs.map((p) => {
    if (p.chapterNo !== currentChapter || p.pageNo !== currentPage || p.paragraphNo === 0) {
      priorText = undefined;
    }

    const item = {
      paragraphIndex: p.paragraphIndex,
      chapterNo: p.chapterNo,
      pageNo: p.pageNo,
      paragraphNo: p.paragraphNo,
      text: priorText,
      digest: generateTextDigest(priorText)
    };

    priorText = priorText ? priorText + '\n\n' + p.text : p.text;

    currentChapter = p.chapterNo;
    currentPage = p.pageNo;

    return item;
  });

  publication.predicates = result;

  return result;
}
