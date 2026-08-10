/**
 * Analyze Character Story User Prompt Template
 * Used by analyzeCharacterStory to construct the user payload containing character name, description, and story text.
 */
export const ANALYZE_CHARACTER_STORY_USER_PROMPT_TEMPLATE = `<character-name>{{CHARACTER_NAME}}</character-name>
<current-description>{{CURRENT_DESCRIPTION}}</current-description>
<story>
{{STORY_TEXT}}
</story>`;

export interface AnalyzeCharacterStoryUserPromptVariables {
  characterName: string;
  currentDescription?: string;
  storyText: string;
}

export function createAnalyzeCharacterStoryUserPrompt({
  characterName,
  currentDescription = '',
  storyText
}: AnalyzeCharacterStoryUserPromptVariables): string {
  return ANALYZE_CHARACTER_STORY_USER_PROMPT_TEMPLATE
    .replace('{{CHARACTER_NAME}}', characterName.trim())
    .replace('{{CURRENT_DESCRIPTION}}', currentDescription.trim())
    .replace('{{STORY_TEXT}}', storyText.trim());
}
