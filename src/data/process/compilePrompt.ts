export interface PromptComponents {
  styleText?: string;
  cinematographicText?: string;
  characterText?: string;
  sceneText?: string;
  narrativeText?: string;
}

/**
 * Standard book illustration prompt template as specified in processing.md
 */
export const BOOK_ILLUSTRATION_PROMPT_TEMPLATE = `# Role
You are an illustrator for a book.
Please draw an illustration for the scene-text bellow.
The narrative-text lays out the story before the current scene, and the scene-text is the current scene.


## Drawing Instructions
The following style text describes how you should draw, and the target for the drawing.
There might also be some cinematographic instructions for the drawing.

<style-text>
{{STYLE_TEXT}}
</style-text>

### Strict Rules
1. A wide-angle, edge-to-edge scene that completely fills 100% of the image space from corner to corner.
2. The camera is pulled back so the environment extends fully to the very edges of the rectangular canvas.
3. Keep the background in focus, and of the same style as the foreground object.
4. Do not illustrate any words, signs, or speech bubbles unless specifically asked for in the text.
5. Do not make any illustration with rounded edges; the completed illustration should be a rectangle.
6. Do not draw any frame, boundary, or any decoration around the image.
7. Do not draw any text in the image.
8. Do not use copyright symbols (©, ™, ®) or any other markings in the illustration.

### Output Format
1. The illustration is to fill the complete drawing area.
2. Do not make any illustration with rounded edges; the completed illustration should be a rectangle.
3. Do not draw any frame, boundary, or any decoration around the image (i.e., fameless, full-bleed, no white margins, edge-to-edge environment). 
4. Keep the background in focus and of the same style as the foreground. Do not make the background blurry or out of focus. The background should be as detailed as the foreground.
5. Do not draw any text in the image. 
6. Do not use copyright symbols (©, ™, ®) or any other markings in the illustration.

<cinematographic-text>
{{CINEMATOGRAPHIC_TEXT}}
</cinematographic-text>

## Character Instructions

The scene contains the following characters, please use these instructions when drawing the scene:

<character-text>
{{CHARACTER_TEXT}}
</character-text>

## Scene Instructions
Please draw the scene described bellow. The narrative text is there to give you an indication of how the story lead to this scene.
**CRITICAL**: Illustrate ONLY the <scene-text>. Do NOT illustrate the <narrative-text>, which is provided strictly for background context.

<narrative-text>
{{NARRATIVE_TEXT}}
</narrative-text>

<scene-text>
{{SCENE_TEXT}}
</scene-text>`;

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
  const cleanStyle = styleText.trim();
  const cleanCinematographic = cinematographicText.trim();
  const cleanCharacter = characterText.trim();
  const cleanScene = sceneText.trim();
  const cleanNarrative = narrativeText.trim();

  const prompt = BOOK_ILLUSTRATION_PROMPT_TEMPLATE
    .replace('{{STYLE_TEXT}}', cleanStyle)
    .replace('{{CINEMATOGRAPHIC_TEXT}}', cleanCinematographic)
    .replace('{{CHARACTER_TEXT}}', cleanCharacter)
    .replace('{{SCENE_TEXT}}', cleanScene)
    .replace('{{NARRATIVE_TEXT}}', cleanNarrative);

  return prompt.trim();
}

