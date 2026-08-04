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

export default async function processGoogleAnalysis({
    systemPrompt,
    userPrompt,
    apiKey,
    model = "gemini-2.5-flash-lite",
    inputCostPerMillion = 0.10,
    outputCostPerMillion = 0.40,
    image,
}: Props): Promise<Response> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const parts: any[] = [{ text: userPrompt }];
    if (image) {
        parts.push({
            inlineData: {
                mimeType: image.mimeType,
                data: image.base64Data,
            },
        });
    }

    const payload: any = {
        contents: [
            {
                role: "user",
                parts,
            },
        ],
        generationConfig: {
            temperature: 0.5,
        },
    };

    if (systemPrompt) {
        payload.systemInstruction = {
            parts: [{ text: systemPrompt }],
        };
    }

    try {
        await writeLog('info', 'processGoogleAnalysis', `Calling Gemini API model: ${model}`);

        const response = await fetch(`${endpoint}?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            await writeLog('error', 'processGoogleAnalysis', `API Error: ${response.status} - ${errorMessage}`);
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!content || content.length === 0) {
            await writeLog('error', 'processGoogleAnalysis', 'No response returned from the API');
            throw new Error("No response returned from the API");
        }

        let totalCost = 0;
        if (data.usageMetadata) {
            const usage = data.usageMetadata;
            const inputCost = ((usage.promptTokenCount || 0) / 1_000_000) * inputCostPerMillion;
            const outputCost = ((usage.candidatesTokenCount || 0) / 1_000_000) * outputCostPerMillion;
            totalCost = inputCost + outputCost;
        }

        await writeLog('info', 'processGoogleAnalysis', `Successfully analyzed image with model ${model}`);
        return { content, totalCost };
    } catch (error: any) {
        await writeLog('error', 'processGoogleAnalysis', `Error: ${error.message}`);
        throw new Error(`Error: ${error.message}`, { cause: error });
    }
}
