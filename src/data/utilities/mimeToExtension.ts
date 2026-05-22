export default function mimeToExtension(mime?: string): string | undefined {
    if (!mime) return undefined;
    const map: Record<string, string> = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/svg+xml": "svg",
        "image/bmp": "bmp",
    };
    return map[mime.toLowerCase()];
}
