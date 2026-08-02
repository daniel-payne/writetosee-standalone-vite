import { loadPublication, savePublication, buildPanelsFromStory } from "@/data/process/managePublication";
import generatePrompts from "../../generate/generatePrompts";
import generateImages from "../../generate/generateImages";
import { writeLog } from "../../../storage/logStorage";
import { listFiles, readFile } from "../../../storage/fileStorage";

import { loadStory } from "../../manageStory";
import { loadStyle } from "../../manageStyle";

export default async function stepCoordinatePublication({ style, story }: { style?: Record<string, any>, story?: string } = {}) {
    // Load current publication state from disk or in-memory cache
    const publication = await loadPublication();

    if (!story || story.trim() === '') {
        story = await loadStory().catch(() => "");
    }
    publication.story = story;

    if (!style || Object.keys(style).length === 0) {
        style = await loadStyle().catch(() => ({}));
    }
    publication.style = style;

    const styleInstructions = Array.isArray(style?.drawingInstructions)
        ? style.drawingInstructions.join('\n\n')
        : (style?.drawingInstructions || "");
    publication.styleText = styleInstructions;

    publication.characters = await readFile('characters.md').then(f => f.text()).catch(() => "");
    publication.instructionsText = await readFile('instructions.md').then(f => f.text()).catch(() => "");

    await writeLog('info', 'processPublicationImpl', 'Started processing publication panels');

    // 1. story + style => panels
    const existingPanelsMap = new Map((publication.panels || []).map((p: any) => [p.digest || p.text, p]));
    const newPanels = buildPanelsFromStory(story, style);

    publication.panels = newPanels.map((np: any) => {
        const existingByDigest: any = existingPanelsMap.get(np.digest);
        const existingByText: any = existingPanelsMap.get(np.text);
        const existing = existingByDigest || existingByText;

        if (existing) {
            const digestMatches = existing.digest === np.digest;
            if (digestMatches) {
                const imagesList = existing.images || (existing.image ? [existing.image] : []);
                const hasImage = imagesList.length > 0 && Boolean(existing.image || imagesList[0]);
                return {
                    ...np,
                    images: imagesList,
                    image: existing.image || imagesList[0] || "",
                    currentImageIndex: existing.currentImageIndex ?? 0,
                    imageStatus: existing.imageStatus && existing.imageStatus !== 'completed'
                        ? existing.imageStatus
                        : (hasImage ? 'completed' : (existing.error ? 'failed' : 'pending')),
                    error: existing.error
                };
            } else {
                // Style or text changed (digest mismatch): mark panel to regenerate image under the new style
                return {
                    ...np,
                    images: [],
                    image: "",
                    currentImageIndex: 0,
                    imageStatus: "pending",
                    needsRegenerate: true
                };
            }
        }
        return {
            ...np,
            needsRegenerate: true
        };
    });

    await savePublication(publication);
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({ type: 'PROGRESS' });
    }

    // 2. panels => prompts
    await generatePrompts(publication);

    // Initial check of image file statuses so the UI receives status data instantly
    const prompts = publication.prompts || [];
    const panels = publication.panels || [];
    const existingFiles = await listFiles().catch(() => []);
    const existingSet = new Set(existingFiles);

    for (const prompt of prompts) {
        const digest = prompt.digest;
        if (!digest) continue;

        const panelIndex = prompt.paragraphIndex ?? prompt.panelIndex;
        const panel = panelIndex != null ? panels[panelIndex] : null;

        const matchingImages = Array.from(existingSet).filter(
            (filePath: string) => filePath.startsWith(`images/${digest}.png`) || filePath.startsWith(`images/${digest}_`)
        );
        matchingImages.sort((a, b) => {
            const tsA = parseInt(a.split('_').pop()?.replace(/\.\w+$/, '') || '0', 10);
            const tsB = parseInt(b.split('_').pop()?.replace(/\.\w+$/, '') || '0', 10);
            return (isNaN(tsA) ? 0 : tsA) - (isNaN(tsB) ? 0 : tsB);
        });
        const exists = matchingImages.length > 0;
        const selectedImage = exists ? matchingImages[matchingImages.length - 1] : "";

        const expectedStatus = exists ? 'completed' : (prompt.error || (panel && panel.error) ? 'failed' : 'pending');
        prompt.imageStatus = expectedStatus;

        if (exists) {
            prompt.image = selectedImage;
            prompt.imageUrl = selectedImage;
            delete prompt.error;
        } else {
            delete prompt.image;
            delete prompt.imageUrl;
            if (panel && panel.error) {
                prompt.error = panel.error;
            }
        }

        if (panel) {
            panel.imageStatus = expectedStatus;
            if (exists) {
                panel.image = selectedImage;
                panel.imageUrl = selectedImage;
                if (!panel.images) panel.images = [];
                matchingImages.forEach(img => {
                    if (!panel.images.includes(img)) panel.images.push(img);
                });
                delete panel.error;
            } else {
                delete panel.image;
                delete panel.imageUrl;
                if (prompt.error) {
                    panel.error = prompt.error;
                }
            }
        }
    }

    const failedAny = prompts.some((p: any) => p.imageStatus === 'failed');
    const pendingAny = prompts.some((p: any) => p.imageStatus === 'pending');
    publication.imageGenerationStatus = pendingAny ? 'pending' : (failedAny ? 'failed' : 'completed');

    await savePublication(publication);
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({ type: 'PROGRESS' });
    }

    await writeLog('info', 'processPublicationImpl', 'Finished processing publication panels');

    return publication;
}

export async function processImageGenerationImpl() {
    await writeLog('info', 'processImageGenerationImpl', 'Started background image generation');

    // Load publication from disk
    const publication = await loadPublication();

    try {
        await generateImages(publication);
    } catch (err) {
        await writeLog('error', 'processImageGenerationImpl', "Failed to run image generation: " + err);
    }

    await writeLog('info', 'processImageGenerationImpl', 'Finished background image generation');

    return publication;
}
