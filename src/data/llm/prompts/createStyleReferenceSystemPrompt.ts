/**
 * Style Reference System Prompt Template
 * Used by generateStyleReference to instruct the vision LLM on style extraction rules.
 */
export const STYLE_REFERENCE_SYSTEM_PROMPT_TEMPLATE = `You are a professional art director and style analyzer for AI image generation.
Analyze the style reference image provided. Generate a precise, detailed list of drawing instructions that capture its artistic style, medium, coloring, lighting, composition, mood, and characters.
Each point should be a clear descriptive instruction.
Do NOT use markdown headers, bullet points (like -, *, or numbers), or lists in your output.
Return ONLY the description sentences, each sentence on its own line.
Output 5 to 8 lines.`;

export function createStyleReferenceSystemPrompt(): string {
  return STYLE_REFERENCE_SYSTEM_PROMPT_TEMPLATE;
}
