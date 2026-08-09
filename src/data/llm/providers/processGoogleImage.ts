import { writeLog } from "@/data/storage/logStorage";
import extractMarkdownImages from "@/data/utilities/extractMarkdownImages";
import fetchWithRetry from "@/data/utilities/fetchWithRetry";

type props = {
    imagePrompt: string;
    apiKey: string;
    references?: string[];
    model?: string;
    inputCostPerMillion?: number;
    outputCostPerMillion?: number;
}

type response = {
    content: string;
    totalCost: number;
}

export default async function processGoogleImage({
    imagePrompt,
    apiKey,
    references: _references = [],
    model = "gemini-2.5-flash-image",
    inputCostPerMillion = 0.30,
    outputCostPerMillion = 30.00
}: props): Promise<response> {
    try {
        const isImagen = model.startsWith("imagen-");

        let response: Response;
        let totalCost = 0;
        let base64Data = "";
        let mimeType = "image/png";

        if (isImagen) {
            const cleanPrompt = imagePrompt.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1');
            const promptWithAspectRatio = cleanPrompt.trim().endsWith(".")
                ? `${cleanPrompt} Ensure the output image has a 1:1 square aspect ratio.`
                : `${cleanPrompt}. Ensure the output image has a 1:1 square aspect ratio.`;

            const body = {
                instances: [
                    {
                        prompt: promptWithAspectRatio
                    }
                ],
                parameters: {
                    numberOfImages: 1,
                    aspectRatio: "1:1"
                }
            };

            response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                await writeLog('error', 'processGoogleImage', `API Error: ${response.status} - ${errorText}`);
                const err: any = new Error(`API Error: ${response.status} - ${errorText}`);
                err.status = response.status;
                err.rawError = errorText;
                err.provider = 'Google (Imagen)';
                throw err;
            }

            const data = await response.json();
            const prediction = data.predictions?.[0];
            
            if (prediction) {
                if (prediction.bytesBase64Encoded) {
                    base64Data = prediction.bytesBase64Encoded;
                } else if (prediction.image?.imageBytes) {
                    base64Data = prediction.image.imageBytes;
                } else if (prediction.imageBytes) {
                    base64Data = prediction.imageBytes;
                }
            }

            if (!base64Data) {
                let modelNames: string[] = [];
                try {
                    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                    if (listRes.ok) {
                        const listData = await listRes.json();
                        modelNames = listData.models?.map((m: any) => m.name) || [];
                    }
                } catch (listErr) {
                    console.warn("Failed to list models:", listErr);
                }

                const responseStr = JSON.stringify(data);
                await writeLog('error', 'processGoogleImage', `No image data returned from the API. Available models: ${JSON.stringify(modelNames)}. Response: ${responseStr}`);
                throw new Error(`No image data returned from the API. Check prompt/model configuration. Available models: ${JSON.stringify(modelNames)}. Response: ${responseStr}`);
            }

            mimeType = prediction.mimeType || 'image/png';
            totalCost = 0.02; // Flat rate of 2 cents per image
        } else {
            const imageParts: any[] = [];
            const markdownImages = extractMarkdownImages(imagePrompt);

            if (markdownImages?.length > 0) {
                imageParts.push({ text: "Here are the reference images. Please pay attention to the descriptions for each:" });

                for (const markdownImage of markdownImages) {
                    imageParts.push({ text: `The following image contains an image to be used as the basis for drawing ${markdownImage.description}` });

                    imageParts.push({
                        fileData: {
                            mimeType: 'image/png',
                            fileUri: markdownImage.url
                        }
                    });
                }

                imageParts.push({ text: "Now, based on these characters, please generate an image from these instructions" });
            }

            // Force 1:1 aspect ratio in prompt text
            const promptWithAspectRatio = imagePrompt.trim().endsWith(".")
                ? `${imagePrompt} Ensure the output image has a 1:1 square aspect ratio.`
                : `${imagePrompt}. Ensure the output image has a 1:1 square aspect ratio.`;
            imageParts.push({ text: promptWithAspectRatio });

            const body = {
                contents: [
                    {
                        parts: imageParts
                    }
                ],
                // 1. MUST BE 'generationConfig', not 'config'
                generationConfig: {
                    responseModalities: ["IMAGE"], // Forces the model to output an image
                    imageConfig: {
                        aspectRatio: "1:1"
                    }
                }
            };

            response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                await writeLog('error', 'processGoogleImage', `API Error: ${response.status} - ${errorText}`);
                const err: any = new Error(`API Error: ${response.status} - ${errorText}`);
                err.status = response.status;
                err.rawError = errorText;
                err.provider = 'Google (Gemini Image)';
                throw err;
            }

            const data = await response.json();

            // 2. Extract the Base64 image data from Gemini's specific response structure
            const parts: any[] = data.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p: any) => p.inlineData);

            if (!imagePart) {
                await writeLog('error', 'processGoogleImage', 'No image data returned from the API. Check prompt/model configuration.');
                throw new Error("No image data returned from the API. Check prompt/model configuration.");
            }

            base64Data = imagePart.inlineData.data;
            mimeType = imagePart.inlineData.mimeType || 'image/jpeg';

            // Cost calculation based on Gemini's usageMetadata
            if (data.usageMetadata) {
                const usage = data.usageMetadata;
                const inputCost = ((usage.promptTokenCount || 0) / 1_000_000) * inputCostPerMillion;
                const outputCost = ((usage.candidatesTokenCount || 0) / 1_000_000) * outputCostPerMillion;
                totalCost = inputCost + outputCost;
            }
        }

        const content = `data:${mimeType};base64,${base64Data}`;
        return { content, totalCost };
    } catch (error: any) {
        await writeLog('error', 'processGoogleImage', `Error: ${error.message}`);
        throw new Error(`Error: ${error.message}`, { cause: error });
    }
}
