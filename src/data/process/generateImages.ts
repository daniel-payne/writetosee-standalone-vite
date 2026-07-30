import { listFiles, writeFile } from "@/data/storage/fileStorage";
import { storeCost } from "@/data/storage/costStorage";
import llmGenerateImage from "@/data/llm/llmGenerateImage";
import { savePublication } from "@/data/managePublication";
import { writeLog } from "@/data/storage/logStorage";

<<<<<<< Updated upstream
async function updateImageRefOnDisk(digest: string, imagePath: string) {
    try {
        const pub = await loadPublication();
        let changed = false;

        const prompt = pub.prompts?.find((p: any) => p.digest === digest);
        if (prompt) {
            if (prompt.image !== imagePath || prompt.imageUrl !== imagePath) {
                prompt.image = imagePath;
                prompt.imageUrl = imagePath;
                changed = true;
            }
            
            if (prompt.paragraphIndex != null && pub.paragraphs?.[prompt.paragraphIndex]) {
                const paragraph = pub.paragraphs[prompt.paragraphIndex];
                if (paragraph.image !== imagePath || paragraph.imageUrl !== imagePath) {
                    paragraph.image = imagePath;
                    paragraph.imageUrl = imagePath;
                    changed = true;
                }
                if (!paragraph.images) {
                    paragraph.images = [];
                }
                if (!paragraph.images.includes(imagePath)) {
                    paragraph.images.push(imagePath);
                    changed = true;
                }
            }
        }

        if (changed) {
            await savePublication(pub);
            if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
                self.postMessage({ type: 'PROGRESS' });
            }
        }
    } catch (err) {
        await writeLog('error', 'updateImageRefOnDisk', `Failed to update image reference on disk: ${err instanceof Error ? err.message : String(err)}`);
    }
}

async function syncAllImageRefsOnDisk(existingSet: Set<string>) {
    try {
        const pub = await loadPublication();
        let changed = false;

        if (pub.prompts) {
            for (const prompt of pub.prompts) {
                if (prompt.digest) {
                    const matchingImages = Array.from(existingSet).filter(
                        (filePath: string) => filePath.startsWith(`images/${prompt.digest}.png`) || filePath.startsWith(`images/${prompt.digest}_`)
                    );

                    if (matchingImages.length > 0) {
                        const selectedImage = prompt.image && existingSet.has(prompt.image)
                            ? prompt.image
                            : matchingImages[matchingImages.length - 1];

                        if (prompt.image !== selectedImage) {
                            prompt.image = selectedImage;
                            prompt.imageUrl = selectedImage;
                            changed = true;
                        }
                        
                        if (prompt.paragraphIndex != null && pub.paragraphs?.[prompt.paragraphIndex]) {
                            const paragraph = pub.paragraphs[prompt.paragraphIndex];
                            if (!paragraph.images) {
                                paragraph.images = [];
                            }
                            for (const imgFile of matchingImages) {
                                if (!paragraph.images.includes(imgFile)) {
                                    paragraph.images.push(imgFile);
                                    changed = true;
                                }
                            }
                            if (paragraph.image !== selectedImage) {
                                paragraph.image = selectedImage;
                                paragraph.imageUrl = selectedImage;
                                changed = true;
                            }
                        }
                    }
                }
            }
        }

        if (changed) {
            await savePublication(pub);
            if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
                self.postMessage({ type: 'PROGRESS' });
            }
        }
    } catch (err) {
        await writeLog('error', 'syncAllImageRefsOnDisk', `Failed to sync all image references on disk: ${err instanceof Error ? err.message : String(err)}`);
    }
}

