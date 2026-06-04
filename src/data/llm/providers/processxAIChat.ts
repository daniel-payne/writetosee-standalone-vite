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
}

type response = {
    content: string;
    totalCost: number;
}

export default async function processxAIChat({
    systemPrompt,
    userPrompt,
    apiKey,
    model = "grok-4-1-fast-non-reasoning",
    inputCostPerMillion = 0.20,
    outputCostPerMillion = 0.50,
    forceJson = false,
    schema = null,
    temperature = 0.7
}: props): Promise<response> {
    const endpoint = "https://api.x.ai/v1/chat/completions";

    const payload = {
        model,
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userPrompt
            }
        ],
        temperature,
        max_tokens: 32000,
        // top_p: 0.9,
        // frequency_penalty: 0,
        // presence_penalty: 0 
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
        };
    }


    try {

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorMessage = await response.text();

            await writeLog('error', 'processxAIChat', `API Error: ${response.status} - ${errorMessage}`);
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();

        const content = data.choices?.[0]?.message?.content?.trim();

        if (content?.trim().length === 0) {
            await writeLog('error', 'processxAIChat', 'No response returned from the API');
            throw new Error("No response returned from the API");
        }

        let totalCost: number;

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
        await writeLog('error', 'processxAIChat', `Error: ${error.message}`);
        throw new Error(`Error: ${error.message}`, { cause: error });
    }
}