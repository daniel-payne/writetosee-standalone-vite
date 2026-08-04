import llmGenerateText from "@/data/llm/llmGenerateText"

const PROMPT = `
You are an expert story compiler. Your task is to write a highly concise, plot-driven summary of the following story text.

Strict Constraints:
1. Your summary must be 50 words or less.
2. Do not include introductory text, headers, or metadata (e.g., do not say "This text is about...").
3. Output only the plain text summary in a single paragraph.

Focus on:
- Who is the main character in this text?
- What is the primary setting?
- What is the main conflict, event, or change that occurs?
- How does the text end?

<text>
{{TEXT}}
</text>
`



export default async function generateLlmSummary(text: string): Promise<string> {
    const prompt = PROMPT.replace('{{TEXT}}', text)

    const result = await llmGenerateText("", prompt);
    return result.content || "";
}