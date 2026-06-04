import processPublicationImpl from "./processPublicationImpl";
import { setApiKey as setApiKeyText } from "@/data/llm/llmGenerateText";
import { setApiKey as setApiKeyImage } from "@/data/llm/llmGenerateImage";

self.onmessage = async (event: MessageEvent) => {
    const { type, style, story, apiKey } = event.data;

    if (type === 'START') {
        try {
            // Set the API Key inside the worker context
            setApiKeyText(apiKey);
            setApiKeyImage(apiKey);

            // Execute processing
            const result = await processPublicationImpl({ style, story });
            
            self.postMessage({ type: 'SUCCESS', payload: result });
        } catch (err: any) {
            self.postMessage({ type: 'ERROR', error: err?.message || String(err) });
        }
    }
};
