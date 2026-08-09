import { writeLog } from "@/data/storage/logStorage";
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

export default async function processxAIImage({
    imagePrompt,
    apiKey,
    references: _references = [],
    model = "grok-imagine-image-quality",
    inputCostPerMillion: _inputCostPerMillion = 0,
    outputCostPerMillion: _outputCostPerMillion = 0
}: props): Promise<response> {
    try {
        // Clean prompt: strip markdown image tags but keep the alt text description
        const cleanPrompt = imagePrompt.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1');
        const promptWithAspectRatio = cleanPrompt.trim().endsWith(".")
            ? `${cleanPrompt} Ensure the output image has a 1:1 square aspect ratio.`
            : `${cleanPrompt}. Ensure the output image has a 1:1 square aspect ratio.`;

        const body = {
            model,
            prompt: promptWithAspectRatio,
            n: 1,
            response_format: "b64_json"
        };

        const response = await fetchWithRetry(`https://api.x.ai/v1/images/generations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            await writeLog('error', 'processxAIImage', `API Error: ${response.status} - ${errorText}`);
            const err: any = new Error(`API Error: ${response.status} - ${errorText}`);
            err.status = response.status;
            err.rawError = errorText;
            err.provider = 'xAI';
            throw err;
        }

        const data = await response.json();
        const base64Data = data.data?.[0]?.b64_json;

        if (!base64Data) {
            await writeLog('error', 'processxAIImage', `No image data returned from the API. Response: ${JSON.stringify(data)}`);
            throw new Error(`No image data returned from the API. Check prompt/model configuration. Response: ${JSON.stringify(data)}`);
        }

        const mimeType = "image/png";
        const content = `data:${mimeType};base64,${base64Data}`;
        const totalCost = 0.04; // Flat rate of 4 cents per image (Grok image generation pricing estimate)

        return { content, totalCost };
    } catch (error: any) {
        await writeLog('error', 'processxAIImage', `Error: ${error.message}`);
        throw new Error(`Error: ${error.message}`, { cause: error });
    }
}
