import generateTextDigest from "@/data/utilities/generateTextDigest";

export default function generateChapters(
  pages: Array<{
    chapterNo: number;
    pageNo: number;
    text: string;
  }>
) {
  const chaptersMap = new Map<number, { chapterNo: number; texts: string[] }>();

  for (const p of pages) {
    if (!chaptersMap.has(p.chapterNo)) {
      chaptersMap.set(p.chapterNo, {
        chapterNo: p.chapterNo,
        texts: []
      });
    }
    chaptersMap.get(p.chapterNo)!.texts.push(p.text);
  }

  return Array.from(chaptersMap.values()).map(chapter => {
    const text = chapter.texts.join('\n\n');
    return {
      chapterNo: chapter.chapterNo,
      text,
      textDigest: generateTextDigest(text)
    };
  });
}
