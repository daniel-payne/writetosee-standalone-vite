import { writeLog } from "@/data/storage/logStorage";
import { readFile } from "@/data/storage/fileStorage";
import extractMarkdownImages from "@/data/utilities/extractMarkdownImages";

type props = {
    imagePrompt: string;
    apiKey: string;
    references?: string[];
    model?: string;
    inputCostPerMillion?: number;
    outputCostPerMillion?: number;
}

type response = {
    content: string;
    totalCost: number;
}

export default async function processOpenRouterImage({
    imagePrompt,
    apiKey,
    references: _references = [],
    model = "openai/gpt-5-image-mini",
    inputCostPerMillion = 2.50,
    outputCostPerMillion = 2.00
}: props): Promise<response> {
    try {
        const markdownImages = extractMarkdownImages(imagePrompt);
        const cleanPrompt = imagePrompt.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1');

        let messageContent: any = "";

        if (markdownImages && markdownImages.length > 0) {
            const contentBlocks: any[] = [];
            contentBlocks.push({
                type: "text",
                text: "Here are the reference images. Please pay attention to the descriptions for each style/character:"
            });

            for (const markdownImage of markdownImages) {
                try {
                    const file = await readFile(markdownImage.url);
                    const base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = reader.result as string;
                            resolve(result.split(',')[1]);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });

                    contentBlocks.push({
                        type: "text",
                        text: `Reference image for: ${markdownImage.description}`
                    });
                    contentBlocks.push({
                        type: "image_url",
                        image_url: {
                            url: `data:${file.type || 'image/png'};base64,${base64Data}`
                        }
                    });
                } catch (err: any) {
                    console.warn(`Failed to load reference image: ${markdownImage.url}`, err);
                }
            }

            const promptWithAspectRatio = cleanPrompt.trim().endsWith(".")
                ? `${cleanPrompt} Ensure the output image has a 1:1 square aspect ratio.`
                : `${cleanPrompt}. Ensure the output image has a 1:1 square aspect ratio.`;

            contentBlocks.push({
                type: "text",
                text: `Now, based on those references, please generate a new image matching this prompt: ${promptWithAspectRatio}`
            });

            messageContent = contentBlocks;
        } else {
            const promptWithAspectRatio = cleanPrompt.trim().endsWith(".")
                ? `${cleanPrompt} Ensure the output image has a 1:1 square aspect ratio.`
                : `${cleanPrompt}. Ensure the output image has a 1:1 square aspect ratio.`;
            messageContent = promptWithAspectRatio;
        }

        const body = {
            model,
            messages: [
                {
                    role: "user",
                    content: messageContent
                }
            ],
            modalities: ["image", "text"]
        };

        const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
                "X-Title": "WriteToSee"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            await writeLog('error', 'processOpenRouterImage', `API Error: ${response.status} - ${errorText}`);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        const message = data.choices?.[0]?.message;
        const images = message?.images;
        
        let base64Url = "";
        if (images && images.length > 0) {
            const firstImg = images[0];
            base64Url = firstImg.image_url?.url || firstImg.url || (typeof firstImg === 'string' ? firstImg : "");
        }

        if (!base64Url) {
            if (message?.content) {
                await writeLog('error', 'processOpenRouterImage', `OpenRouter model returned a text response instead of an image: ${message.content}`);
                throw new Error(`OpenRouter model returned a text response instead of an image: "${message.content}"`);
            }
            await writeLog('error', 'processOpenRouterImage', `No image data returned from OpenRouter API. Response: ${JSON.stringify(data)}`);
            throw new Error(`No image data returned from the OpenRouter API. Response: ${JSON.stringify(data)}`);
        }

        // Ensure it starts with standard data URI prefix
        const content = base64Url.startsWith('data:') ? base64Url : `data:image/png;base64,${base64Url}`;
        
        let totalCost = 0;
        if (data.usage) {
            const usage = data.usage;
            const inputCost = (usage.prompt_tokens / 1_000_000) * inputCostPerMillion;
            const outputCost = (usage.completion_tokens / 1_000_000) * outputCostPerMillion;
            totalCost = inputCost + outputCost;
        }

        return { content, totalCost };
    } catch (error: any) {
        await writeLog('error', 'processOpenRouterImage', `Error: ${error.message}`);
        throw new Error(`Error: ${error.message}`, { cause: error });
    }
}
