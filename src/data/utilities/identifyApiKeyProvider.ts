type ApiKeyProvider = 'GOOGLE' | 'XAI' | 'UNKNOWN';

/**
 * Identifies if an API key is from Google (Gemini) or xAI (Grok).
 * 
 * @param apiKey The API key string to check.
 * @returns 'GOOGLE', 'XAI', or 'UNKNOWN'
 */
export function identifyApiKeyProvider(apiKey: string): ApiKeyProvider {
    if (!apiKey) {
        return 'UNKNOWN';
    }

    const trimmedKey = apiKey.trim();

    // xAI API keys start with the prefix 'xai-'
    if (trimmedKey.startsWith('xai-')) {
        return 'XAI';
    }

    // Google API keys start with the 'AIza' prefix (traditional) or 'AQ.' (new AI Studio keys)
    if (trimmedKey.startsWith('AIza') || trimmedKey.startsWith('AQ.')) {
        return 'GOOGLE';
    }

    return 'UNKNOWN';
}