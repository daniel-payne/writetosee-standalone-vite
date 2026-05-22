import generateTextDigest from "@/data/utilities/generateTextDigest";

export default function generatePages(
  paragraphs: Array<{
    chapterNo: number;
    pageNo: number;
    text: string;
  }>
) {
  const pagesMap = new Map<string, { chapterNo: number; pageNo: number; texts: string[] }>();

  for (const p of paragraphs) {
    const key = `${p.chapterNo}_${p.pageNo}`;
    if (!pagesMap.has(key)) {
      pagesMap.set(key, {
        chapterNo: p.chapterNo,
        pageNo: p.pageNo,
        texts: []
      });
    }
    pagesMap.get(key)!.texts.push(p.text);
  }

  return Array.from(pagesMap.values()).map(page => {
    const text = page.texts.join('\n');
    return {
      chapterNo: page.chapterNo,
      pageNo: page.pageNo,
      text,
      textDigest: generateTextDigest(text)
    };
  });
}
