/**
 * Analyze Character Image User Prompt Template
 * Used by analyzeCharacterImage to prompt the vision LLM for drawing instructions of a given character.
 */
export const ANALYZE_CHARACTER_IMAGE_USER_PROMPT_TEMPLATE = `
Analyze the character picture for "{{CHARACTER_NAME}}" and provide detailed drawing instructions.
`;

export function createAnalyzeCharacterImageUserPrompt(characterName: string): string {
  return ANALYZE_CHARACTER_IMAGE_USER_PROMPT_TEMPLATE
    .replace('{{CHARACTER_NAME}}', characterName.trim());
}
