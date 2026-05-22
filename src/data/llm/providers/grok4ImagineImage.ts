
type result = {
    success: boolean;
    text?: string;
    mimeType?: string;
    base64?: string;
    dataUrl?: string;
    reason?: string;
}

/**
 * Generates an image using xAI's Grok Imagine API.
 * 
 * @param userPrompt The prompt for the image generation
 * @param systemPrompt Optional system context (prepended to user prompt)
 * @param apiKey xAI API Key
 * @param inlineUris Not currently supported for xAI image generation (placeholder for compatibility)
 * @returns result object including the base64 image data
 */
export default async function xaiImage(
    userPrompt: string, 
    systemPrompt: string, 
    apiKey: string, 
    inlineUris: Array<any> = []
): Promise<result> {
    
    if (!userPrompt || apiKey == null) {
        throw new Error("Prompt & xAI API key is required");
    }

    // Official xAI image generation model
    const MODEL = "grok-imagine-image";
    const API_URL = "https://api.x.ai/v1/images/generations";

    // Combine system and user prompts for xAI as it uses a single prompt field
    const combinedPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;

    try {
        console.info(`→ Sending to xAI ${MODEL} ...`);

        if (inlineUris.length > 0) {
            console.warn("xAI image generation does not currently support input images (inlineUris). These will be ignored.");
        }

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: MODEL,
                prompt: combinedPrompt,
                response_format: "b64_json"
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }

        const data: any = await response.json();
        console.info(`← Received response from xAI`);

        if (data.data && data.data.length > 0) {
            const imageData = data.data[0];
            const base64 = imageData.b64_json;
            const mimeType = "image/png"; // Standard for xAI b64 response
            const dataUrl = `data:${mimeType};base64,${base64}`;

            return {
                success: true,
                mimeType: mimeType,
                base64: base64,
                dataUrl: dataUrl,
                text: imageData.revised_prompt // Optional: xAI might return a revised prompt
            };
        } else {
            return { 
                success: false, 
                reason: "No image data in response" 
            };
        }

    } catch (error: any) {
        console.error(`ERROR in xAI LLM call: ${error.message}`);
        return { 
            success: false, 
            reason: error.message 
        };
    }
}
