import llmGenerateText from "@/data/llm/llmGenerateText";
import { readFile } from "@/data/storage/fileStorage";
import { writeLog } from "@/data/storage/logStorage";

async function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export default async function generateStyleReference(referenceUrl: string): Promise<string> {
  if (!referenceUrl) {
    throw new Error("Reference URL is empty");
  }

  await writeLog('info', 'generateStyleReference', `Analyzing style reference image: ${referenceUrl}`);

  const file = await readFile(referenceUrl);

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || "image/png";

  const systemPrompt = `You are a professional art director and style analyzer for AI image generation.
Analyze the style reference image provided. Generate a precise, detailed list of drawing instructions that capture its artistic style, medium, coloring, lighting, composition, mood, and characters.
Each point should be a clear descriptive instruction.
Do NOT use markdown headers, bullet points (like -, *, or numbers), or lists in your output.
Return ONLY the description sentences, each sentence on its own line.
Output 5 to 8 lines.`;

  const userPrompt = `Analyze this image and produce 5 to 8 detailed drawing instruction sentences, with each sentence on a new line. Focus on the art style, colors, lighting, medium, shapes, and character design.`;

  const result = await llmGenerateText(systemPrompt, userPrompt, {
    mimeType,
    base64Data
  });

  if (!result || !result.content) {
    throw new Error("Failed to generate style reference text from LLM");
  }

  return result.content;
}
