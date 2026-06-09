import { listFiles, writeFile } from "@/data/storage/fileStorage";
import { storeCost } from "@/data/storage/costStorage";
import llmGenerateImage from "@/data/llm/llmGenerateImage";
import { loadPublication, savePublication } from "@/data/managePublication";
import { writeLog } from "@/data/storage/logStorage";

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
                    const imagePath = `images/${prompt.digest}.png`;
                    if (existingSet.has(imagePath)) {
                        if (prompt.image !== imagePath) {
                            prompt.image = imagePath;
                            prompt.imageUrl = imagePath;
                            changed = true;
                        }
                        
                        if (prompt.paragraphIndex != null && pub.paragraphs?.[prompt.paragraphIndex]) {
                            const paragraph = pub.paragraphs[prompt.paragraphIndex];
                            if (paragraph.image !== imagePath) {
                                paragraph.image = imagePath;
                                paragraph.imageUrl = imagePath;
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

    // Link existing images in-memory and write them to disk immediately so they render in UI
    let initialChanged = false;
    for (const prompt of prompts) {
        const digest = prompt.digest;
        if (!digest) continue;

        const imagePath = `images/${digest}.png`;
        if (existingSet.has(imagePath)) {
            if (prompt.image !== imagePath || prompt.imageUrl !== imagePath) {
                prompt.image = imagePath;
                prompt.imageUrl = imagePath;
                initialChanged = true;
            }

            if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
                const paragraph = paragraphs[prompt.paragraphIndex];
                if (paragraph.image !== imagePath || paragraph.imageUrl !== imagePath) {
                    paragraph.image = imagePath;
                    paragraph.imageUrl = imagePath;
                    initialChanged = true;
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

    // Check if any prompts actually require generation
    const needsGeneration = prompts.some((prompt: any) => {
        const digest = prompt.digest;
        return digest && !existingSet.has(`images/${digest}.png`);
    });

    // If no generations are needed, we can return now since they are already linked and saved
    if (!needsGeneration) {
        return;
    }

    // Acquire lock using Web Locks API
    await navigator.locks.request('image-generation', async (_lock) => {
        for (const prompt of prompts) {
            const digest = prompt.digest;
            if (!digest) continue;

            const imagePath = `images/${digest}.png`;
            let exists = existingSet.has(imagePath);

            if (!exists) {
                try {
                    // Clear previous error on both memory and disk
                    delete prompt.error;
                    if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
                        delete paragraphs[prompt.paragraphIndex].error;
                    }
                    await savePublication(publication);
                    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
                        self.postMessage({ type: 'PROGRESS' });
                    }

                    // Call llmGenerateImage with prompt text
                    const res = await llmGenerateImage(prompt.text);
                    
                    if (res?.content) {
                        // Convert base64 data URL to Blob
                        const blob = dataURLtoBlob(res.content);
                        
                        // Write binary image to file
                        await writeFile(imagePath, blob);
                        
                        existingSet.add(imagePath);
                        exists = true;

                        // Safely load latest publication, add this ref, and save to notify UI
                        await updateImageRefOnDisk(digest, imagePath);
                    }

                    if (res?.totalCost != null) {
                        costs.push(res.totalCost);
                    }
                } catch (err: any) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    await writeLog('error', 'generateImages', `Failed to generate image for prompt ${digest}: ${errorMsg}`);
                    
                    prompt.error = errorMsg;
                    if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
                        paragraphs[prompt.paragraphIndex].error = errorMsg;
                    }
                    
                    delete prompt.image;
                    delete prompt.imageUrl;
                    if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
                        const paragraph = paragraphs[prompt.paragraphIndex];
                        delete paragraph.image;
                        delete paragraph.imageUrl;
                    }

                    await savePublication(publication);
                    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
                        self.postMessage({ type: 'PROGRESS' });
                    }
                }
            }

            if (exists) {
                // Link prompt to image path in-memory for the current process reference
                prompt.image = imagePath;
                prompt.imageUrl = imagePath;

                // Link corresponding paragraph to image path
                if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
                    const paragraph = paragraphs[prompt.paragraphIndex];
                    paragraph.image = imagePath;
                    paragraph.imageUrl = imagePath;
                }
            } else {
                delete prompt.image;
                delete prompt.imageUrl;
                if (prompt.paragraphIndex != null && paragraphs[prompt.paragraphIndex]) {
                    const paragraph = paragraphs[prompt.paragraphIndex];
                    delete paragraph.image;
                    delete paragraph.imageUrl;
                }
            }
        }

        // Save cost records
        const validCosts = costs.filter((c): c is number => c !== null && c !== undefined);
        if (validCosts.length > 0) {
            await storeCost(validCosts, 'image');
        }

        // Final sync of all references to disk
        await syncAllImageRefsOnDisk(existingSet);
    });

    return;
}