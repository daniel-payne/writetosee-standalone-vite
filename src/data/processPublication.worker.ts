import processPublicationImpl, { processImageGenerationImpl } from "./processPublicationImpl";
import { setApiKey as setApiKeyText } from "@/data/llm/llmGenerateText";
import { setApiKey as setApiKeyImage } from "@/data/llm/llmGenerateImage";

self.onmessage = async (event: MessageEvent) => {
    const { type, style, story, apiKey } = event.data;

    try {
        // Set the API Key inside the worker context if provided
        if (apiKey) {
            setApiKeyText(apiKey);
            setApiKeyImage(apiKey);
        }

        if (type === 'START_TEXT') {
            // Execute text processing (paragraphs, pages, chapters, predicates, summaries, prompts)
            const result = await processPublicationImpl({ style, story });
            self.postMessage({ type: 'SUCCESS', payload: result });
        } else if (type === 'START_IMAGES') {
            // Execute image generation for any pending prompts
            const result = await processImageGenerationImpl();
            self.postMessage({ type: 'SUCCESS', payload: result });
        }
    } catch (err: any) {
        self.postMessage({ type: 'ERROR', error: err?.message || String(err) });
    }
};
