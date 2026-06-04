export default function generateTextDigest(input: string | null | undefined): string {
    if (input == null) {
        return "";
    }

    // Strip all whitespace and convert to lowercase
    const text = input.toString().toLowerCase().replace(/\s+/g, '');

    let hash1 = 0;
    let hash2 = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);

        // Hash 1
        hash1 = ((hash1 << 5) - hash1) + char;
        hash1 = hash1 & hash1; // 32-bit signed int

        // Hash 2
        hash2 = ((hash2 << 7) - hash2) + char;
        hash2 = hash2 & hash2; // 32-bit signed int
    }

    // Convert to unsigned 32-bit integers, then to hex strings padded to 8 chars
    const hash1Str = (hash1 >>> 0).toString(16).padStart(8, '0');
    const hash2Str = (hash2 >>> 0).toString(16).padStart(8, '0');

    return (hash1Str + hash2Str).toUpperCase();
}
