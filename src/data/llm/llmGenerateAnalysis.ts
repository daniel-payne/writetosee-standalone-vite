import { identifyApiKeyProvider } from "@/data/utilities/identifyApiKeyProvider";
import processOpenRouterAnalysis from "./providers/processOpenRouterAnalysis";
import { writeLog } from "../storage/logStorage";

let activeApiKey = '';

export function setApiKey(key: string) {
  activeApiKey = key;
}

export default async function llmGenerateAnalysis(
  systemPrompt: string,
  userPrompt: string,
  image: { mimeType: string; base64Data: string }
) {
  const apiKey = activeApiKey || (typeof window !== 'undefined' ? window.sessionStorage.getItem("apiKey") : null) || '';
  const provider = identifyApiKeyProvider(apiKey);

  await writeLog('info', 'llmGenerateAnalysis', `Analyzing image with provider: ${provider}`);

  let result: { content?: string; totalCost?: number } = {};

  if (provider === 'OPENROUTER' || apiKey) {
    result = await processOpenRouterAnalysis({ systemPrompt, userPrompt, apiKey, image });
  } else {
    throw new Error("No API key configured for OpenRouter image analysis.");
  }

  return result;
}
