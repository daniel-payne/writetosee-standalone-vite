import llmGenerateText from "../llm/llmGenerateText";
import { readFile } from "../storage/fileStorage";
import generateTextDigest from "../utilities/generateTextDigest";

const MIN_SUMMARIZATION_LENGTH = 300;

const SYSTEM_PROMPT = `
You are an assistant specialized in narrative summarization. 
Your sole task is to analyze the story provided by the user and generate a highly concise summary.

Adhere strictly to the following guidelines:
1. Length: The summary must be approximately 50 words.
2. Content: Focus only on the main characters, the primary conflict, and the resolution. Omit minor details, subplots, and secondary characters.
3. Tone: Maintain a neutral, objective, and direct tone.
4. Output Format: Provide only the summary itself. Do not include introductory or concluding phrases (such as "Here is your summary:" or "In this story...").
`;

const USER_PROMPT = `
<text>
{{TEXT}}
</text>
`;

async function getSummary(text: string): Promise<string> {
    return await llmGenerateText(SYSTEM_PROMPT, USER_PROMPT.replace('{{TEXT}}', text));
}

async function generateTextSummary(item: Record<string, any>): Promise<void> {
    const text = item.text;

    if (!text || text.length < MIN_SUMMARIZATION_LENGTH) {
        return;
    }

    item.digest = generateTextDigest(text);

    try {
        const file = await readFile(`summaries/${item.digest}.md`);

        item.summary = await file.text();
    } catch (error: any) {
        if (error.name === 'NotFoundError') {
            item.summary = await getSummary(text);
        } else {
            console.error("An unexpected error occurred:", error);
        }
    }
}

export default async function generateTextSummaries(publication: Record<string, any>): Promise<void> {
    const items = [...(publication.pages || []), ...(publication.chapters || [])];

    await Promise.all(items.map(item => generateTextSummary(item)));
}