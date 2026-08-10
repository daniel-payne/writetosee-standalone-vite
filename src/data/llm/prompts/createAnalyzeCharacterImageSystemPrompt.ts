/**
 * Analyze Character Image System Prompt Template
 * Used by analyzeCharacterImage to instruct the vision LLM on deriving drawing instructions for a character.
 */
export const ANALYZE_CHARACTER_IMAGE_SYSTEM_PROMPT_TEMPLATE = `You are an expert visual artist and character illustrator.
Analyze the provided image of the character "{{CHARACTER_NAME}}".
Generate precise, highly detailed step-by-step drawing instructions for illustrating this character.
Cover: art style, body proportions, facial structure & features, eye shape/color, hair style/color, outfit & clothing details, color palette, lighting/shadowing, and key visual attributes.
Return ONLY the drawing instructions text. Do not include markdown headers or wrapper commentary.`;

export function createAnalyzeCharacterImageSystemPrompt(characterName: string): string {
  return ANALYZE_CHARACTER_IMAGE_SYSTEM_PROMPT_TEMPLATE
    .replace('{{CHARACTER_NAME}}', characterName.trim());
}
