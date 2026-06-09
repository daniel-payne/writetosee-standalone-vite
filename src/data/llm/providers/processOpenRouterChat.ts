import { writeLog } from "@/data/storage/logStorage";

type props = {
    systemPrompt: string;
    userPrompt: string;
    apiKey: string;
    model?: string;
    inputCostPerMillion?: number;
    outputCostPerMillion?: number;
    forceJson?: boolean;
    schema?: any;
    temperature?: number;
    image?: { mimeType: string; base64Data: string } | null;
}

type response = {
    content: string;
    totalCost: number;
}

export default async function processOpenRouterChat({
    systemPrompt,
    userPrompt,
    apiKey,
    model = "google/gemini-2.5-flash",
    inputCostPerMillion = 0.30,
    outputCostPerMillion = 2.50,
    forceJson = false,
    schema = null,
    temperature = 0.7,
    image = null
}: props): Promise<response> {
    const endpoint = "https://openrouter.ai/api/v1/chat/completions";

    const userMessageContent: any = image
        ? [
            {
                type: "text",
                text: userPrompt
            },
            {
                type: "image_url",
                image_url: {
                    url: `data:${image.mimeType};base64,${image.base64Data}`
                }
            }
        ]
        : userPrompt;

    const payload = {
        model,
        messages: [
            ...(systemPrompt ? [{
                role: "system",
                content: systemPrompt
            }] : []),
            {
                role: "user",
                content: userMessageContent
            }
        ],
        temperature,
    } as any;

    if (forceJson === true) {
        if (schema) {
            payload.response_format = {
                type: "json_schema",
                json_schema: {
                    name: "response_schema",
                    strict: true,
                    schema: schema
                }
            }
        } else {
            payload.response_format = {
                type: "json_object"
            }
        }
    }

    try {
        console.log("processOpenRouterChat: Calling OpenRouter API endpoint:", endpoint, "model:", model, "payload size:", JSON.stringify(payload).length, "API key present:", !!apiKey);
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
                "X-Title": "WriteToSee"
            },
            body: JSON.stringify(payload)
        });

        console.log("processOpenRouterChat: response status:", response.status);

        if (!response.ok) {
            const errorMessage = await response.text();
            console.error("processOpenRouterChat: OpenRouter API returned error status:", response.status, errorMessage);
            await writeLog('error', 'processOpenRouterChat', `API Error: ${response.status} - ${errorMessage}`);
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();
        console.log("processOpenRouterChat: parsed JSON data:", data);

        const content = data.choices?.[0]?.message?.content?.trim();

        if (!content || content.trim().length === 0) {
            console.error("processOpenRouterChat: No choices or content returned. Full response:", data);
            await writeLog('error', 'processOpenRouterChat', 'No response returned from the API');
            throw new Error("No response returned from the API");
        }

        console.log("processOpenRouterChat: successfully generated text!");

        let totalCost: number;

        // OpenRouter returns usage object in standard format
        if (data.usage) {
            const usage = data.usage;
            const inputCost = (usage.prompt_tokens / 1_000_000) * inputCostPerMillion;
            const outputCost = (usage.completion_tokens / 1_000_000) * outputCostPerMillion;
            totalCost = inputCost + outputCost;
        } else {
            totalCost = 0;
        }

        return { content, totalCost };
    } catch (error: any) {
        console.error("processOpenRouterChat: caught error:", error);
        await writeLog('error', 'processOpenRouterChat', `Error: ${error.message}`);
        throw new Error(`Error: ${error.message}`, { cause: error });
    }
}
