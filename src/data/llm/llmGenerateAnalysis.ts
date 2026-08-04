import { writeLog } from "../storage/logStorage";
import { identifyApiKeyProvider } from "../utilities/identifyApiKeyProvider";
import processGoogleAnalysis from "./providers/processGoogleAnalysis";
import processxAIAnalysis from "./providers/processxAIAnalysis";
import processOpenRouterAnalysis from "./providers/processOpenRouterAnalysis";

/*

Model Name              | Provider    | Input / 1M | Output / 1M
Gemini 2.5 Flash Lite   | Google      | $0.10      | $0.40
Grok 3 Mini             | xAI         | $0.25      | $0.50
Qwen 2.5 VL 72B         | OpenRouter  | $0.20      | $0.50

*/

let activeApiKey = '';

export function setApiKey(key: string) {
    activeApiKey = key;
}

export default async function llmGenerateAnalysis(
    systemPrompt: string,
    userPrompt: string,
    image: { mimeType: string; base64Data: string }
) {
    const apiKey = activeApiKey
        || (typeof window !== 'undefined' ? (window.sessionStorage.getItem("apiKey") || window.localStorage.getItem("apiKey")) : null)
        || (typeof import.meta !== 'undefined' && (import.meta as any).env ? ((import.meta as any).env.VITE_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY) : '')
        || '';

    const provider = identifyApiKeyProvider(apiKey);

    await writeLog('info', 'llmGenerateAnalysis', `Analyzing image with provider ${provider} for prompt: ${userPrompt.substring(0, 40)}...`);

    if (provider === 'UNKNOWN') {
        const errorMsg = !apiKey
            ? "No API key configured. Please enter your Google, xAI, or OpenRouter API key in the application."
            : `Unrecognized API key format. Please provide a valid Google (AIza/AQ), xAI (xai-), or OpenRouter (sk-or-) key.`;
        await writeLog('error', 'llmGenerateAnalysis', errorMsg);
        throw new Error(errorMsg);
    }

    let result: { content?: string; totalCost?: number } = {};

    if (provider === 'GOOGLE') {
        const model = "gemini-2.5-flash-lite";
        const inputCostPerMillion = 0.10;
        const outputCostPerMillion = 0.40;

        result = await processGoogleAnalysis({ systemPrompt, userPrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion, image });
    } else if (provider === 'XAI') {
        const model = "grok-3-mini";
        const inputCostPerMillion = 0.25;
        const outputCostPerMillion = 0.50;

        result = await processxAIAnalysis({ systemPrompt, userPrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion, image });
    } else if (provider === 'OPENROUTER') {
        const model = "qwen/qwen-2.5-vl-72b-instruct";
        const inputCostPerMillion = 0.20;
        const outputCostPerMillion = 0.50;

        result = await processOpenRouterAnalysis({ systemPrompt, userPrompt, apiKey, model, inputCostPerMillion, outputCostPerMillion, image });
    }

    return result;
}
