import { writeFile } from "@/data/storage/fileStorage";
import generateTextDigest from "@/data/process/generate/generateTextDigest";
import { parseCharactersMarkdown } from "@/data/process/manageCharacters";

const PROMPT = `
# Role
You are an illustrator for a book.
Please draw an illustration for the scene-text bellow.
The narrative-text lays out the story before the current scene, and the scene-text is the current scene.


## Drawing Instructions
Here are the drawing instructions, and any additional cinematographic instructions for setting the scene.

<style-text>
{{STYLE-TEXT}}
</style-text>

<cinematographic-text>
{{CINEMATOGRAPHIC-TEXT}}
</cinematographic-text>

## Character Instructions

The scene contains the following characters, please use these instructions when drawing the scene:

<character-text>
{{CHARACTER-TEXT}}
</character-text>

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

## Scene Instructions

<scene-text>
{{SCENE-TEXT}}
</scene-text>

<narrative-text>
{{NARRATIVE-TEXT}}
</narrative-text>
`;

export default async function generatePrompts(publication: any) {
    const panels = publication.panels || publication.paragraphs || [];
    const result: any[] = [];

    const rawCharacters = publication.characters || "";
    const allCharacters = parseCharactersMarkdown(rawCharacters);

    for (let index = 0; index < panels.length; index++) {
        const item = panels[index];
        const sceneText = item.sceneText || item.text || "";

        const chapters = publication.chapters || [];
        const pages = publication.pages || [];

        const narrativeParts: string[] = [];

        // 1. Collect summaries/text for all prior chapters before current item's chapterNo
        if (chapters.length > 0 && item.chapterNo != null) {
            const priorChapters = chapters.filter((ch: any) => ch.chapterNo < item.chapterNo);
            for (const ch of priorChapters) {
                const text = ch.chapterSummary || ch.summary || ch.chapterText || ch.text || "";
                if (text) narrativeParts.push(text);
            }
        }

        // 2. Collect summaries/text for all prior pages before current item's pageNo
        if (pages.length > 0 && item.pageNo != null) {
            const priorPages = pages.filter((pg: any) =>
                pg.chapterNo === item.chapterNo ? pg.pageNo < item.pageNo : pg.chapterNo < item.chapterNo
            );
            for (const pg of priorPages) {
                const text = pg.pageSummary || pg.summary || pg.pageText || pg.text || "";
                if (text) narrativeParts.push(text);
            }
        }

        // 3. Collect priorText (text of all prior paragraphs/panels before this panel index)
        const priorParagraphTexts: string[] = [];
        for (let pIdx = 0; pIdx < index; pIdx++) {
            const prevPanel = panels[pIdx];
            const prevText = prevPanel.sceneText || prevPanel.text || "";
            if (prevText) {
                priorParagraphTexts.push(prevText);
            }
        }

        if (priorParagraphTexts.length > 0) {
            if (narrativeParts.length === 0) {
                narrativeParts.push(priorParagraphTexts.join("\n\n"));
            } else {
                const samePagePriorParagraphs: string[] = [];
                for (let pIdx = 0; pIdx < index; pIdx++) {
                    const prevPanel = panels[pIdx];
                    if (prevPanel.chapterNo === item.chapterNo && prevPanel.pageNo === item.pageNo) {
                        const prevText = prevPanel.sceneText || prevPanel.text || "";
                        if (prevText) samePagePriorParagraphs.push(prevText);
                    }
                }
                if (samePagePriorParagraphs.length > 0) {
                    narrativeParts.push(samePagePriorParagraphs.join("\n\n"));
                }
            }
        }

        const calculatedNarrativeText = narrativeParts.filter(Boolean).join("\n\n");
        const narrativeText = item.narrativeText || calculatedNarrativeText;

        const styleText = Array.isArray(publication.style?.drawingInstructions)
            ? publication.style.drawingInstructions.join('\n')
            : (publication.style?.drawingInstructions ?? "");

        const cinematographicText = item.cinematographicText || "";

        // Build character text for selected characters in this panel
        const assignedCharNames: string[] = item.characters || [];
        const charTextParts: string[] = [];

        for (const charName of assignedCharNames) {
            const matchedChar = allCharacters.find(
                c => c.name.trim().toLowerCase() === charName.trim().toLowerCase()
            );
            if (matchedChar) {
                const details = matchedChar.instructions || matchedChar.description || "";
                if (details) {
                    charTextParts.push(`Character: ${matchedChar.name}\n${details}`);
                } else {
                    charTextParts.push(`Character: ${matchedChar.name}`);
                }
            } else {
                charTextParts.push(`Character: ${charName}`);
            }
        }

        const characterText = charTextParts.join("\n\n");

        const promptText = PROMPT
            .replace("{{STYLE-TEXT}}", styleText)
            .replace("{{CINEMATOGRAPHIC-TEXT}}", cinematographicText)
            .replace("{{CHARACTER-TEXT}}", characterText)
            .replace("{{SCENE-TEXT}}", sceneText)
            .replace("{{NARRATIVE-TEXT}}", narrativeText);

        const digestSource = [sceneText, narrativeText, styleText, cinematographicText, characterText].filter(Boolean).join("\n\n");
        const digest = generateTextDigest(digestSource);

        const previousDigest = item.digest;
        const promptDigestChanged = previousDigest && previousDigest !== digest;

        // If the prompt digest changed (due to instructions, scene text, or style changes) and panel is not locked, mark for image recreation
        if (promptDigestChanged && !item.isLocked) {
            item.needsRegenerate = true;
            delete item.image;
            delete item.imageUrl;
            item.images = [];
            item.imageStatus = 'pending';
        }

        // Save prompt text to file
        const fileName = `prompts/${digest}.txt`;
        await writeFile(fileName, promptText);

        item.sceneText = sceneText;
        item.narrativeText = narrativeText;
        item.instructionsText = styleText;
        item.cinematographicText = cinematographicText;
        item.characterText = characterText;
        item.digest = digest;

        const promptObj: any = {
            paragraphIndex: index,
            paragraphNo: item.panelNo ?? item.paragraphNo ?? 0,
            pageNo: item.pageNo ?? 0,
            chapterNo: item.chapterNo ?? 0,
            sceneText,
            narrativeText,
            instructionsText: styleText,
            cinematographicText,
            characterText,
            text: promptText,
            digest: digest
        };

        if (item.needsRegenerate) {
            promptObj.needsRegenerate = true;
        }

        result.push(promptObj);
    }

    publication.prompts = result;

    return result;
}