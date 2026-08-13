export type LLMProvider = 'google' | 'xai' | 'openRouter';

export interface ModelDefinition {
    name: string;
    provider: LLMProvider;
    input: number;
    output: number;
    imageEstimate?: number;
    estimatedCostPerImage?: number;
    isDefault?: boolean;
}

export const TEXT_SUMMARIZATION_MODELS: ModelDefinition[] = [
    // Google
    { name: 'gemini-2.5-flash-lite', provider: 'google', input: 0.10, output: 0.40, isDefault: true },
    { name: 'gemini-2.5-flash', provider: 'google', input: 0.15, output: 0.60 },
    { name: 'gemini-3.1-flash', provider: 'google', input: 0.50, output: 2.00 },
    { name: 'gemini-3-pro', provider: 'google', input: 1.25, output: 5.00 },

    // xAI
    { name: 'grok-4-1-fast-non-reasoning', provider: 'xai', input: 0.20, output: 0.50 },
    { name: 'grok-4-fast', provider: 'xai', input: 0.20, output: 0.50, isDefault: true },
    { name: 'grok-3-mini', provider: 'xai', input: 0.25, output: 0.50 },

    // OpenRouter
    { name: 'google/gemini-2.5-flash-lite', provider: 'openRouter', input: 0.10, output: 0.40, isDefault: true },
    { name: 'google/gemini-2.5-flash', provider: 'openRouter', input: 0.30, output: 2.50 },
    { name: 'meta-llama/llama-3.1-8b-instruct', provider: 'openRouter', input: 0.20, output: 0.50 },
    { name: 'x-ai/grok-4-fast', provider: 'openRouter', input: 0.20, output: 0.50 },
    { name: 'x-ai/grok-3-mini', provider: 'openRouter', input: 0.25, output: 0.50 },
];

