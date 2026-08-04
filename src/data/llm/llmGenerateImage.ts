import { writeLog } from "../storage/logStorage";
import { identifyApiKeyProvider } from "../utilities/identifyApiKeyProvider";
import processGoogleImage from "./providers/processGoogleImage";
import processxAIImage from "./providers/processxAIImage";
import processOpenRouterImage from "./providers/processOpenRouterImage";

/*

Model Name         | Type            | Price Per Generated Image | Effective Text Input / 1M | Effective Image Input / 1M | Effective Output / 1M
Imagen 4 Fast      | Flat Rate       | $0.020                    | $0.00 (Included)          | $0.00 (Included)           | ~$17.86
Gemini 2.5 Flash   | Token-Based     | $0.039                    | $0.30                     | $0.30                      | ~$34.82
Gemini 3.1 Flash   | Token-Based     | $0.067                    | $0.50                     | $0.50                      | $60.00
Gemini 3 Pro       | Token-Based     | $0.134                    | $1.25                     | $1.25                      | $120.00

*/

let activeApiKey = '';

export function setApiKey(key: string) {
    activeApiKey = key;
}

export default async function llmGenerateImage(imagePrompt: string) {
    const apiKey = activeApiKey
        || (typeof window !== 'undefined' ? (window.sessionStorage.getItem("apiKey") || window.localStorage.getItem("apiKey")) : null)
        || (typeof import.meta !== 'undefined' && (import.meta as any).env ? ((import.meta as any).env.VITE_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY) : '')
        || '';

    const provider = identifyApiKeyProvider(apiKey);

    await writeLog('info', 'llmGenerateImage', `Generating image with provider ${provider} for prompt: ${imagePrompt.substring(0, 40)}...`);

    if (provider === 'UNKNOWN') {
        const errorMsg = !apiKey
            ? "No API key configured. Please enter your Google, xAI, or OpenRouter API key in the application."
            : `Unrecognized API key format. Please provide a valid Google (AIza/AQ), xAI (xai-), or OpenRouter (sk-or-) key.`;
        await writeLog('error', 'llmGenerateImage', errorMsg);
        throw new Error(errorMsg);
    }

    let result: { content?: string; totalCost?: number } = {};

    if (provider === 'GOOGLE') {
        const model = "gemini-2.5-flash-image";
        const inputCostPerMillion = 0.30;
        const outputCostPerMillion = 30.00;

        result = await processGoogleImage({ imagePrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion });
    } else if (provider === 'XAI') {
        const model = "grok-imagine-image-quality";
        const inputCostPerMillion = 0.00;
        const outputCostPerMillion = 50.00;

        result = await processxAIImage({ imagePrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion });
    } else if (provider === 'OPENROUTER') {
        const model = "openai/gpt-image-2" //, "black-forest-labs/flux.2-pro" // "google/gemini-2.5-flash-image" // "black-forest-labs/flux.2-klein-4b"; //"black-forest-labs/flux.2-pro";
        const inputCostPerMillion = 8.00;
        const outputCostPerMillion = 8.00;

        result = await processOpenRouterImage({ imagePrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion });
    }

    return result;
}