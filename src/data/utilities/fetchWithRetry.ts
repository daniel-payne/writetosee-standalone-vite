import { writeLog } from "@/data/storage/logStorage";

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 2000;

export default async function fetchWithRetry(
    url: string,
    options: any,
    maxRetries = MAX_RETRIES
): Promise<Response> {
    let delay = RETRY_DELAY_MS;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await fetch(url, options);
        if (response.status === 429) {
            await writeLog('warn', 'fetchWithRetry', `Rate limit hit (429). Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
        }
        return response;
    }
    return fetch(url, options);
}