export const IMAGE_GENERATION_MODELS: ModelDefinition[] = [
    // Google
    { name: 'gemini-3.1-flash-image', provider: 'google', input: 0.50, output: 3.00, imageEstimate: 0.067, isDefault: true },
    { name: 'gemini-3.1-flash-image-preview', provider: 'google', input: 0.50, output: 3.00, imageEstimate: 0.067 },
    { name: 'gemini-3.1-flash-lite-image', provider: 'google', input: 0.25, output: 1.50, imageEstimate: 0.015 },
    { name: 'gemini-3-pro-image', provider: 'google', input: 2.00, output: 12.00, imageEstimate: 0.134 },
    { name: 'gemini-3-pro-image-preview', provider: 'google', input: 2.00, output: 12.00, imageEstimate: 0.134 },
    { name: 'imagen-4.0-generate-001', provider: 'google', input: 0.00, output: 40.00, imageEstimate: 0.040 },

    // xAI
    { name: 'grok-imagine-image', provider: 'xai', input: 0.00, output: 20.00, imageEstimate: 0.020, isDefault: true },
    { name: 'grok-imagine-image-quality', provider: 'xai', input: 0.00, output: 50.00, imageEstimate: 0.050 },
    { name: 'grok-imagine-image-2.0', provider: 'xai', input: 0.00, output: 60.00, imageEstimate: 0.060 },

    // OpenRouter
    { name: 'google/gemini-3.1-flash-lite-image', provider: 'openRouter', input: 0.25, output: 1.50, imageEstimate: 0.015 },
    { name: 'google/gemini-3.1-flash-image', provider: 'openRouter', input: 0.50, output: 3.00, imageEstimate: 0.067 },
    { name: 'google/gemini-3.1-flash-image-preview', provider: 'openRouter', input: 0.50, output: 3.00, imageEstimate: 0.067 },
    { name: 'google/gemini-3-pro-image', provider: 'openRouter', input: 2.00, output: 12.00, imageEstimate: 0.134 },
    { name: 'google/gemini-3-pro-image-preview', provider: 'openRouter', input: 2.00, output: 12.00, imageEstimate: 0.134 },
    { name: 'google/gemini-2.5-flash-image', provider: 'openRouter', input: 0.30, output: 2.50, imageEstimate: 0.030, isDefault: true },
    { name: 'google/gemini-2.5-flash-image-preview', provider: 'openRouter', input: 0.30, output: 2.50, imageEstimate: 0.030 },

    { name: 'x-ai/grok-imagine-image-quality', provider: 'openRouter', input: 0.00, output: 50.00, imageEstimate: 0.050 },

    { name: 'black-forest-labs/flux.2-flex', provider: 'openRouter', input: 0.00, output: 120.00, imageEstimate: 0.120 },
    { name: 'black-forest-labs/flux.2-klein-4b', provider: 'openRouter', input: 0.00, output: 15.00, imageEstimate: 0.015 },
    { name: 'black-forest-labs/flux.2-max', provider: 'openRouter', input: 0.00, output: 100.00, imageEstimate: 0.100 },
    { name: 'black-forest-labs/flux.2-pro', provider: 'openRouter', input: 0.00, output: 45.00, imageEstimate: 0.045 },

    { name: 'bytedance-seed/seedream-4.5', provider: 'openRouter', input: 0.00, output: 40.00, imageEstimate: 0.040 },

    { name: 'krea/krea-2-large', provider: 'openRouter', input: 0.00, output: 60.00, imageEstimate: 0.060 },
    { name: 'krea/krea-2-medium-turbo', provider: 'openRouter', input: 0.00, output: 15.00, imageEstimate: 0.015 },
    { name: 'krea/krea-2-medium', provider: 'openRouter', input: 0.00, output: 30.00, imageEstimate: 0.030 },

    { name: 'microsoft/mai-image-2.5-pro', provider: 'openRouter', input: 5.00, output: 47.00, imageEstimate: 0.0498 },
    { name: 'microsoft/mai-image-2.5', provider: 'openRouter', input: 5.00, output: 47.00, imageEstimate: 0.0498 },

    { name: 'openai/gpt-5-image-mini', provider: 'openRouter', input: 2.50, output: 10.00, imageEstimate: 0.0114 },
    { name: 'openai/gpt-5-image', provider: 'openRouter', input: 8.00, output: 15.00, imageEstimate: 0.0194 },
    { name: 'openai/gpt-5.4-image-2', provider: 'openRouter', input: 8.00, output: 15.00, imageEstimate: 0.0194 },
    { name: 'openai/gpt-image-1-mini', provider: 'openRouter', input: 2.50, output: 2.50, imageEstimate: 0.0039 },
    { name: 'openai/gpt-image-1', provider: 'openRouter', input: 10.00, output: 10.00, imageEstimate: 0.0155 },
    { name: 'openai/gpt-image-2', provider: 'openRouter', input: 8.00, output: 8.00, imageEstimate: 0.0124 },

    { name: 'qwen/qwen-image-3-pro', provider: 'openRouter', input: 0.00, output: 40.00, imageEstimate: 0.040 },
    { name: 'qwen/qwen-image-3', provider: 'openRouter', input: 0.00, output: 30.00, imageEstimate: 0.030 },

    { name: 'recraft/recraft-v3', provider: 'openRouter', input: 0.00, output: 40.00, imageEstimate: 0.040 },
    { name: 'recraft/recraft-v4-pro-vector', provider: 'openRouter', input: 0.00, output: 300.00, imageEstimate: 0.300 },
    { name: 'recraft/recraft-v4-pro', provider: 'openRouter', input: 0.00, output: 250.00, imageEstimate: 0.250 },
    { name: 'recraft/recraft-v4-vector', provider: 'openRouter', input: 0.00, output: 80.00, imageEstimate: 0.080 },
    { name: 'recraft/recraft-v4.1-pro-vector', provider: 'openRouter', input: 0.00, output: 300.00, imageEstimate: 0.300 },
    { name: 'recraft/recraft-v4.1-pro', provider: 'openRouter', input: 0.00, output: 210.00, imageEstimate: 0.210 },
    { name: 'recraft/recraft-v4.1-utility-pro', provider: 'openRouter', input: 0.00, output: 80.00, imageEstimate: 0.080 },
    { name: 'recraft/recraft-v4.1-utility', provider: 'openRouter', input: 0.00, output: 25.00, imageEstimate: 0.025 },
    { name: 'recraft/recraft-v4.1-vector', provider: 'openRouter', input: 0.00, output: 80.00, imageEstimate: 0.080 },
    { name: 'recraft/recraft-v4.1', provider: 'openRouter', input: 0.00, output: 35.00, imageEstimate: 0.035 },
    { name: 'recraft/recraft-v4', provider: 'openRouter', input: 0.00, output: 40.00, imageEstimate: 0.040 },

    { name: 'sourceful/riverflow-v2.5-fast', provider: 'openRouter', input: 0.00, output: 20.00, imageEstimate: 0.020 },
    { name: 'sourceful/riverflow-v2.5-pro', provider: 'openRouter', input: 0.00, output: 150.00, imageEstimate: 0.150 },
];

export const IMAGE_ANALYSIS_MODELS: ModelDefinition[] = [
    // Google
    { name: 'gemini-2.5-flash-lite', provider: 'google', input: 0.10, output: 0.40, isDefault: true },
    { name: 'gemini-2.5-flash', provider: 'google', input: 0.15, output: 0.60 },

    // xAI
    { name: 'grok-3-mini', provider: 'xai', input: 0.25, output: 0.50, isDefault: true },
    { name: 'grok-4-1-fast-non-reasoning', provider: 'xai', input: 0.20, output: 0.50 },

    // OpenRouter
    { name: 'qwen/qwen-2.5-vl-72b-instruct', provider: 'openRouter', input: 0.20, output: 0.50 },
    { name: 'google/gemini-2.5-flash-lite', provider: 'openRouter', input: 0.10, output: 0.40, isDefault: true },
    { name: 'google/gemini-2.5-flash', provider: 'openRouter', input: 0.30, output: 2.50 },
];


