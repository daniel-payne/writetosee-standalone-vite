import generateTextDigest from "@/data/processOLD/generate/generateTextDigest";

export default function generatePages(publication: Record<string, any>) {
  const paragraphs = publication.paragraphs;

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

  const result: any[] = Array.from(pagesMap.values()).map(page => {
    const text = page.texts.join('\n');
    return {
      chapterNo: page.chapterNo,
      pageNo: page.pageNo,
      text,
      digest: generateTextDigest(text)
    };
  });

  publication.pages = result;

  return result;
}
