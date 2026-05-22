export default async function llmGenerateImage(prompt: string, provider: 'gemini' = 'gemini'): Promise<string> {
    return Promise.resolve([prompt, provider].join('\n\n'))
}