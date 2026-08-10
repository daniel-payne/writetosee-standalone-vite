import llmGenerateText from '@/data/llm/llmGenerateText';
import { storeCost } from '@/data/storage/costStorage';
import * as fileStorage from '@/data/storage/fileStorage';
import { createGenerateSummarySystemPrompt } from '@/data/llm/prompts/createGenerateSummarySystemPrompt';
import { createGenerateSummaryUserPrompt } from '@/data/llm/prompts/createGenerateSummaryUserPrompt';
import { processDb } from '../db';
import { generateTextDigest } from '../parsers';
import { existingSummariesSet } from '../loadStartup';
import type { Story, Chapter, Page, Paragraph, Summary } from '../TYPES';

export function countWords(text: string | null | undefined): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface SummaryOptions {
  digest?: string;
  maxWords?: number;
  minThresholdWords?: number;
  contextType?: 'story' | 'chapter' | 'page' | 'narrative';
}

export async function getOrGenerateSummary(
  text: string,
  options: SummaryOptions = {}
): Promise<string> {
  if (!text || !text.trim()) return '';

  const digest = options.digest || generateTextDigest(text);
  const fileName = `summaries/${digest}.md`;

  // 1. Check disk cache index
  if (existingSummariesSet.has(fileName)) {
    try {
      const file = await fileStorage.readFile(fileName);
      const content = await file.text();
      if (content && content.trim()) {
        return content.trim();
      }
    } catch {
      // file read failed, fall through to Dexie check
    }
  }

  // 2. Check Dexie summaries table
  const existingRecord = await processDb.summaries.get(digest);
  if (existingRecord && (existingRecord.summary_text || existingRecord.summaryText)) {
    const cached = (existingRecord.summary_text || existingRecord.summaryText || '').trim();
    if (cached) {
      existingSummariesSet.add(fileName);
      return cached;
    }
  }

  // 3. Check word count threshold
  const wordCount = countWords(text);
  const minThreshold = options.minThresholdWords ?? 0;
  if (minThreshold > 0 && wordCount <= minThreshold) {
    // Text does not exceed threshold -> leave uncompressed as specified in processing.md
    return '';
  }

  // 4. Generate summary via LLM
  const maxWords = options.maxWords || 150;
  const contextType = options.contextType || 'narrative';

  const systemPrompt = createGenerateSummarySystemPrompt(contextType, maxWords);

  try {
    const userPrompt = createGenerateSummaryUserPrompt(text);
    const { content, totalCost } = await llmGenerateText(systemPrompt, userPrompt);
    const summaryText = (content || text.slice(0, 300)).trim();

    // 5. Save to disk cache & Dexie summaries table
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
    return '';
  }
}

/**
 * /workflows/generateSummaries: Generates or looks up summaries for story, chapters, pages,
 * and paragraphs according to the strict thresholds and reconciliation rules in processing.md.
 */
