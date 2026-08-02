import { listFiles, writeFile } from "@/data/storage/fileStorage";
import { storeCost } from "@/data/storage/costStorage";
import llmGenerateImage from "@/data/llm/llmGenerateImage";
import { savePublication } from "@/data/process/managePublication";
import { writeLog } from "@/data/storage/logStorage";

// Helper to convert base64 Data URL to Blob
function dataURLtoBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

export default async function generateImages(publication: any) {
    const prompts = publication.prompts || [];
    const panels = publication.panels || [];
    const costs: number[] = [];
    let initialChanged = false;

    // Query existing files in storage once
    const existingFiles = await listFiles().catch(() => []);
    const existingSet = new Set(existingFiles);

    // Link existing images and set status to completed, otherwise set status to pending/failed
    for (const prompt of prompts) {
        const digest = prompt.digest;
        if (!digest) continue;

        const panelIndex = prompt.paragraphIndex ?? prompt.panelIndex;
        const panel = panelIndex != null ? panels[panelIndex] : null;
        const isRegenerateRequested = prompt.needsRegenerate || panel?.needsRegenerate;

        const matchingImages = Array.from(existingSet).filter(
            (filePath: string) => filePath.startsWith(`images/${digest}.png`) || filePath.startsWith(`images/${digest}_`)
        );
        matchingImages.sort((a, b) => {
            const tsA = parseInt(a.split('_').pop()?.replace(/\.\w+$/, '') || '0', 10);
            const tsB = parseInt(b.split('_').pop()?.replace(/\.\w+$/, '') || '0', 10);
            return (isNaN(tsA) ? 0 : tsA) - (isNaN(tsB) ? 0 : tsB);
        });
        const exists = matchingImages.length > 0;

        const expectedStatus = isRegenerateRequested
            ? 'pending'
            : (exists ? 'completed' : (prompt.error ? 'failed' : 'pending'));

        prompt.imageStatus = expectedStatus;

        if (exists) {
            if (!isRegenerateRequested) {
                const selectedImage = panel && panel.image && matchingImages.includes(panel.image)
                    ? panel.image
                    : matchingImages[matchingImages.length - 1];

                if (prompt.image !== selectedImage || prompt.imageUrl !== selectedImage) {
                    prompt.image = selectedImage;
                    prompt.imageUrl = selectedImage;
                    initialChanged = true;
                }
                delete prompt.error;

                if (panel) {
                    if (panel.image !== selectedImage || panel.imageUrl !== selectedImage) {
                        panel.image = selectedImage;
                        panel.imageUrl = selectedImage;
                        initialChanged = true;
                    }
                    delete panel.error;
                }
            } else {
                delete prompt.image;
                delete prompt.imageUrl;
                if (panel) {
                    delete panel.image;
                    delete panel.imageUrl;
                }
            }
        } else {
            delete prompt.image;
            delete prompt.imageUrl;
            if (panel) {
                delete panel.image;
                delete panel.imageUrl;
            }
        }

        if (panel) {
            panel.imageStatus = expectedStatus;
            if (!panel.images) {
                panel.images = [];
            }
            for (const imgFile of matchingImages) {
                if (!panel.images.includes(imgFile)) {
                    panel.images.push(imgFile);
                    initialChanged = true;
                }
            }
            if (expectedStatus === 'failed') {
                if (prompt.error) {
                    panel.error = prompt.error;
                }
            }
        }
    }

    if (initialChanged) {
        await savePublication(publication);
        if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
            self.postMessage({ type: 'PROGRESS' });
        }
    }

    // Check if any prompts actually require generation (i.e. prompt has no image set or regenerate is requested)
    const needsGenerationPrompts = prompts.filter((prompt: any) => {
        const digest = prompt.digest;
        const panelIndex = prompt.paragraphIndex ?? prompt.panelIndex;
        const panel = panelIndex != null ? panels[panelIndex] : null;
        const isRegenerateRequested = prompt.needsRegenerate || panel?.needsRegenerate;
        return digest && (isRegenerateRequested || !prompt.image || !existingSet.has(prompt.image));
    });

    if (needsGenerationPrompts.length === 0) {
        const failedAny = prompts.some((p: any) => p.imageStatus === 'failed');
        publication.imageGenerationStatus = failedAny ? 'failed' : 'completed';
        await savePublication(publication);
        if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
            self.postMessage({ type: 'PROGRESS' });
        }
        return;
    }

    // Update overall image generation status to generating
    publication.imageGenerationStatus = 'generating';
    await savePublication(publication);
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({ type: 'PROGRESS' });
    }

    // Serialized save queue to sequence disk writes and avoid race conditions
    let saveQueue = Promise.resolve();
    const queueSave = () => {
        saveQueue = saveQueue.then(async () => {
            await savePublication(publication);
            if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
                self.postMessage({ type: 'PROGRESS' });
            }
        }).catch(err => {
            console.error("Serialized publication save failed:", err);
        });
        return saveQueue;
    };

    const doGenerationWork = async () => {
        const BATCH_SIZE = 10;

        for (let i = 0; i < needsGenerationPrompts.length; i += BATCH_SIZE) {
            const batch = needsGenerationPrompts.slice(i, i + BATCH_SIZE);

            // Run batch in parallel
            await Promise.all(batch.map(async (prompt: any) => {
                const digest = prompt.digest;
                const panelIndex = prompt.paragraphIndex ?? prompt.panelIndex;
                const panel = panelIndex != null ? panels[panelIndex] : null;
                const isRegenerateRequested = prompt.needsRegenerate || panel?.needsRegenerate;
                let currentImage = isRegenerateRequested ? null : (prompt.image || panel?.image);
                let exists = currentImage ? existingSet.has(currentImage) : false;

                if (!exists) {
                    try {
                        await writeLog('info', 'generateImages', `Starting image generation for panel ${panelIndex ?? 0} (digest: ${digest})`);

                        // Update status to generating in memory and queue the disk save
                        prompt.imageStatus = 'generating';
                        delete prompt.error;
                        delete prompt.needsRegenerate;
                        if (panel) {
                            panel.imageStatus = 'generating';
                            delete panel.error;
                            delete panel.needsRegenerate;
                        }
                        queueSave();

                        // Create unique image filename for new generation
                        const timestamp = Date.now();
                        const newImagePath = `images/${digest}_${timestamp}.png`;

                        // Call llmGenerateImage with prompt text
                        const res = await llmGenerateImage(prompt.text);

                        if (res?.content) {
                            // Convert base64 data URL to Blob and write to disk
                            const blob = dataURLtoBlob(res.content);
                            // Write binary image to file
                            await writeFile(newImagePath, blob);
                            existingSet.add(newImagePath);

                            // Mark as completed in memory and queue disk save
                            prompt.imageStatus = 'completed';
                            prompt.image = newImagePath;
                            prompt.imageUrl = newImagePath;
                            if (panel) {
                                panel.imageStatus = 'completed';
                                panel.image = newImagePath;
                                panel.imageUrl = newImagePath;
                                if (!panel.images) {
                                    panel.images = [];
                                }
                                if (!panel.images.includes(newImagePath)) {
                                    panel.images.push(newImagePath);
                                }
                                panel.currentImageIndex = panel.images.indexOf(newImagePath);
                            }
                            await writeLog('info', 'generateImages', `Successfully generated image for panel ${panelIndex ?? 0} saved to ${newImagePath}`);
                            queueSave();
                        } else {
                            throw new Error("No image data returned from provider");
                        }

                        if (res?.totalCost != null) {
                            costs.push(res.totalCost);
                        }
                    } catch (err: any) {
                        const errorMsg = err instanceof Error ? err.message : String(err);
                        await writeLog('error', 'generateImages', `Failed to generate image for panel ${panelIndex ?? 0} (digest: ${digest}): ${errorMsg}`);

                        // Mark as failed in memory and queue disk save
                        prompt.imageStatus = 'failed';
                        prompt.error = errorMsg;
                        delete prompt.image;
                        delete prompt.imageUrl;
                        delete prompt.needsRegenerate;

                        if (panel) {
                            panel.imageStatus = 'failed';
                            panel.error = errorMsg;
                            delete panel.image;
                            delete panel.imageUrl;
                            delete panel.needsRegenerate;
                        }
                        queueSave();
                    }
                }
            }));
        }

        // Wait for all queued saves to finish before continuing
        await saveQueue;

        // Save cost records
        const validCosts = costs.filter((c): c is number => c !== null && c !== undefined);
        if (validCosts.length > 0) {
            await storeCost(validCosts, 'image');
        }

        // Final sync of overall status
        const failedAny = prompts.some((p: any) => p.imageStatus === 'failed');
        publication.imageGenerationStatus = failedAny ? 'failed' : 'completed';
        await savePublication(publication);
        if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
            self.postMessage({ type: 'PROGRESS' });
        }
    };

    if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
        await navigator.locks.request('image-generation', doGenerationWork);
    } else {
        await doGenerationWork();
    }

    return;
}