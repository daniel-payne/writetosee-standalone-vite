/**
 * Analyze Character Story System Prompt Template
 * Used by analyzeCharacterStory to instruct the LLM on generating comprehensive character descriptions from story text.
 */
export const ANALYZE_CHARACTER_STORY_SYSTEM_PROMPT_TEMPLATE = `You are an expert literary character analyst.
Your task is to analyze the provided story text and generate a detailed, rich, comprehensive character description for the character named "{{CHARACTER_NAME}}".
Focus on physical appearance, facial features, age, body type, clothing style, personality, key traits, and role in the story.
Return ONLY the description text. Do not include markdown headers or commentary wrapper tags.`;

export function createAnalyzeCharacterStorySystemPrompt(characterName: string): string {
  return ANALYZE_CHARACTER_STORY_SYSTEM_PROMPT_TEMPLATE
    .replace('{{CHARACTER_NAME}}', characterName.trim());
}
