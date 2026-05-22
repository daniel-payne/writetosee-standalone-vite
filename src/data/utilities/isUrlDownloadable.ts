import { stat } from "node:fs/promises";

/**
 * Checks if a given URL or file path points to a downloadable asset.
 * For HTTP/HTTPS URLs, it attempts a HEAD request (falling back to GET).
 * For local file paths, it verifies the file exists on disk.
 */
export default async function isUrlDownloadable(url: string): Promise<boolean> {
    if (!url) return false;

    if (url.startsWith("http://") || url.startsWith("https://")) {
        try {
            const response = await fetch(url, { method: "HEAD", redirect: "follow" });
            if (response.ok) return true;

            // Fallback to GET for servers that reject HEAD requests
            const getResponse = await fetch(url, { method: "GET", redirect: "follow" });
            if (getResponse.body) {
                // Cancel the stream to avoid fully downloading large files
                await getResponse.body.cancel();
            }
            return getResponse.ok;
        } catch (error) {
            console.error(`Error checking if URL is downloadable (${url}):`, error);
            return false;
        }
    }

    // Not an HTTP URL, assume it's a local file path
    try {
        const stats = await stat(url);
        return stats.isFile();
    } catch (error) {
        // File doesn't exist or isn't accessible
        return false;
    }
}
