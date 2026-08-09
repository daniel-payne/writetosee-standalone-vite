import llmGenerateText from '@/data/llm/llmGenerateText';
import { storeCost } from '@/data/storage/costStorage';
import * as fileStorage from '@/data/storage/fileStorage';
import { processDb } from '../db';
import { generateTextDigest } from '../parsers';
import { existingSummariesSet } from '../loadStartup';
import type { Story, Summary } from '../TYPES';

const SYSTEM_PROMPT = `
You are an assistant specialized in narrative summarization for visual storytelling.
Analyze the provided story text and generate a concise, high-level narrative summary.
Guidelines:
1. Length: Approximately 50-75 words.
2. Focus on characters, conflict, setting details, and key narrative developments.
3. Output only the plain summary text. Do not add headers or commentary wrappers.
`;

export async function getOrGenerateSummary(text: string, digestInput?: string): Promise<string> {
  if (!text || !text.trim()) return '';

  const digest = digestInput || generateTextDigest(text);
  const fileName = `summaries/${digest}.md`;

  // 1. Check disk index / cache first
  if (existingSummariesSet.has(fileName)) {
    try {
      const file = await fileStorage.readFile(fileName);
      const content = await file.text();
      if (content && content.trim()) {
        return content.trim();
      }
    } catch {
      // file read failed, fall through
    }
  }

  // Check Dexie summaries table
  const existingRecord = await processDb.summaries.get(digest);
  if (existingRecord && (existingRecord.summary_text || existingRecord.summaryText)) {
    return existingRecord.summary_text || existingRecord.summaryText || '';
  }

  // 2. Generate summary via LLM
  try {
    const userPrompt = `<story-text>\n${text}\n</story-text>`;
    const { content, totalCost } = await llmGenerateText(SYSTEM_PROMPT, userPrompt);
    const summaryText = (content || text.slice(0, 200)).trim();

    // 3. Save to disk cache & Dexie IndexedDB
    await fileStorage.writeFile(fileName, summaryText).catch(err => {
      console.warn(`[generateSummaries] Failed writing ${fileName} to disk:`, err);
    });
    existingSummariesSet.add(fileName);

    const count = await processDb.summaries.count();
    const summaryEntry: Summary = {
      summaryId: count + 1,
      summary_digest: digest,
      digest,
      summary_text: summaryText,
      summaryText
    };
    await processDb.summaries.put(summaryEntry);

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
 * /workflows/generateSummaries: Generates or looks up summaries for story, chapters, and pages,
 * utilizing the summary cache in /summaries and Dexie summaries table.
 */
export async function generateSummaries(story: Story): Promise<Story> {
  if (!story || !story.chapters) return story;

  for (const chapter of story.chapters) {
    const chapText = chapter.chapter_text || chapter.chapterText || '';
    if (chapText) {
      const chapDigest = chapter.chapter_digest || chapter.chapterDigest || generateTextDigest(chapText);
      const summ = await getOrGenerateSummary(chapText, chapDigest);
      chapter.chapter_summary = summ;
      chapter.chapterSummary = summ;
    }

    for (const page of chapter.pages || []) {
      const pageText = page.page_text || page.pageText || '';
      if (pageText) {
        const pageDigest = page.page_digest || page.pageDigest || generateTextDigest(pageText);
        const summ = await getOrGenerateSummary(pageText, pageDigest);
        page.page_summary = summ;
        page.pageSummary = summ;
      }
    }
  }

  return story;
}
