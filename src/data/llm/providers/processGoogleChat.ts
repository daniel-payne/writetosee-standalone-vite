
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

export default async function processGoogleChat({
    systemPrompt,
    userPrompt,
    apiKey,
    model = "gemini-2.5-flash",
    inputCostPerMillion = 0.075,
    outputCostPerMillion = 0.30,
    forceJson = false,
    schema = null,
    temperature = 0.7,
    image = null
}: props): Promise<response> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const parts: any[] = [{ text: userPrompt }];
    if (image) {
        parts.push({
            inlineData: {
                mimeType: image.mimeType,
                data: image.base64Data
            }
        });
    }

    const payload = {
        contents: [
            {
                role: "user",
                parts
            }
        ],
        generationConfig: {
            temperature: temperature
        }
    } as any;

    // Gemini handles system prompts separately from the main messages array
    if (systemPrompt) {
        payload.systemInstruction = {
            parts: [{ text: systemPrompt }]
        };
    }

    // Enforce JSON output formatting
    if (forceJson === true) {
        payload.generationConfig.responseMimeType = "application/json";
        if (schema) {
            // Gemini schema requires uppercase Types and does not support additionalProperties
            const cleanSchema = (s: any): any => {
                if (typeof s !== 'object' || s === null) return s;
                if (Array.isArray(s)) return s.map(cleanSchema);
                const cleaned: Record<string, any> = {};
                for (const key in s) {
                    if (key === 'additionalProperties') continue;
                    if (key === 'type' && typeof s[key] === 'string') {
                        cleaned[key] = s[key].toUpperCase();
                    } else {
                        cleaned[key] = cleanSchema(s[key]);
                    }
                }
                return cleaned;
            };
            payload.generationConfig.responseSchema = cleanSchema(schema);
        }
    }

    try {
        console.log("processGoogleChat: Calling Gemini API endpoint:", endpoint, "payload size:", JSON.stringify(payload).length, "API key present:", !!apiKey);

        // Gemini typically accepts the API key as a query parameter
        const response = await fetch(`${endpoint}?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        console.log("processGoogleChat: Gemini response status:", response.status);

        if (!response.ok) {
            const errorMessage = await response.text();
            console.error("processGoogleChat: Gemini API returned error status:", response.status, errorMessage);
            await writeLog('error', 'processGoogleChat', `API Error: ${response.status} - ${errorMessage}`);
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();
        console.log("processGoogleChat: parsed JSON data:", data);

        // Extracting content from Gemini's nested response structure
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!content || content.length === 0) {
            console.error("processGoogleChat: No candidates or text returned. Full response payload:", data);
            await writeLog('error', 'processGoogleChat', 'No response returned from the API');
            throw new Error("No response returned from the API");
        }

        console.log("processGoogleChat: successfully generated style reference text!");

        let totalCost;

        // Cost calculation based on Gemini's usageMetadata
        if (data.usageMetadata) {
            const usage = data.usageMetadata;

            const inputCost = ((usage.promptTokenCount || 0) / 1_000_000) * inputCostPerMillion;
            const outputCost = ((usage.candidatesTokenCount || 0) / 1_000_000) * outputCostPerMillion;

            totalCost = inputCost + outputCost;
        } else {
            totalCost = 0;
        }

        return { content, totalCost };
    } catch (error: any) {
        console.error("processGoogleChat: caught error:", error);
        await writeLog('error', 'processGoogleChat', `Error: ${error.message}`);
        throw new Error(`Error: ${error.message}`, { cause: error });
    }
}