import * as fileStorage from "@/data/storage/fileStorage";
import { writeLog } from "@/data/storage/logStorage";

export interface LogRecord {
  datetime: string;
  type: string;
  source: string;
  message: string;
}

export async function clientLoader() {
  try {
    const hasDir = await fileStorage.hasSavedDirectory();
    if (!hasDir) {
      return { logs: [], error: "No local directory is connected. Please connect a directory on the Welcome page." };
    }

    // This will prompt for permission if needed or return the handle
    const handle = await fileStorage.getDirectoryHandle();
    if (!handle) {
      return { logs: [], error: "No local directory is connected. Please connect a directory on the Welcome page." };
    }

    let logs: LogRecord[] = [];
    try {
      const file = await fileStorage.readFile('data/logs.json');
      const text = await file.text();
      if (text) {
        const trimmed = text.trim();
        if (trimmed.startsWith('[')) {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            logs = parsed.map((item: any) => ({
              datetime: item.datetime || item.date || new Date().toISOString(),
              type: item.type || item.level || 'info',
              source: item.source || 'system',
              message: item.message || '',
            }));
          }
        } else {
          logs = trimmed
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
              const item = JSON.parse(line);
              return {
                datetime: item.datetime || item.date || new Date().toISOString(),
                type: item.type || item.level || 'info',
                source: item.source || 'system',
                message: item.message || '',
              };
            });
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotFoundError' || error.message?.includes('NotFoundError') || error.message?.includes('does not exist')) {
        return { logs: [], warning: "logs.json not found in the connected directory." };
      } else {
        await writeLog('error', 'Logs.loader', `Failed to read logs.json: ${error.message}`);
        return { logs: [], error: `Failed to read logs: ${error.message}` };
      }
    }

    return { logs };
  } catch (error: any) {
    await writeLog('error', 'Logs.loader', `Failed to load logs in loader: ${error instanceof Error ? error.message : String(error)}`);
    return { logs: [], error: error.message || "Failed to load directory or logs." };
  }
}