export async function generateSummaries(story: Story): Promise<Story> {
  if (!story || !story.chapters) return story;

  // 1. Story summary reconciliation (Threshold > 1500 words, max 400 words)
  const fullStoryText = story.story_text || '';
  if (fullStoryText) {
    const storyDigest = story.story_digest || generateTextDigest(fullStoryText);
    story.story_digest = storyDigest;
    const storySumm = await getOrGenerateSummary(fullStoryText, {
      digest: storyDigest,
      minThresholdWords: 1500,
      maxWords: 400,
      contextType: 'story'
    });
    story.story_summary = storySumm;
  }

  // 2. Chapters & Pages summary reconciliation
  for (const chapter of story.chapters) {
    const chapText = chapter.chapter_text || chapter.chapterText || '';
    if (chapText) {
      const chapDigest = chapter.chapter_digest || chapter.chapterDigest || generateTextDigest(chapText);
      chapter.chapter_digest = chapDigest;
      chapter.chapterDigest = chapDigest;

      // Threshold > 500 words, max 250 words
      const chapSumm = await getOrGenerateSummary(chapText, {
        digest: chapDigest,
        minThresholdWords: 500,
        maxWords: 250,
        contextType: 'chapter'
      });
      chapter.chapter_summary = chapSumm;
      chapter.chapterSummary = chapSumm;
    }

    for (const page of chapter.pages || []) {
      const pageText = page.page_text || page.pageText || '';
      if (pageText) {
        const pageDigest = page.page_digest || page.pageDigest || generateTextDigest(pageText);
        page.page_digest = pageDigest;
        page.pageDigest = pageDigest;

        // Threshold > 100 words, max 100 words
        const pageSumm = await getOrGenerateSummary(pageText, {
          digest: pageDigest,
          minThresholdWords: 100,
          maxWords: 100,
          contextType: 'page'
        });
        page.page_summary = pageSumm;
        page.pageSummary = pageSumm;
      }
    }
  }

  // 3. Narrative preceding context re-accumulation & paragraph summaries
  const precedingChaptersSummaries: string[] = [];

  for (const chapter of story.chapters) {
    const precedingPagesSummaries: string[] = [];

    for (const page of chapter.pages || []) {
      const pagePrecedingText = [...precedingChaptersSummaries, ...precedingPagesSummaries]
        .filter(Boolean)
        .join('\n\n')
        .trim();

      let pagePriorText = '';

      for (const paragraph of page.paragraphs || []) {
        const pText = paragraph.paragraph_text || paragraph.paragraphText || '';
        const priorText = pagePriorText;
        const precedingText = pagePrecedingText;
        const narrativeText = [precedingText, priorText].filter(Boolean).join('\n\n').trim();

        paragraph.preceding_text = precedingText;
        paragraph.precedingText = precedingText;
        paragraph.prior_text = priorText;
        paragraph.priorText = priorText;
        paragraph.narrative_text = narrativeText;
        paragraph.narrativeText = narrativeText;

        const narrativeDigest = generateTextDigest(narrativeText || pText);
        paragraph.narrative_digest = narrativeDigest;
        paragraph.narrativeDigest = narrativeDigest;

        // Threshold > 500 words for narrative compression
        const narrativeSumm = await getOrGenerateSummary(narrativeText, {
          digest: narrativeDigest,
          minThresholdWords: 500,
          maxWords: 150,
          contextType: 'narrative'
        });

        paragraph.narrative_summary = narrativeSumm;
        paragraph.narrativeSummary = narrativeSumm;

        pagePriorText = (pagePriorText ? `${pagePriorText}\n\n${pText}` : pText).trim();
      }

      // Add page summary (or uncompressed page text if no summary) to preceding context accumulator
      const pageSummaryContext = page.page_summary || page.page_text || '';
      if (pageSummaryContext) {
        precedingPagesSummaries.push(pageSummaryContext);
      }
    }

    // Add chapter summary (or uncompressed chapter text if no summary) to preceding context accumulator
    const chapterSummaryContext = chapter.chapter_summary || chapter.chapter_text || '';
    if (chapterSummaryContext) {
      precedingChaptersSummaries.push(chapterSummaryContext);
    }
  }

  // 4. Update Dexie tables (story, chapters, pages, paragraphs) with reconciled summaries
  try {
    const flatChapters: Chapter[] = [];
    const flatPages: Page[] = [];
    const flatParagraphs: Paragraph[] = [];

    for (const chapter of story.chapters || []) {
      const cNo = chapter.chapter_no ?? chapter.chapterNo ?? 0;
      flatChapters.push({
        chapter_no: cNo,
        chapterNo: cNo,
        story_id: 'main',
        storyId: 'main',
        chapter_title: chapter.chapter_title || chapter.chapterTitle || '',
        chapterTitle: chapter.chapter_title || chapter.chapterTitle || '',
        chapter_text: chapter.chapter_text || chapter.chapterText || '',
        chapterText: chapter.chapter_text || chapter.chapterText || '',
        chapter_summary: chapter.chapter_summary || chapter.chapterSummary || '',
        chapterSummary: chapter.chapter_summary || chapter.chapterSummary || '',
        chapter_digest: chapter.chapter_digest || chapter.chapterDigest || generateTextDigest(chapter.chapter_text || '')
      });

      for (const page of chapter.pages || []) {
        const pNo = page.page_no ?? page.pageNo ?? 0;
        flatPages.push({
          page_no: pNo,
          pageNo: pNo,
          chapter_no: cNo,
          chapterNo: cNo,
          page_title: page.page_title || page.pageTitle || '',
          pageTitle: page.page_title || page.pageTitle || '',
          page_text: page.page_text || page.pageText || '',
          pageText: page.page_text || page.pageText || '',
          page_summary: page.page_summary || page.pageSummary || '',
          pageSummary: page.page_summary || page.pageSummary || '',
          page_digest: page.page_digest || page.pageDigest || generateTextDigest(page.page_text || '')
        });

        for (const paragraph of page.paragraphs || []) {
          const paraNo = paragraph.paragraph_no ?? paragraph.paragraphNo ?? 0;
          flatParagraphs.push({
            paragraph_no: paraNo,
            paragraphNo: paraNo,
            chapter_no: cNo,
            chapterNo: cNo,
            page_no: pNo,
            pageNo: pNo,
            paragraph_text: paragraph.paragraph_text || paragraph.paragraphText || '',
            paragraphText: paragraph.paragraph_text || paragraph.paragraphText || '',
            prior_text: paragraph.prior_text || paragraph.priorText || '',
            priorText: paragraph.prior_text || paragraph.priorText || '',
            preceding_text: paragraph.preceding_text || paragraph.precedingText || '',
            precedingText: paragraph.preceding_text || paragraph.precedingText || '',
            narrative_text: paragraph.narrative_text || paragraph.narrativeText || '',
            narrativeText: paragraph.narrative_text || paragraph.narrativeText || '',
            narrative_summary: paragraph.narrative_summary || paragraph.narrativeSummary || '',
            narrativeSummary: paragraph.narrative_summary || paragraph.narrativeSummary || '',
            narrative_digest: paragraph.narrative_digest || paragraph.narrativeDigest || generateTextDigest(paragraph.narrative_text || '')
          });
        }
      }
    }

    await processDb.transaction('rw', [
      processDb.story,
      processDb.chapters,
      processDb.pages,
      processDb.paragraphs
    ], async () => {
      await processDb.story.put({ id: 'main', story_id: 'main', ...story });
      if (flatChapters.length > 0) await processDb.chapters.bulkPut(flatChapters);
      if (flatPages.length > 0) await processDb.pages.bulkPut(flatPages);
      if (flatParagraphs.length > 0) await processDb.paragraphs.bulkPut(flatParagraphs);
    });
  } catch (err) {
    console.warn('[generateSummaries] Failed persisting reconciled summaries to Dexie:', err);
  }

  return story;
}

