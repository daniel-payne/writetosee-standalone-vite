import { identifyApiKeyProvider } from "@/data/utilities/identifyApiKeyProvider";
import processGoogleChat from "./providers/processGoogleChat";
import processxAIChat from "./providers/processxAIChat";
import processOpenRouterChat from "./providers/processOpenRouterChat";
import { writeLog } from "../storage/logStorage";

/*

Model Name                      | Provider    | Input / 1M | Output / 1M
Gemini 2.5 Flash                | Google      | $0.15      | $0.60
Grok 4.1 Fast (Non-Reasoning)   | xAI         | $0.20      | $0.50
Google Gemini 2.5 Flash          | OpenRouter  | $0.30      | $2.50

*/

let activeApiKey = '';

export function setApiKey(key: string) {
    activeApiKey = key;
}

export default async function llmGenerateText(
    systemPrompt: string,
    userPrompt: string,
    image?: { mimeType: string; base64Data: string } | null
) {
    const apiKey = activeApiKey
        || (typeof window !== 'undefined' ? (window.sessionStorage.getItem("apiKey") || window.localStorage.getItem("apiKey")) : null)
        || (typeof import.meta !== 'undefined' && (import.meta as any).env ? ((import.meta as any).env.VITE_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY) : '')
        || '';

    const provider = identifyApiKeyProvider(apiKey);

    await writeLog('info', 'llmGenerateText', `Generating text with provider ${provider} for prompt: ${userPrompt.substring(0, 40)}...`);

    if (provider === 'UNKNOWN') {
        const errorMsg = !apiKey
            ? "No API key configured. Please enter your Google, xAI, or OpenRouter API key in the application."
            : `Unrecognized API key format. Please provide a valid Google (AIza/AQ), xAI (xai-), or OpenRouter (sk-or-) key.`;
        await writeLog('error', 'llmGenerateText', errorMsg);
        throw new Error(errorMsg);
    }

    let result: { content?: string; totalCost?: number } = {};

    if (provider === 'GOOGLE') {
        const model = "gemini-2.5-flash";
        const inputCostPerMillion = 0.15;
        const outputCostPerMillion = 0.60;

        result = await processGoogleChat({ systemPrompt, userPrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion, image });
    } else if (provider === 'XAI') {
        const model = "grok-4-1-fast-non-reasoning";
        const inputCostPerMillion = 0.20;
        const outputCostPerMillion = 0.50;

        result = await processxAIChat({ systemPrompt, userPrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion, image });
    } else if (provider === 'OPENROUTER') {
        const model = "google/gemini-2.5-flash";
        const inputCostPerMillion = 0.30;
        const outputCostPerMillion = 2.50;

        result = await processOpenRouterChat({ systemPrompt, userPrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion, image });
    }

    return result;
}