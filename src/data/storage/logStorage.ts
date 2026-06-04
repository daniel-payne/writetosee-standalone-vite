import { readFile, writeFile } from "../storage/fileStorage";

export interface LogEntry {
    datetime: string;
    type: string;
    source: string;
    message: string;
}

let isWritingLog = false;

export async function writeLog(
    type: string,
    source: string,
    message: string
): Promise<void> {
    if (isWritingLog) {
        console.warn(`[Recursive Log Fallback] [${type}] [${source}]: ${message}`);
        return;
    }
    isWritingLog = true;
    try {
        let logs: LogEntry[] = [];

        try {
            const file = await readFile('data/logs.json');
            const text = await file.text();
            if (text) {
                const trimmed = text.trim();
                if (trimmed.startsWith('[')) {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        // Map old structure keys to new keys if any exist
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
            if (error.name !== 'NotFoundError' && !error.message?.includes('NotFoundError') && !error.message?.includes('does not exist')) {
                console.warn("Error reading logs file:", err);
            }
        }

        const newEntry: LogEntry = {
            datetime: new Date().toISOString(),
            type,
            source,
            message,
        };

        logs.push(newEntry);

        // Keep last 200 logs
        if (logs.length > 200) {
            logs = logs.slice(logs.length - 200);
        }

        const content = logs.map(item => JSON.stringify(item)).join('\n');
        await writeFile('data/logs.json', content);
    } catch (e) {
        console.warn("Failed to store log:", e);
    } finally {
        isWritingLog = false;
    }
}

export async function clearLogs(): Promise<void> {
    try {
        await writeFile('data/logs.json', '[]');
    } catch (e) {
        console.warn("Failed to clear logs:", e);
    }
}
