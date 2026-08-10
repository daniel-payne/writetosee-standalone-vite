/**
 * Style Reference User Prompt Template
 * Used by generateStyleReference to prompt the vision LLM for style analysis sentences.
 */
export const STYLE_REFERENCE_USER_PROMPT_TEMPLATE = `Analyze this image and produce 5 to 8 detailed drawing instruction sentences, with each sentence on a new line. Focus on the art style, colors, lighting, medium, shapes, and character design.`;

export function createStyleReferenceUserPrompt(): string {
  return STYLE_REFERENCE_USER_PROMPT_TEMPLATE;
}
