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

export default async function processOpenRouterAnalysis({
  systemPrompt,
  userPrompt,
  apiKey,
  model = "qwen/qwen-2.5-vl-72b-instruct",
  inputCostPerMillion = 0.20,
  outputCostPerMillion = 0.50,
  image
}: Props): Promise<Response> {
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";

  const userMessageContent = [
    {
      type: "text",
      text: userPrompt
    },
    {
      type: "image_url",
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64Data}`
      }
    }
  ];

  const payload = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      {
        role: "user",
        content: userMessageContent
      }
    ],
    temperature: 0.5,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
        "X-Title": "WriteToSee"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      await writeLog('error', 'processOpenRouterAnalysis', `API Error: ${response.status} - ${errorMessage}`);
      throw new Error(`API Error: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content || content.trim().length === 0) {
      await writeLog('error', 'processOpenRouterAnalysis', 'No response content returned from API');
      throw new Error("No response content returned from the API");
    }

    let totalCost = 0;
    if (data.usage) {
      const usage = data.usage;
      const inputCost = (usage.prompt_tokens / 1_000_000) * inputCostPerMillion;
      const outputCost = (usage.completion_tokens / 1_000_000) * outputCostPerMillion;
      totalCost = inputCost + outputCost;
    }

    return { content, totalCost };
  } catch (error: any) {
    await writeLog('error', 'processOpenRouterAnalysis', `Error: ${error.message}`);
    throw new Error(`Error: ${error.message}`, { cause: error });
  }
}
