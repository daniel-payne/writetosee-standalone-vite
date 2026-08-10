import {
  BOOK_ILLUSTRATION_PROMPT_TEMPLATE,
  createBookIllustrationPrompt
} from '@/data/llm/prompts/createBookIllustrationPrompt';

export interface PromptComponents {
  styleText?: string;
  cinematographicText?: string;
  characterText?: string;
  sceneText?: string;
  narrativeText?: string;
}

export { BOOK_ILLUSTRATION_PROMPT_TEMPLATE };

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


