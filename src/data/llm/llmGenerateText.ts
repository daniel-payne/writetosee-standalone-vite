import { identifyApiKeyProvider } from "@/data/utilities/identifyApiKeyProvider";
import processxAIChat from "./providers/processxAIChat";
import processGoogleChat from "./providers/processGoogleChat";

export default async function llmGenerateText(systemPrompt: string, userPrompt: string) {
    const apiKey = window.sessionStorage.getItem("apiKey") ?? '';
    const provider = identifyApiKeyProvider(apiKey);

    let result: { content?: string; totalCost?: number } = {};

    if (provider === 'GOOGLE') {
        result = await processGoogleChat({ systemPrompt, userPrompt, apiKey })
    } else if (provider === 'XAI') {
        result = await processxAIChat({ systemPrompt, userPrompt, apiKey })
    }

    return result
}