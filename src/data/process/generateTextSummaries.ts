import llmGenerateText from "../llm/llmGenerateText";
import { readFile, writeFile } from "../storage/fileStorage";
import generateTextDigest from "../utilities/generateTextDigest";
import storeCost from "../llm/storeCost";

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

interface SummaryItem {
    digest?: string;
    text?: string;
    summary?: string;
}

interface PublicationData {
    predicates: any[];
    pages?: SummaryItem[];
    chapters?: SummaryItem[];
    paragraphs?: SummaryItem[];
}

async function generateTextSummary(item: SummaryItem): Promise<number | null> {
    const text = item.text;

    if (!text || text.length < MIN_SUMMARIZATION_LENGTH) {
        return null;
    }

    const digest = item.digest || generateTextDigest(text);
    item.digest = digest;

    try {
        const file = await readFile(`summaries/${digest}.txt`);

        item.summary = await file.text();
        return null;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'NotFoundError') {
            const userPrompt = USER_PROMPT
                .replace('{{TEXT}}', text)
                .trim();

            const { content, totalCost } = await llmGenerateText(SYSTEM_PROMPT, userPrompt);
            const contentString = content || '';
            item.summary = contentString;

            try {
                await writeFile(`summaries/${digest}.txt`, contentString);
            } catch (writeError) {
                console.error("Failed to write summary cache file:", writeError);
            }

            return totalCost ?? null;
        } else {
            console.error("An unexpected error occurred:", error);
            return null;
        }
    }
}

export default async function generateTextSummaries(publication: PublicationData): Promise<void> {
    const items = [
        ...(publication.pages || []),
        ...(publication.chapters || []),
        ...(publication.predicates || []),
    ];

    // Filter items that have text and meet the minimum length
    const itemsToProcess = items.filter(item => item.text && item.text.length >= MIN_SUMMARIZATION_LENGTH);

    // Group items by their digest
    const digestToItems = new Map<string, SummaryItem[]>();
    for (const item of itemsToProcess) {
        const digest = item.digest || generateTextDigest(item.text!);
        item.digest = digest;

        let list = digestToItems.get(digest);
        if (!list) {
            list = [];
            digestToItems.set(digest, list);
        }
        list.push(item);
    }

    const uniqueDigests = Array.from(digestToItems.keys());

    // Process unique digests in parallel
    const costs = await Promise.all(uniqueDigests.map(async (digest) => {
        const list = digestToItems.get(digest)!;
        const representativeItem = list[0];

        // Generate summary for the representative item
        const cost = await generateTextSummary(representativeItem);

        // Copy the generated summary to all other duplicate items
        const summary = representativeItem.summary;
        for (const item of list) {
            item.summary = summary;
        }

        return cost;
    }));

    const validCosts = costs.filter((cost): cost is number => cost !== null && cost !== undefined);

    if (validCosts.length > 0) {
        await storeCost(validCosts);
    }
}