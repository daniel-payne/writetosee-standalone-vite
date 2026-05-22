export default function generateTextDigest(input: string) {
    const text = input?.toString().toLowerCase().replace(' ', '')

    // Initialize hash components
    let hash1 = 0, hash2 = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        // First hash: same as before
        hash1 = ((hash1 << 5) - hash1) + char;
        hash1 = hash1 & hash1; // Convert to 32-bit integer
        // Second hash: different multiplier for variety
        hash2 = ((hash2 << 7) - hash2) + char;
        hash2 = hash2 & hash2; // Convert to 32-bit integer
    }

    // Convert hashes to hexadecimal for longer string
    const hash1Str = Math.abs(hash1).toString(16).padStart(8, '0');
    const hash2Str = Math.abs(hash2).toString(16).padStart(8, '0');

    return hash1Str + hash2Str;
}