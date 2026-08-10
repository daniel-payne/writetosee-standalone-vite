import llmGenerateText from "@/data/llm/llmGenerateText";
import { readFile } from "@/data/storage/fileStorage";
import { writeLog } from "@/data/storage/logStorage";

import { createStyleReferencePrompt } from "@/data/llm/prompts/createStyleReferencePrompt";

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

  const systemPrompt = createStyleReferencePrompt();
  const userPrompt = "Analyze this style reference image and produce drawing instructions.";

  const result = await llmGenerateText(systemPrompt, userPrompt, {
    mimeType,
    base64Data
  });

  if (!result || !result.content) {
    throw new Error("Failed to generate style reference text from LLM");
  }

  return result.content;
}
