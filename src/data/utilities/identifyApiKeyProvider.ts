type ApiKeyProvider = 'GOOGLE' | 'XAI' | 'OPENROUTER' | 'UNKNOWN';

/**
 * Identifies if an API key is from Google (Gemini), xAI (Grok), or OpenRouter.
 * 
 * @param apiKey The API key string to check.
 * @returns 'GOOGLE', 'XAI', 'OPENROUTER', or 'UNKNOWN'
 */
export function identifyApiKeyProvider(apiKey: string): ApiKeyProvider {
    if (!apiKey) {
        return 'UNKNOWN';
    }

    const trimmedKey = apiKey.trim();

    // OpenRouter API keys start with 'sk-or-v1-' or general 'sk-or-'
    if (trimmedKey.startsWith('sk-or-v1-') || trimmedKey.startsWith('sk-or-')) {
        return 'OPENROUTER';
    }

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