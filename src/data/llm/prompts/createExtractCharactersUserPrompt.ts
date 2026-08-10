/**
 * Extract Characters User Prompt Template
 * Used by generateCharacters to wrap the story text with story tags.
 */
export const EXTRACT_CHARACTERS_USER_PROMPT_TEMPLATE = `
<story>
{{STORY_TEXT}}
</story>`;

export interface ExtractCharactersUserPromptVariables {
  storyText: string;
}

export function createExtractCharactersUserPrompt({
  storyText
}: ExtractCharactersUserPromptVariables): string {
  return EXTRACT_CHARACTERS_USER_PROMPT_TEMPLATE
    .replace('{{STORY_TEXT}}', storyText.trim());
}
