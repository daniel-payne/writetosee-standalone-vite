import { identifyApiKeyProvider } from "../utilities/identifyApiKeyProvider";
import processGoogleImage from "./providers/processGoogleImage";

export default async function llmGenerateImage(imagePrompt: string) {
    const apiKey = window.sessionStorage.getItem("apiKey") ?? '';
    const provider = identifyApiKeyProvider(apiKey);

    let result: { content?: string; totalCost?: number } = {};

    if (provider === 'GOOGLE') {
        result = await processGoogleImage({ imagePrompt, apiKey })
    } else if (provider === 'XAI') {
        // result = await processxAIImage({ imagePrompt, apiKey })
    }



    return result
}