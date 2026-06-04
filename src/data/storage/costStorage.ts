import { readFile, writeFile } from "./fileStorage";
import { writeLog } from "@/data/storage/logStorage";

export async function storeCost(
    cost: number | (number | null | undefined)[] | null | undefined,
    type: 'summary' | 'image' = 'summary'
) {
    if (cost === null || cost === undefined) {
        return;
    }

    const validCosts: number[] = [];
    if (Array.isArray(cost)) {
        for (const c of cost) {
            if (c !== null && c !== undefined) {
                validCosts.push(c);
            }
        }
        if (validCosts.length === 0) {
            return;
        }
    } else {
        validCosts.push(cost);
    }

    let costs: unknown[] = [];

    try {
        const costsFile = await readFile('data/costs.json');
        const text = await costsFile.text();
        if (text) {
            const trimmed = text.trim();
            if (trimmed.startsWith('[')) {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    costs = parsed;
                }
            } else {
                costs = trimmed
                    .split('\n')
                    .map(line => line.trim())
                    .filter(Boolean)
                    .map(line => JSON.parse(line));
            }
        }
    } catch (err: unknown) {
        // If the file does not exist, we start with an empty array
        if (err instanceof Error) {
            if (err.name !== 'NotFoundError' && !err.message.includes('NotFoundError') && !err.message.includes('does not exist')) {
                await writeLog('error', 'storeCost', `Failed to read costs.json in storeCost: ${err.message}`);
                throw err;
            }
        } else {
            await writeLog('error', 'storeCost', `Failed to read costs.json in storeCost: ${String(err)}`);
            throw err;
        }
    }

    const date = new Date().toISOString();
    for (const vc of validCosts) {
        costs.push({ date, cost: vc, type });
    }

    const content = costs.map(item => JSON.stringify(item)).join('\n');
    await writeFile('data/costs.json', content);

    // Log the event
    await writeLog('info', 'llm', `LLM API query cost stored: $${validCosts.reduce((s, c) => s + c, 0).toFixed(5)} (${type})`);
}