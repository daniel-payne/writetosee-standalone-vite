import type { LLMProvider } from "../MODELS";


export interface ExampleDefinition {
    name: string;
    provider: LLMProvider;
    processingTime?: number;
    costEstimate?: number;
}


export const IMAGE_GENERATION_MODELS: ExampleDefinition[] = [
]