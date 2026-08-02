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

function formatOpenRouterError(errorText: string, status: number): string {
    try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error) {
            const err = parsed.error;
            let msg = err.message || `API Error ${status}`;
            if (err.metadata?.raw) {
                try {
                    const raw = typeof err.metadata.raw === 'string' ? JSON.parse(err.metadata.raw) : err.metadata.raw;
                    const reasons = raw?.details?.["Moderation Reasons"];
                    if (reasons && Array.isArray(reasons)) {
                        return `${msg}: ${raw.status || 'Moderated'} (${reasons.join(', ')})`;
                    } else if (raw?.status) {
                        return `${msg}: ${raw.status}`;
                    }
                } catch {
                    // ignore raw parse error
                }
            }
            return msg;
        }
    } catch {
        // fallback
    }
    return `API Error ${status}: ${errorText}`;
}

export default async function processOpenRouterImage({
    imagePrompt,
    apiKey,
    references: _references = [],
    model = "black-forest-labs/flux.2-pro",
    inputCostPerMillion = 0.00,
    outputCostPerMillion = 0.00
}: props): Promise<response> {
    try {
        await writeLog('info', 'processOpenRouterImage', `Sending request to OpenRouter model: ${model}`);

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
                    await writeLog('warning', 'processOpenRouterImage', `Could not load reference image ${markdownImage.url}: ${err.message || String(err)}`);
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
            modalities: ["image"]
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
            const formattedError = formatOpenRouterError(errorText, response.status);
            await writeLog('error', 'processOpenRouterImage', `OpenRouter HTTP ${response.status} Error: ${formattedError}`);
            throw new Error(formattedError);
        }

        const data = await response.json();

        const message = data.choices?.[0]?.message;
        const images = message?.images;

        let base64Url = "";

        // 1. Check message.images array
        if (images && Array.isArray(images) && images.length > 0) {
            const firstImg = images[0];
            if (typeof firstImg === 'string') {
                base64Url = firstImg;
            } else if (firstImg && typeof firstImg === 'object') {
                base64Url = firstImg.image_url?.url || firstImg.url || firstImg.b64_json || "";
                if (firstImg.b64_json && !firstImg.b64_json.startsWith('data:')) {
                    base64Url = `data:image/png;base64,${firstImg.b64_json}`;
                }
            }
        }

        // 2. Check message.content
        if (!base64Url && message?.content) {
            if (typeof message.content === 'string') {
                const str = message.content.trim();
                if (str.startsWith('data:image') || str.startsWith('http://') || str.startsWith('https://')) {
                    base64Url = str;
                } else {
                    const markdownMatch = str.match(/!\[.*?\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/);
                    const urlMatch = str.match(/(https?:\/\/[^\s"')]+)/) || str.match(/(data:image\/[a-zA-Z]+;base64,[^\s"')]+)/);
                    if (markdownMatch) {
                        base64Url = markdownMatch[1];
                    } else if (urlMatch) {
                        base64Url = urlMatch[1];
                    }
                }
            } else if (Array.isArray(message.content)) {
                for (const part of message.content) {
                    if (part.type === 'image_url' && part.image_url?.url) {
                        base64Url = part.image_url.url;
                        break;
                    } else if (part.type === 'image' && part.image_url) {
                        base64Url = typeof part.image_url === 'string' ? part.image_url : part.image_url.url;
                        break;
                    } else if (part.text && typeof part.text === 'string') {
                        const urlMatch = part.text.match(/(https?:\/\/[^\s"')]+)/) || part.text.match(/(data:image\/[a-zA-Z]+;base64,[^\s"')]+)/);
                        if (urlMatch) {
                            base64Url = urlMatch[1];
                            break;
                        }
                    }
                }
            }
        }

        if (!base64Url) {
            const rawDataStr = JSON.stringify(data);
            await writeLog('error', 'processOpenRouterImage', `No image URL found in OpenRouter response. Raw payload: ${rawDataStr}`);
            let errorMsg = `No image data returned from OpenRouter API. Response payload: ${rawDataStr.substring(0, 250)}`;
            if (message?.content && typeof message.content === 'string' && !message.content.includes('http')) {
                errorMsg = `OpenRouter returned text instead of an image: "${message.content}"`;
            }
            throw new Error(errorMsg);
        }

        let content = "";
        if (base64Url.startsWith('http://') || base64Url.startsWith('https://')) {
            const imgRes = await fetch(base64Url);
            if (!imgRes.ok) {
                const imgErr = `Failed to download generated image from URL: ${base64Url} (Status ${imgRes.status})`;
                await writeLog('error', 'processOpenRouterImage', imgErr);
                throw new Error(imgErr);
            }
            const blob = await imgRes.blob();
            content = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } else {
            content = base64Url.startsWith('data:') ? base64Url : `data:image/png;base64,${base64Url}`;
        }

        let totalCost = 0;
        if (data.usage) {
            const usage = data.usage;
            const inputCost = ((usage.prompt_tokens || 0) / 1_000_000) * inputCostPerMillion;
            const outputCost = ((usage.completion_tokens || 0) / 1_000_000) * outputCostPerMillion;
            totalCost = inputCost + outputCost;
        }

        await writeLog('info', 'processOpenRouterImage', `Successfully generated image with model ${model}`);
        return { content, totalCost };
    } catch (error: any) {
        await writeLog('error', 'processOpenRouterImage', `Failed: ${error.message || String(error)}`);
        throw error;
    }
}
