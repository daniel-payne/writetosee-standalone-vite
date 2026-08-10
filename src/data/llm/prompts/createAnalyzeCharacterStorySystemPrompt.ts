/**
 * Analyze Character Story System Prompt Template
 * Used by analyzeCharacterStory to instruct the LLM on generating comprehensive character descriptions from story text.
 */
export const ANALYZE_CHARACTER_STORY_SYSTEM_PROMPT_TEMPLATE = `
# Role
You are an expert literary character analyst.
Your task is to analyze the provided story text and generate a detailed, rich, comprehensive character description for the character named "{{CHARACTER_NAME}}".

Guidelines:
1. Synthesize existing description details with newly discovered story context.
2. Focus on concrete visual attributes: physical build, facial features, skin tone, eye color/shape, hair style/color, estimated age, signature wardrobe/accessories, and characteristic postures.
3. Highlight key personality traits, emotional disposition, and their narrative role in the story.
4. Return ONLY the description text. Do not include markdown headers, bullet lists, or commentary wrapper tags.
`;

export function createAnalyzeCharacterStorySystemPrompt(characterName: string): string {
  return ANALYZE_CHARACTER_STORY_SYSTEM_PROMPT_TEMPLATE
    .replace('{{CHARACTER_NAME}}', characterName.trim());
}
