import { readFile } from "@/data/storage/fileStorage";
import { writeLog } from "@/data/storage/logStorage";

export interface CostRecord {
  date: string;
  cost: number;
  type?: 'summary' | 'image';
}

export async function clientLoader() {
  try {
    let costs: CostRecord[] = [];
    try {
      const file = await readFile('data/costs.json');
      const text = await file.text();
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
      const error = err as Error;
      if (error.name !== 'NotFoundError' && !error.message?.includes('NotFoundError') && !error.message?.includes('does not exist')) {
        await writeLog('error', 'Costs.loader', `Failed to read costs.json: ${error.message}`);
      }
    }

    return { costs };
  } catch (error) {
    await writeLog('error', 'Costs.loader', `Failed to load costs in loader: ${error instanceof Error ? error.message : String(error)}`);
    return { costs: [] };
  }
}
