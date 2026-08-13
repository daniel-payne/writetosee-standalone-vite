import {
  BOOK_ILLUSTRATION_PROMPT_TEMPLATE,
  createBookIllustrationPrompt,
  parseBookIllustrationPrompt,
  type BookIllustrationPromptVariables
} from '@/data/llm/prompts/createBookIllustrationPrompt';

export interface PromptComponents extends BookIllustrationPromptVariables {}

export { BOOK_ILLUSTRATION_PROMPT_TEMPLATE, parseBookIllustrationPrompt };

/**
 * Compiles the complete 5-segment prompt using the standard book illustration prompt template.
 */
export function compilePrompt({
  styleText = '',
  cinematographicText = '',
  characterText = '',
  sceneText = '',
  narrativeText = ''
}: PromptComponents): string {
  return createBookIllustrationPrompt({
    styleText,
    cinematographicText,
    characterText,
    sceneText,
    narrativeText
  });
}


