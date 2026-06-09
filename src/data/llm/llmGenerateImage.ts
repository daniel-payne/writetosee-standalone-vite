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
    const apiKey = activeApiKey || (typeof window !== 'undefined' ? window.sessionStorage.getItem("apiKey") : null) || '';
    const provider = identifyApiKeyProvider(apiKey);

    let result: { content?: string; totalCost?: number } = {};

    await writeLog('info', 'llmGenerateImage', imagePrompt.substring(0, 30));

    if (provider === 'GOOGLE') {
        const model = "gemini-2.5-flash-image"
        const inputCostPerMillion = 0.30
        const outputCostPerMillion = 30.00

        result = await processGoogleImage({ imagePrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion })
    } else if (provider === 'XAI') {
        const model = "grok-imagine-image-quality";
        result = await processxAIImage({ imagePrompt, apiKey, model });
    } else if (provider === 'OPENROUTER') {
        const model = "openai/gpt-5-image-mini";
        const inputCostPerMillion = 2.50;
        const outputCostPerMillion = 2.00;
        result = await processOpenRouterImage({ imagePrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion });
    }

    return result
}