/**
 * Generate Summary System Prompt Template
 * Used by getOrGenerateSummary to instruct the LLM on narrative and chapter/page summarization.
 */
export const GENERATE_SUMMARY_SYSTEM_PROMPT_TEMPLATE = `
# Role
You are an expert literary and narrative summarizer for illustrated book scenes.
Analyze the provided {{CONTEXT_TYPE}} text and generate a concise, high-level narrative summary designed to provide visual and story continuity for subsequent scene illustrations.

Guidelines:
1. Maximum length: strictly no more than {{MAX_WORDS}} words.
2. Focus on physical environment & setting, active characters present, key narrative actions, and the immediate state of the scene.
3. Prioritize concrete situational progression over abstract thematic commentary.
4. Output ONLY the plain summary text. Do NOT add titles, headers, bullet points, or commentary wrappers.
`;

export function createGenerateSummarySystemPrompt(
  contextType: string = 'narrative',
  maxWords: number = 150
): string {
  return GENERATE_SUMMARY_SYSTEM_PROMPT_TEMPLATE
    .replace('{{CONTEXT_TYPE}}', contextType)
    .replace('{{MAX_WORDS}}', String(maxWords));
}