=======
>>>>>>> Stashed changes
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

    // Query existing files in storage once
    const existingFiles = await listFiles().catch(() => []);
    const existingSet = new Set(existingFiles);

    // Link existing images and set status to completed, otherwise set status to pending/failed
    for (const prompt of prompts) {
        const digest = prompt.digest;
        if (!digest) continue;

<<<<<<< Updated upstream
        const paragraph = prompt.paragraphIndex != null ? paragraphs[prompt.paragraphIndex] : null;
        const isRegenerateRequested = prompt.needsRegenerate || paragraph?.needsRegenerate;

        const matchingImages = Array.from(existingSet).filter(
            (filePath: string) => filePath.startsWith(`images/${digest}.png`) || filePath.startsWith(`images/${digest}_`)
        );

        if (matchingImages.length > 0) {
            if (paragraph) {
                if (!paragraph.images) {
                    paragraph.images = [];
                }
                for (const imgFile of matchingImages) {
                    if (!paragraph.images.includes(imgFile)) {
                        paragraph.images.push(imgFile);
                        initialChanged = true;
                    }
                }

                if (!isRegenerateRequested) {
                    const selectedImage = paragraph.image && existingSet.has(paragraph.image)
                        ? paragraph.image
                        : matchingImages[matchingImages.length - 1];

                    if (paragraph.image !== selectedImage || paragraph.imageUrl !== selectedImage) {
                        paragraph.image = selectedImage;
                        paragraph.imageUrl = selectedImage;
                        initialChanged = true;
                    }
                    if (prompt.image !== selectedImage || prompt.imageUrl !== selectedImage) {
                        prompt.image = selectedImage;
                        prompt.imageUrl = selectedImage;
                        initialChanged = true;
                    }
=======
        const imagePath = `images/${digest}.png`;
        const exists = existingSet.has(imagePath);
        
        const expectedStatus = exists ? 'completed' : (prompt.error ? 'failed' : 'pending');
        prompt.imageStatus = expectedStatus;

        if (exists) {
            prompt.image = imagePath;
            prompt.imageUrl = imagePath;
            delete prompt.error;
        } else {
            delete prompt.image;
            delete prompt.imageUrl;
        }

        if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
            const paragraph = paragraphs[prompt.paragraphIndex];
            paragraph.imageStatus = expectedStatus;
            if (exists) {
                paragraph.image = imagePath;
                paragraph.imageUrl = imagePath;
                delete paragraph.error;
            } else {
                delete paragraph.image;
                delete paragraph.imageUrl;
                if (prompt.error) {
                    paragraph.error = prompt.error;
                } else {
                    delete paragraph.error;
>>>>>>> Stashed changes
                }
            }
        }
    }

<<<<<<< Updated upstream
    if (initialChanged) {
        await savePublication(publication);
        if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
            self.postMessage({ type: 'PROGRESS' });
        }
    }

    // Check if any prompts actually require generation (i.e. prompt has no image set or regenerate is requested)
    const needsGeneration = prompts.some((prompt: any) => {
=======
    // Check if any prompts actually require generation
    const needsGenerationPrompts = prompts.filter((prompt: any) => {
>>>>>>> Stashed changes
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
                const imagePath = `images/${digest}.png`;

<<<<<<< Updated upstream
            const paragraph = prompt.paragraphIndex != null ? paragraphs[prompt.paragraphIndex] : null;
            const isRegenerateRequested = prompt.needsRegenerate || paragraph?.needsRegenerate;
            let currentImage = isRegenerateRequested ? null : (prompt.image || paragraph?.image);
            let exists = currentImage ? existingSet.has(currentImage) : false;

            if (!exists) {
                try {
                    // Clear previous error and regenerate flags on both memory and disk
                    delete prompt.error;
                    delete prompt.needsRegenerate;
                    if (paragraph) {
                        delete paragraph.error;
                        delete paragraph.needsRegenerate;
                    }
                    await savePublication(publication);
                    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
                        self.postMessage({ type: 'PROGRESS' });
=======
                try {
                    // Update status to generating in memory and queue the disk save
                    prompt.imageStatus = 'generating';
                    delete prompt.error;
                    if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
                        const paragraph = paragraphs[prompt.paragraphIndex];
                        paragraph.imageStatus = 'generating';
                        delete paragraph.error;
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                        
                        // Write binary image to file
                        await writeFile(newImagePath, blob);
                        
                        existingSet.add(newImagePath);
                        exists = true;

                        // Safely load latest publication, add this ref, and save to notify UI
                        await updateImageRefOnDisk(digest, newImagePath);
=======
                        await writeFile(imagePath, blob);
                        existingSet.add(imagePath);

                        // Mark as completed in memory and queue disk save
                        prompt.imageStatus = 'completed';
                        prompt.image = imagePath;
                        prompt.imageUrl = imagePath;
                        if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
                            const paragraph = paragraphs[prompt.paragraphIndex];
                            paragraph.imageStatus = 'completed';
                            paragraph.image = imagePath;
                            paragraph.imageUrl = imagePath;
                        }
                        queueSave();
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                    if (paragraph) {
                        paragraph.error = errorMsg;
                    }
                    
                    delete prompt.image;
                    delete prompt.imageUrl;
                    delete prompt.needsRegenerate;
                    if (paragraph) {
=======
                    delete prompt.image;
                    delete prompt.imageUrl;
                    if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
                        const paragraph = paragraphs[prompt.paragraphIndex];
                        paragraph.imageStatus = 'failed';
                        paragraph.error = errorMsg;
>>>>>>> Stashed changes
                        delete paragraph.image;
                        delete paragraph.imageUrl;
                        delete paragraph.needsRegenerate;
                    }
                    queueSave();
                }
<<<<<<< Updated upstream
            }
=======
            }));
>>>>>>> Stashed changes
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