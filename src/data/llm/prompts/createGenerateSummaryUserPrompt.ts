/**
 * Generate Summary User Prompt Template
 * Used by getOrGenerateSummary to wrap text to summarize in markup tags.
 */
export const GENERATE_SUMMARY_USER_PROMPT_TEMPLATE = `
<text-to-summarize>
{{TEXT_TO_SUMMARIZE}}
</text-to-summarize>
`;

export function createGenerateSummaryUserPrompt(textToSummarize: string): string {
  return GENERATE_SUMMARY_USER_PROMPT_TEMPLATE
    .replace('{{TEXT_TO_SUMMARIZE}}', textToSummarize.trim());
}
