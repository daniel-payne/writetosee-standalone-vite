import { listFiles, writeFile } from "@/data/storage/fileStorage";
import { storeCost } from "@/data/storage/costStorage";
import llmGenerateImage from "@/data/llm/llmGenerateImage";
import { savePublication } from "@/data/managePublication";
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
    const paragraphs = publication.paragraphs || [];
    const costs: number[] = [];
    let initialChanged = false;

    // Query existing files in storage once
    const existingFiles = await listFiles().catch(() => []);
    const existingSet = new Set(existingFiles);

    // Link existing images and set status to completed, otherwise set status to pending/failed
    for (const prompt of prompts) {
        const digest = prompt.digest;
        if (!digest) continue;

        const paragraph = prompt.paragraphIndex != null ? paragraphs[prompt.paragraphIndex] : null;
        const isRegenerateRequested = prompt.needsRegenerate || paragraph?.needsRegenerate;

        const matchingImages = Array.from(existingSet).filter(
            (filePath: string) => filePath.startsWith(`images/${digest}.png`) || filePath.startsWith(`images/${digest}_`)
        );
        const exists = matchingImages.length > 0;

        const expectedStatus = isRegenerateRequested
            ? 'pending'
            : (exists ? 'completed' : (prompt.error ? 'failed' : 'pending'));
        
        prompt.imageStatus = expectedStatus;

        if (exists) {
            if (!isRegenerateRequested) {
                const selectedImage = paragraph && paragraph.image && existingSet.has(paragraph.image)
                    ? paragraph.image
                    : matchingImages[matchingImages.length - 1];

                if (prompt.image !== selectedImage || prompt.imageUrl !== selectedImage) {
                    prompt.image = selectedImage;
                    prompt.imageUrl = selectedImage;
                    initialChanged = true;
                }
                delete prompt.error;

                if (paragraph) {
                    if (paragraph.image !== selectedImage || paragraph.imageUrl !== selectedImage) {
                        paragraph.image = selectedImage;
                        paragraph.imageUrl = selectedImage;
                        initialChanged = true;
                    }
                    delete paragraph.error;
                }
            } else {
                delete prompt.image;
                delete prompt.imageUrl;
                if (paragraph) {
                    delete paragraph.image;
                    delete paragraph.imageUrl;
                }
            }
        } else {
            delete prompt.image;
            delete prompt.imageUrl;
            if (paragraph) {
                delete paragraph.image;
                delete paragraph.imageUrl;
            }
        }

        if (paragraph) {
            paragraph.imageStatus = expectedStatus;
            if (!paragraph.images) {
                paragraph.images = [];
            }
            for (const imgFile of matchingImages) {
                if (!paragraph.images.includes(imgFile)) {
                    paragraph.images.push(imgFile);
                    initialChanged = true;
                }
            }
            if (expectedStatus === 'failed') {
                if (prompt.error) {
                    paragraph.error = prompt.error;
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
        const paragraph = prompt.paragraphIndex != null ? paragraphs[prompt.paragraphIndex] : null;
        const isRegenerateRequested = prompt.needsRegenerate || paragraph?.needsRegenerate;
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

    // Acquire lock using Web Locks API
    await navigator.locks.request('image-generation', async (_lock) => {
        const BATCH_SIZE = 10;
        
        for (let i = 0; i < needsGenerationPrompts.length; i += BATCH_SIZE) {
            const batch = needsGenerationPrompts.slice(i, i + BATCH_SIZE);
            
            // Run batch in parallel
            await Promise.all(batch.map(async (prompt: any) => {
                const digest = prompt.digest;
                const paragraph = prompt.paragraphIndex != null ? paragraphs[prompt.paragraphIndex] : null;
                const isRegenerateRequested = prompt.needsRegenerate || paragraph?.needsRegenerate;
                let currentImage = isRegenerateRequested ? null : (prompt.image || paragraph?.image);
                let exists = currentImage ? existingSet.has(currentImage) : false;

                if (!exists) {
                    try {
                        // Update status to generating in memory and queue the disk save
                        prompt.imageStatus = 'generating';
                        delete prompt.error;
                        delete prompt.needsRegenerate;
                        if (paragraph) {
                            paragraph.imageStatus = 'generating';
                            delete paragraph.error;
                            delete paragraph.needsRegenerate;
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
                            if (paragraph) {
                                paragraph.imageStatus = 'completed';
                                paragraph.image = newImagePath;
                                paragraph.imageUrl = newImagePath;
                                if (!paragraph.images) {
                                    paragraph.images = [];
                                }
                                if (!paragraph.images.includes(newImagePath)) {
                                    paragraph.images.push(newImagePath);
                                }
                            }
                            queueSave();
                        }

                        if (res?.totalCost != null) {
                            costs.push(res.totalCost);
                        }
                    } catch (err: any) {
                        const errorMsg = err instanceof Error ? err.message : String(err);
                        await writeLog('error', 'generateImages', `Failed to generate image for prompt ${digest}: ${errorMsg}`);
                        
                        // Mark as failed in memory and queue disk save
                        prompt.imageStatus = 'failed';
                        prompt.error = errorMsg;
                        delete prompt.image;
                        delete prompt.imageUrl;
                        delete prompt.needsRegenerate;

                        if (paragraph) {
                            paragraph.imageStatus = 'failed';
                            paragraph.error = errorMsg;
                            delete paragraph.image;
                            delete paragraph.imageUrl;
                            delete paragraph.needsRegenerate;
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
    });

    return;
}