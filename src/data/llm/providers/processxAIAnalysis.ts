import { writeLog } from "@/data/storage/logStorage";

type Props = {
    systemPrompt: string;
    userPrompt: string;
    apiKey: string;
    model?: string;
    inputCostPerMillion?: number;
    outputCostPerMillion?: number;
    image: { mimeType: string; base64Data: string };
};

type Response = {
    content: string;
    totalCost: number;
};

export default async function processxAIAnalysis({
    systemPrompt,
    userPrompt,
    apiKey,
    model = "grok-3-mini",
    inputCostPerMillion = 0.25,
    outputCostPerMillion = 0.50,
    image,
}: Props): Promise<Response> {
    const endpoint = "https://api.x.ai/v1/chat/completions";

    const userMessageContent: any = [
        {
            type: "text",
            text: userPrompt,
        },
        {
            type: "image_url",
            image_url: {
                url: `data:${image.mimeType};base64,${image.base64Data}`,
            },
        },
    ];

    const payload = {
        model,
        messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            {
                role: "user",
                content: userMessageContent,
            },
        ],
        temperature: 0.5,
    };

    try {
        await writeLog('info', 'processxAIAnalysis', `Calling xAI API model: ${model}`);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            await writeLog('error', 'processxAIAnalysis', `API Error: ${response.status} - ${errorMessage}`);
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();

        if (!content || content.trim().length === 0) {
            await writeLog('error', 'processxAIAnalysis', 'No response returned from the API');
            throw new Error("No response returned from the API");
        }

        let totalCost = 0;
        if (data.usage) {
            const usage = data.usage;
            const inputCost = ((usage.prompt_tokens || 0) / 1_000_000) * inputCostPerMillion;
            const outputCost = ((usage.completion_tokens || 0) / 1_000_000) * outputCostPerMillion;
            totalCost = inputCost + outputCost;
        }

        await writeLog('info', 'processxAIAnalysis', `Successfully analyzed image with model ${model}`);
        return { content, totalCost };
    } catch (error: any) {
        await writeLog('error', 'processxAIAnalysis', `Error: ${error.message}`);
        throw new Error(`Error: ${error.message}`, { cause: error });
    }
}
