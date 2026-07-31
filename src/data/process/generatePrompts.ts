import { writeFile } from "@/data/storage/fileStorage";
import generateTextDigest from "@/data/utilities/generateTextDigest";

const PROMPT = `
# Role
You are an illustrator for a book.
Please draw an illustration for the scene-text bellow.
The narrative-text lays out the story before the current scene, and the scene-text is the current scene.


## Drawing Instructions

When creating a drawing please use these instructions in image creation.

<instructions-text>
{{STYLE-TEXT}}
</instructions-text>

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

    for (let index = 0; index < panels.length; index++) {
        const item = panels[index];
        const sceneText = item.sceneText || item.text || "";

        const pages = publication.pages || [];
        const chapters = publication.chapters || [];

        const currentPageIndex = pages.findIndex(
            (pg: any) => pg.chapterNo === item.chapterNo && pg.pageNo === item.pageNo
        );
        const prevPage = currentPageIndex > 0 ? pages[currentPageIndex - 1] : null;
        const pageText = prevPage ? (prevPage.summary ?? prevPage.text ?? "") : "";

        const currentChapterIndex = chapters.findIndex(
            (ch: any) => ch.chapterNo === item.chapterNo
        );
        const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
        const chapterText = prevChapter ? (prevChapter.summary ?? prevChapter.text ?? "") : "";

        const predicateText = (publication.predicates?.[index]?.text) ?? "";

        // Combine narrative texts, filtered to exclude empty values
        const narrativeParts = [chapterText, pageText, predicateText].filter(Boolean);
        const narrativeText = item.narrativeText || narrativeParts.join("\n");

        const styleText = Array.isArray(publication.style?.drawingInstructions)
            ? publication.style.drawingInstructions.join('\n')
            : (publication.style?.drawingInstructions ?? "");

        const promptText = PROMPT
            .replace("{{STYLE-TEXT}}", styleText)
            .replace("{{SCENE-TEXT}}", sceneText)
            .replace("{{NARRATIVE-TEXT}}", narrativeText);

        const digestSource = [sceneText, narrativeText, styleText].filter(Boolean).join("\n\n");
        const digest = generateTextDigest(digestSource);

        // Save prompt text to file
        const fileName = `prompts/${digest}.txt`;
        await writeFile(fileName, promptText);

        item.sceneText = sceneText;
        item.narrativeText = narrativeText;
        item.instructionsText = styleText;
        item.digest = digest;

        const promptObj: any = {
            paragraphIndex: index,
            paragraphNo: item.panelNo ?? item.paragraphNo ?? 0,
            pageNo: item.pageNo ?? 0,
            chapterNo: item.chapterNo ?? 0,
            sceneText,
            narrativeText,
            instructionsText: styleText,
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