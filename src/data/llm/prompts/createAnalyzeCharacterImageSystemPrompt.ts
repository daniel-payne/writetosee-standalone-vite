/**
 * Analyze Character Image System Prompt Template
 * Used by analyzeCharacterImage to instruct the vision LLM on deriving drawing instructions for a character.
 */
export const ANALYZE_CHARACTER_IMAGE_SYSTEM_PROMPT_TEMPLATE = `
# Role
You are an expert visual artist and character illustrator.
Analyze the provided image of the character "{{CHARACTER_NAME}}".
Generate precise, highly detailed step-by-step drawing instructions to ensure consistent visual depiction of this character across multiple illustrated scenes.

Guidelines:
1. Cover: Art medium/style, body proportions, facial structure & features, eye shape & exact color, hair texture/length/color, outfit & clothing materials, color palette, lighting/shadowing, and signature visual attributes.
2. Provide exact visual descriptors (e.g. "shoulder-length wavy chestnut hair", "almond-shaped hazel eyes", "dark charcoal linen vest over a cream collared shirt").
3. Return ONLY the drawing instructions text. Do NOT include markdown headers, bullet lists, or wrapper commentary.
`;

export function createAnalyzeCharacterImageSystemPrompt(characterName: string): string {
  return ANALYZE_CHARACTER_IMAGE_SYSTEM_PROMPT_TEMPLATE
    .replace('{{CHARACTER_NAME}}', characterName.trim());
}
