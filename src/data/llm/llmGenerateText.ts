export default async function llmGenerateText(systemPrompt: string, userPrompt: string, provider: 'gemini' = 'gemini'): Promise<string> {

    return Promise.resolve([systemPrompt, userPrompt, provider].join('\n\n'))
}