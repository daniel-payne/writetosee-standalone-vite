import generateTextDigest from "@/data/utilities/generateTextDigest";

export default function generateChapters(publication: Record<string, any>) {
  const pages = publication.pages;

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

  const result: any[] = Array.from(chaptersMap.values()).map(chapter => {
    const text = chapter.texts.join('\n\n');
    return {
      chapterNo: chapter.chapterNo,
      text,
      digest: generateTextDigest(text)
    };
  });

  publication.chapters = result;

  return result;
}
