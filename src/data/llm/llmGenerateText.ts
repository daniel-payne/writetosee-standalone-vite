import { identifyApiKeyProvider } from "@/data/utilities/identifyApiKeyProvider";
import processxAIChat from "./providers/processxAIChat";
import processGoogleChat from "./providers/processGoogleChat";
import processOpenRouterChat from "./providers/processOpenRouterChat";
import { writeLog } from "../storage/logStorage";

let activeApiKey = '';

export function setApiKey(key: string) {
    activeApiKey = key;
}

export default async function llmGenerateText(
    systemPrompt: string,
    userPrompt: string,
    image?: { mimeType: string; base64Data: string } | null
) {
    const apiKey = activeApiKey || (typeof window !== 'undefined' ? window.sessionStorage.getItem("apiKey") : null) || '';
    const provider = identifyApiKeyProvider(apiKey);

    let result: { content?: string; totalCost?: number } = {};

    await writeLog('info', 'llmGenerateText', userPrompt.substring(0, 30));

    if (provider === 'GOOGLE') {
        result = await processGoogleChat({ systemPrompt, userPrompt, apiKey, image })
    } else if (provider === 'XAI') {
        result = await processxAIChat({ systemPrompt, userPrompt, apiKey, image })
    } else if (provider === 'OPENROUTER') {
        result = await processOpenRouterChat({ systemPrompt, userPrompt, apiKey, image })
    }

    return result
}