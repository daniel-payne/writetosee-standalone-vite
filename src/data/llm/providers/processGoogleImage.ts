function extractMarkdownImages(text: string) {
    // Regex to match ![description](url)
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;

    // Find all matches in the text
    const matches = [...text.matchAll(regex)];

    // Map the results to your desired object structure
    return matches.map(match => ({
        description: match[1], // The text inside the square brackets []
        url: match[2]          // The URL inside the parentheses ()
    }));
}

type props = {
    imagePrompt: string;
    apiKey: string;
    references?: string[];
    node?: { status: (status: any) => void } | null;
    model?: string;
    inputCostPerMillion?: number;
    outputCostPerMillion?: number;
}

type response = {
    content: string;
    totalCost: number;
}

export default async function processGoogleImage({
    imagePrompt,
    apiKey,
    references: _references = [],
    node = null,
    model = "gemini-2.5-flash-image",
    inputCostPerMillion = 0.30,
    outputCostPerMillion = 30.00
}: props): Promise<response> {
    try {
        node?.status({ fill: "green", shape: "dot", text: "processing" });

        const imageParts: any[] = [];

        const markdownImages = extractMarkdownImages(imagePrompt);

        if (markdownImages?.length > 0) {

            imageParts.push({ text: "Here are the reference images. Please pay attention to the descriptions for each:" });

            for (const markdownImage of markdownImages) {
                imageParts.push({ text: `The following image contains an image to be used as the basis for drawing ${markdownImage.description}` });

                imageParts.push({
                    fileData: {
                        mimeType: 'image/png',
                        fileUri: markdownImage.url
                    }
                });
            }

            imageParts.push({ text: "Now, based on these characters, please generate an image from these instructions" });
        }


        // Force 1:1 aspect ratio in prompt text
        const promptWithAspectRatio = imagePrompt.trim().endsWith(".")
            ? `${imagePrompt} Ensure the output image has a 1:1 square aspect ratio.`
            : `${imagePrompt}. Ensure the output image has a 1:1 square aspect ratio.`;
        imageParts.push({ text: promptWithAspectRatio });

        const body = {
            contents: [
                {
                    parts: imageParts
                }
            ],
            // 1. MUST BE 'generationConfig', not 'config'
            generationConfig: {
                responseModalities: ["IMAGE"], // Forces the model to output an image
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            node?.status({ fill: "red", shape: "dot", text: `API Error: ${response.status} ${errorText}` });
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // 2. Extract the Base64 image data from Gemini's specific response structure
        const parts: any[] = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData);

        if (!imagePart) {
            node?.status({ fill: "red", shape: "dot", text: "No image returned from the API" });

            throw new Error("No image data returned from the API. Check prompt/model configuration.");
        }

        const base64Data = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType || 'image/jpeg';

        // 3. Create a Data URL (This can be used anywhere a normal image URL is used, like <img src="...">)
        const content = `data:${mimeType};base64,${base64Data}`;

        let totalCost: number;

        // Cost calculation based on Gemini's usageMetadata
        if (data.usageMetadata) {
            const usage = data.usageMetadata;

            const inputCost = ((usage.promptTokenCount || 0) / 1_000_000) * inputCostPerMillion;
            const outputCost = ((usage.candidatesTokenCount || 0) / 1_000_000) * outputCostPerMillion;

            totalCost = inputCost + outputCost;
        } else {
            totalCost = 0;
        }

        // Output cost rounded to 6 decimal places for readability
        node?.status({ fill: "grey", shape: "ring", text: "completed " + (typeof totalCost === 'number' ? `$${totalCost.toFixed(6)}` : totalCost) });


        return { content, totalCost };
    } catch (error: any) {
        node?.status({ fill: "red", shape: "dot", text: error.message || error });
        throw new Error(`Error: ${error.message}`);
    }
}
