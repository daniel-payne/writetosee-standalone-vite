import llmGenerateText from '@/data/llm/llmGenerateText';
import { storeCost } from '@/data/storage/costStorage';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from '../db';
import { generateTextDigest } from '../parsers';
import { existingSummariesSet } from '../loadStartup';
import type { Story } from '../TYPES';

const SYSTEM_PROMPT = `
You are an assistant specialized in narrative summarization. 
Analyze the provided story text and generate a concise, high-level summary.
Guidelines:
1. Length: Approximately 50-75 words.
2. Focus on characters, conflict, and key developments.
3. Output only the plain summary text. Do not add headers or commentary wrappers.
`;

export async function getOrGenerateSummary(text: string, digestInput?: string): Promise<string> {
  if (!text || !text.trim()) return '';

  const digest = digestInput || generateTextDigest(text);
  const fileName = `summaries/${digest}.md`;

  // 1. Check disk index / IndexedDB cache first
  if (existingSummariesSet.has(fileName)) {
    try {
      const file = await fileStorage.readFile(fileName);
      const content = await file.text();
      if (content && content.trim()) {
        return content.trim();
      }
    } catch {
      // file read failed, fall through to regenerate
    }
  }

  // Check Dexie summary table
  const existingRecord = await processDb.summaries.where('digest').equals(digest).first();
  if (existingRecord && existingRecord.summaryText) {
    return existingRecord.summaryText;
  }

  // 2. Generate summary via LLM
  try {
    const userPrompt = `<story-text>\n${text}\n</story-text>`;
    const { content, totalCost } = await llmGenerateText(SYSTEM_PROMPT, userPrompt);
    const summaryText = (content || text.slice(0, 200)).trim();

    // 3. Save to disk cache & IndexedDB
    await fileStorage.writeFile(fileName, summaryText).catch(err => {
      console.warn(`[generateSummaries] Failed writing ${fileName} to disk:`, err);
    });
    existingSummariesSet.add(fileName);

    const count = await processDb.summaries.count();
    await processDb.summaries.put({
      summaryId: count + 1,
      digest,
      summaryText
    });

    if (totalCost) {
      await storeCost([totalCost], 'summary');
    }

    return summaryText;
  } catch (err) {
    console.warn(`[generateSummaries] Error generating summary for digest ${digest}:`, err);
    return text.slice(0, 150);
  }
}

/**
 * /workflows/generateSummaries: Takes story summaries for each page and chapter,
 * utilizing the summary cache in /summaries.
 */
export async function generateSummaries(story: Story): Promise<Story> {
  if (!story || !story.chapters) return story;

  for (const chapter of story.chapters) {
    if (chapter.chapterText) {
      chapter.chapterSummary = await getOrGenerateSummary(chapter.chapterText, chapter.chapterDigest);
    }

    for (const page of chapter.pages || []) {
      if (page.pageText) {
        page.pageSummary = await getOrGenerateSummary(page.pageText, page.pageDigest);
      }
    }
  }

  return story;
}
