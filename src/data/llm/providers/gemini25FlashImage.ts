import { GoogleGenAI } from "@google/genai";

type result = {
    success: boolean;
    text?: string;
    mimeType?: string;
    base64?: string;
    dataUrl?: string;
    reason?: string;

}

export default async function gemini25FlashImage(userPrompt: string, systemPrompt: string, apiKey: string, inlineUris: Array<any> = []): Promise<result> {
    if (!systemPrompt || !userPrompt || apiKey == null) {
        throw new Error("Prompt & Gemini API key is required");
    }

    // Try these in order — comment/uncomment to test
    const MODEL = "gemini-2.5-flash-image";
    // const MODEL = "gemini-2.5-flash-image-preview";
    // const MODEL = "gemini-2.5-flash-preview-image";

    const ai = new GoogleGenAI({ apiKey });

    const userParts = [
        { text: userPrompt }
    ]

    const systemParts = [
        { text: systemPrompt },
    ] as any

    const mimeType = "image/png"

    if (inlineUris.length > 0) {
        for (const fileUri of inlineUris) {
            try {
                // const response = await fetch(item);
                // if (!response.ok) {
                //     console.error(`Failed to fetch inline image from ${item}: ${response.statusText}`);
                //     continue;
                // }
                // const arrayBuffer = await response.arrayBuffer();
                // const base64 = Buffer.from(arrayBuffer).toString("base64");
                // const mimeType = response.headers.get("content-type") || "image/png";

                console.log(fileUri)

                systemParts.push({
                    // inlineData: {
                    //     mimeType,
                    //     fileUri
                    // }                
                    fileData: {
                        mimeType,
                        fileUri
                    }
                });
            } catch (err) {
                console.error(`Error downloading inline image from ${fileUri}:`, err);
            }
        }
    }

    try {
        console.info(`→ Sending to ${MODEL} ...`);

        const parts = [...systemParts, ...userParts]

        const modelInstructions = {
            model: MODEL,
            contents: [{
                // does not support systemInstruction
                parts
            }],
            config: {
                // responseMimeType: "image/png",
                imageConfig: {
                    aspectRatio: "1:1",
                    // imageSize: "1K"
                },
                responseModalities: ["IMAGE"]   // or ["TEXT", "IMAGE"] if you want both
            }
        }

        // console.info('===============================================================================')
        // console.info(parts.map(item => item.text ?? '').join(' '))

        const response = await ai.models.generateContent(modelInstructions);

        console.info(`← Received response`);

        return extractImageFromResponse(response);

    } catch (error: any) {
        console.error(`ERROR in LLM call: ${error.message}`);
        return { success: false, reason: error.message };
    }
}

/*

{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Optional descriptive text or caption (sometimes present)"
          },
          {
            "inlineData": {
              "mimeType": "image/png",          // or image/jpeg, etc.
              "data": "iVBORw0KGgoAAAANSUhEUgAA... (very long base64 string)"
            }
          }
        ]
      },
      "finishReason": "STOP",
      "safetyRatings": [ ... ],
      ...
    }
  ],
  "usageMetadata": { ... }
}

*/

function extractImageFromResponse(data: any): result {
    // Safely navigate the structure (add checks to avoid runtime errors)
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
        console.warn("No candidates in response – prompt may have been blocked");
        return { success: false };
    }

    const firstCandidate = candidates[0];
    const parts = firstCandidate?.content?.parts || [];

    let imageData: { mimeType: string; base64: string } | null = null;
    let optionalText: string | null = null;

    for (const part of parts) {
        if (part.text) {
            optionalText = part.text;  // e.g. a caption or explanation
        }
        if (part.inlineData && part.inlineData.data && part.inlineData.mimeType?.startsWith("image/")) {
            imageData = {
                mimeType: part.inlineData.mimeType,
                base64: part.inlineData.data
            };
            break;  // usually only one image per generation
        }
    }

    if (imageData) {
        const dataUrl = `data:${imageData.mimeType};base64,${imageData.base64}`;

        return {
            success: true,
            text: optionalText ?? undefined,
            mimeType: imageData.mimeType,
            base64: imageData.base64,
            dataUrl
        }

    } else {
        return { success: false }
    }
}
