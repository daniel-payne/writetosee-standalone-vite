/**
 * ============================================================================
 * WriteToSee - Multi-Style Multi-Model Image Generation Task Runner
 * ============================================================================
 * 
 * Generates test/example images across providers (Google, xAI, OpenRouter)
 * and styles (children's_book, claymation, graphic_novel, manga_comic, photo_realistic, superhero_comic),
 * saving images into public/examples/<style_folder>/<model_name>.png.
 * 
 * ----------------------------------------------------------------------------
 * CLI SYNTAX
 * ----------------------------------------------------------------------------
 *   bun tasks/create-images.ts <API_KEY> [OPTIONS]
 *   npx tsx tasks/create-images.ts <API_KEY> [OPTIONS]
 *   npm run test:images -- <API_KEY> [OPTIONS]
 * 
 * ----------------------------------------------------------------------------
 * OPTIONS & FLAGS
 * ----------------------------------------------------------------------------
 *   <API_KEY>          Required. Key automatically identifies provider:
 *                      - Google:     "AIza..." or "AQ...."
 *                      - xAI:        "xai-..."
 *                      - OpenRouter: "sk-or-..."
 *   --style, -s        Filter by style name/slug:
 *                      - children's_book
 *                      - claymation
 *                      - graphic_novel
 *                      - manga_comic
 *                      - photo_realistic
 *                      - superhero_comic
 *   --model, -m        Filter models by substring (e.g. "flux", "gemini-3.1", "grok")
 *   --missing-only     Skip images that already exist on disk (fast incremental runs)
 * 
 * ----------------------------------------------------------------------------
 * USAGE EXAMPLES
 * ----------------------------------------------------------------------------
 * 
 * 1. Generate ALL styles for ALL models of your provider (overwrites existing):
 *    bun tasks/create-images.ts AIzaSy...
 *    bun tasks/create-images.ts xai-...
 *    bun tasks/create-images.ts sk-or-v1-...
 * 
 * 2. Incremental run (ONLY generate missing images, skip already generated ones):
 *    bun tasks/create-images.ts AIzaSy... --missing-only
 *    bun tasks/create-images.ts xai-... --missing-only
 *    bun tasks/create-images.ts sk-or-v1-... --missing-only
 * 
 * 3. Generate for a specific style across all provider models:
 *    bun tasks/create-images.ts xai-... --style superhero_comic
 *    bun tasks/create-images.ts AIzaSy... --style claymation --missing-only
 *    bun tasks/create-images.ts sk-or-v1-... --style manga_comic
 * 
 * 4. Generate for a specific model across all 6 styles:
 *    bun tasks/create-images.ts xai-... --model "grok-imagine-image"
 *    bun tasks/create-images.ts AIzaSy... --model "gemini-3.1-flash-image" --missing-only
 *    bun tasks/create-images.ts sk-or-v1-... --model "flux.2-pro" --missing-only
 * 
 * 5. Generate for a specific style AND a specific model:
 *    bun tasks/create-images.ts xai-... --style superhero_comic --model "grok-imagine-image-quality"
 *    bun tasks/create-images.ts AIzaSy... --style photo_realistic --model "imagen-4.0-generate-001"
 *    bun tasks/create-images.ts sk-or-v1-... --style graphic_novel --model "openai/gpt-5-image" --missing-only
 * 
 * 6. Using npm script:
 *    npm run test:images -- AIzaSy... --missing-only
 *    npm run test:images -- xai-... --style claymation
 * ============================================================================
 */


import fs from 'node:fs';
import path from 'node:path';
import { identifyApiKeyProvider } from '../src/data/utilities/identifyApiKeyProvider';
import { IMAGE_GENERATION_MODELS, type ModelDefinition } from '../src/data/llm/MODELS';
import processGoogleImage from '../src/data/llm/providers/processGoogleImage';
import processxAIImage from '../src/data/llm/providers/processxAIImage';
import processOpenRouterImage from '../src/data/llm/providers/processOpenRouterImage';

// Direct imports of all individual style definition files
import { CHILDRENS_BOOK_INSTRUCTIONS } from '../src/data/styles/childrensBook';
import { CLAYMATION_INSTRUCTIONS } from '../src/data/styles/claymation';
import { GRAPHIC_NOVEL_INSTRUCTIONS } from '../src/data/styles/graphicNovel';
import { MANGA_COMIC_INSTRUCTIONS } from '../src/data/styles/mangaComic';
import { PHOTO_REALISTIC_INSTRUCTIONS } from '../src/data/styles/photoRealistic';
import { SUPERHERO_COMIC_INSTRUCTIONS } from '../src/data/styles/superheroComic';

export interface StyleDefinition {
    key: string;
    folder: string;
    name: string;
    instructions: string;
}

export const STYLES: StyleDefinition[] = [
    {
        key: 'childrens_book',
        folder: 'childrens_book',
        name: "Children's Book",
        instructions: CHILDRENS_BOOK_INSTRUCTIONS,
    },
    {
        key: 'claymation',
        folder: 'claymation',
        name: 'Claymation',
        instructions: CLAYMATION_INSTRUCTIONS,
    },
    {
        key: 'graphic_novel',
        folder: 'graphic_novel',
        name: 'Graphic Novel',
        instructions: GRAPHIC_NOVEL_INSTRUCTIONS,
    },
    {
        key: 'manga_comic',
        folder: 'manga_comic',
        name: 'Manga Comic',
        instructions: MANGA_COMIC_INSTRUCTIONS,
    },
    {
        key: 'photo_realistic',
        folder: 'photo_realistic',
        name: 'Photo Realistic',
        instructions: PHOTO_REALISTIC_INSTRUCTIONS,
    },
    {
        key: 'superhero_comic',
        folder: 'superhero_comic',
        name: 'Superhero Comic',
        instructions: SUPERHERO_COMIC_INSTRUCTIONS,
    },
];

// Hardcoded prompt template with {{styleText}} placeholder
const PROMPT_TEMPLATE = `# Role
You are an illustrator for a book.
Please draw an illustration for the scene-text bellow.
The narrative-text lays out the story before the current scene, and the scene-text is the current scene.


## Drawing Instructions
The following style text describes how you should draw, and the target for the drawing.
There might also be some cinematographic instructions for the drawing.

<style-text>
{{styleText}}
</style-text>

### Strict Rules
1. A wide-angle, edge-to-edge scene that completely fills 100% of the image space from corner to corner.
2. The camera is pulled back so the environment extends fully to the very edges of the rectangular canvas.
3. Keep the background in focus, and of the same style as the foreground object.
4. Do not illustrate any words, signs, or speech bubbles unless specifically asked for in the text.
5. Do not make any illustration with rounded edges; the completed illustration should be a rectangle.
6. Do not draw any frame, boundary, or any decoration around the image.
7. Do not draw any text in the image.
8. Do not use copyright symbols (©, ™, ®) or any other markings in the illustration.

### Output Format
1. The illustration is to fill the complete drawing area.
2. Do not make any illustration with rounded edges; the completed illustration should be a rectangle.
3. Do not draw any frame, boundary, or any decoration around the image (i.e., fameless, full-bleed, no white margins, edge-to-edge environment). 
4. Keep the background in focus and of the same style as the foreground. Do not make the background blurry or out of focus. The background should be as detailed as the foreground.
5. Do not draw any text in the image. 
6. Do not use copyright symbols (©, ™, ®) or any other markings in the illustration.

<cinematographic-text>

</cinematographic-text>

## Character Instructions

The scene contains the following characters, please use these instructions when drawing the scene:

<character-text>

</character-text>

## Scene Instructions
Please draw the scene described bellow. The narrative text is there to give you an indication of how the story lead to this scene.
**CRITICAL**: Illustrate ONLY the <scene-text>. Do NOT illustrate the <narrative-text>, which is provided strictly for background context.

<narrative-text>
The cat sat on the mat, beside the fireplace. The storm raged outside, wind and heavy rain.

Mr Brown was a lumberjack, he had spent the day working in the woods, the wind an rain howling around him. Mr Brown made his way home through the woods, the wind an rain howling around him.
</narrative-text>

<scene-text>
When he got home and open's the door, he saw Polly sleeping on the floor.
</scene-text>`;

interface GenerateResult {
    model: string;
    style: string;
    status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
    durationMs: number;
    cost: number;
    filePath: string;
    error?: string;
}

function parseArgs() {
    const args = process.argv.slice(2);
    let apiKey = '';
    let modelFilter = '';
    let styleFilter = '';
    let missingOnly = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--key' || arg === '-k') {
            apiKey = args[++i] || '';
        } else if (arg === '--model' || arg === '-m') {
            modelFilter = args[++i] || '';
        } else if (arg === '--style' || arg === '-s') {
            styleFilter = args[++i] || '';
        } else if (arg === '--missing-only' || arg === '--missing') {
            missingOnly = true;
        } else if (!apiKey && !arg.startsWith('-')) {
            apiKey = arg;
        }
    }

    if (!apiKey) {
        apiKey = process.env.API_KEY || process.env.VITE_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    }

    return {
        apiKey: apiKey.trim(),
        modelFilter: modelFilter.trim(),
        styleFilter: styleFilter.trim(),
        missingOnly
    };
}

async function saveImage(content: string, filePath: string): Promise<void> {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    let buffer: Buffer;

    if (content.startsWith('data:')) {
        const base64Data = content.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
    } else if (content.startsWith('http://') || content.startsWith('https://')) {
        const res = await fetch(content);
        const arrayBuf = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
    } else {
        buffer = Buffer.from(content, 'base64');
    }

    fs.writeFileSync(filePath, buffer);
}

function updateExamplesFile(
    filePath: string,
    modelName: string,
    provider: 'google' | 'xai' | 'openRouter',
    processingTimeSeconds: number,
    costEstimate: number
): void {
    let existingList: {
        name: string;
        provider: 'google' | 'xai' | 'openRouter';
        processingTime?: number;
        costEstimate?: number;
    }[] = [];

    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const objectRegex = /{\s*name:\s*['"]([^'"]+)['"],\s*provider:\s*['"]([^'"]+)['"](?:,\s*processingTime:\s*([0-9.]+))?(?:,\s*costEstimate:\s*([0-9.]+))?\s*}/g;
            let match;
            while ((match = objectRegex.exec(content)) !== null) {
                existingList.push({
                    name: match[1],
                    provider: match[2] as any,
                    processingTime: match[3] ? parseFloat(match[3]) : undefined,
                    costEstimate: match[4] ? parseFloat(match[4]) : undefined,
                });
            }
        } catch (e) {
            console.error('Warning: could not parse existing EXAMPLES.ts:', e);
        }
    }

    const existingIndex = existingList.findIndex(item => item.name === modelName);
    const updatedEntry = {
        name: modelName,
        provider: provider,
        processingTime: Number(processingTimeSeconds.toFixed(2)),
        costEstimate: Number(costEstimate.toFixed(4)),
    };

    if (existingIndex >= 0) {
        existingList[existingIndex] = updatedEntry;
    } else {
        existingList.push(updatedEntry);
    }

    const lines: string[] = [
        'import type { LLMProvider } from "../MODELS";',
        '',
        'export interface ExampleDefinition {',
        '    name: string;',
        '    provider: LLMProvider;',
        '    processingTime?: number;',
        '    costEstimate?: number;',
        '}',
        '',
        'export const IMAGE_GENERATION_MODELS: ExampleDefinition[] = [',
    ];

    const providers: Array<'google' | 'xai' | 'openRouter'> = ['google', 'xai', 'openRouter'];
    const providerTitles: Record<string, string> = {
        google: 'Google',
        xai: 'xAI',
        openRouter: 'OpenRouter',
    };

    let firstSection = true;
    for (const p of providers) {
        const group = existingList.filter(item => item.provider === p);
        if (group.length > 0) {
            if (!firstSection) lines.push('');
            firstSection = false;
            lines.push(`    // ${providerTitles[p]}`);
            for (const item of group) {
                const parts = [
                    `name: '${item.name}'`,
                    `provider: '${item.provider}'`,
                ];
                if (item.processingTime !== undefined) {
                    parts.push(`processingTime: ${item.processingTime}`);
                }
                if (item.costEstimate !== undefined) {
                    parts.push(`costEstimate: ${item.costEstimate}`);
                }
                lines.push(`    { ${parts.join(', ')} },`);
            }
        }
    }

    lines.push('];');
    lines.push('');

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

async function runModelForStyle(
    modelDef: ModelDefinition,
    styleDef: StyleDefinition,
    apiKey: string,
    outputBaseDir: string,
    missingOnly: boolean
): Promise<GenerateResult> {
    const sanitizedName = modelDef.name.replace(/[/:\\]/g, '_');
    const fileName = `${sanitizedName}.png`;
    const styleDir = path.join(outputBaseDir, styleDef.folder);
    const targetFilePath = path.join(styleDir, fileName);
    const relativePath = path.relative(process.cwd(), targetFilePath);

    if (missingOnly && fs.existsSync(targetFilePath)) {
        console.log(`⏭️  [SKIPPED] ${modelDef.name} | Style: ${styleDef.name} -> Already exists at ${relativePath}`);
        return {
            model: modelDef.name,
            style: styleDef.name,
            status: 'SKIPPED',
            durationMs: 0,
            cost: 0,
            filePath: relativePath,
        };
    }

    const startTime = Date.now();
    console.log(`\n⏳ [START] Generating with ${modelDef.name} (${modelDef.provider}) for Style: ${styleDef.name}...`);

    const imagePrompt = PROMPT_TEMPLATE.replace('{{styleText}}', styleDef.instructions.trim());

    try {
        let response: { content: string; totalCost: number };

        if (modelDef.provider === 'google') {
            response = await processGoogleImage({
                imagePrompt,
                apiKey,
                model: modelDef.name,
                inputCostPerMillion: modelDef.input,
                outputCostPerMillion: modelDef.output,
            });
        } else if (modelDef.provider === 'xai') {
            response = await processxAIImage({
                imagePrompt,
                apiKey,
                model: modelDef.name,
                inputCostPerMillion: modelDef.input,
                outputCostPerMillion: modelDef.output,
            });
        } else if (modelDef.provider === 'openRouter') {
            response = await processOpenRouterImage({
                imagePrompt,
                apiKey,
                model: modelDef.name,
                inputCostPerMillion: modelDef.input,
                outputCostPerMillion: modelDef.output,
            });
        } else {
            throw new Error(`Unsupported provider: ${modelDef.provider}`);
        }

        const durationMs = Date.now() - startTime;
        await saveImage(response.content, targetFilePath);
        const finalCost = response.totalCost || modelDef.imageEstimate || modelDef.estimatedCostPerImage || 0;
        const processingTimeSeconds = Number((durationMs / 1000).toFixed(2));

        // Update EXAMPLES.ts with duration in seconds and cost
        const examplesFilePath = path.resolve(process.cwd(), 'src/data/llm/providers/EXAMPLES.ts');
        updateExamplesFile(
            examplesFilePath,
            modelDef.name,
            modelDef.provider,
            processingTimeSeconds,
            finalCost
        );

        console.log(`✅ [SUCCESS] ${modelDef.name} [${styleDef.name}] (${processingTimeSeconds}s) -> Saved to ${relativePath} | Cost: $${finalCost.toFixed(4)}`);
        console.log(`📝 [UPDATED] src/data/llm/providers/EXAMPLES.ts recorded ${modelDef.name} (${processingTimeSeconds}s, $${finalCost.toFixed(4)})`);

        return {
            model: modelDef.name,
            style: styleDef.name,
            status: 'SUCCESS',
            durationMs,
            cost: finalCost,
            filePath: relativePath,
        };
    } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const errorMessage = err?.message || String(err);
        console.error(`❌ [FAILED] ${modelDef.name} [${styleDef.name}] (${(durationMs / 1000).toFixed(2)}s): ${errorMessage}`);

        return {
            model: modelDef.name,
            style: styleDef.name,
            status: 'FAILED',
            durationMs,
            cost: 0,
            filePath: relativePath,
            error: errorMessage,
        };
    }
}

async function main() {
    console.log('='.repeat(70));
    console.log('  WriteToSee - Image Generation Multi-Style Task');
    console.log('='.repeat(70));

    const { apiKey, modelFilter, styleFilter, missingOnly } = parseArgs();

    if (!apiKey) {
        console.error('\n❌ ERROR: No API Key provided.\n');
        console.log('Usage:');
        console.log('  bun tasks/create-images.ts <API_KEY> [--style <name>] [--model <name>] [--missing-only]');
        console.log('  or');
        console.log('  npx tsx tasks/create-images.ts <API_KEY> [--style <name>] [--model <name>] [--missing-only]');
        console.log('\nOptions:');
        console.log('  --style, -s         Target a specific style (e.g., superhero_comic, claymation)');
        console.log('  --model, -m         Target a specific model (e.g., grok-imagine-image, gemini-3.1-flash-image)');
        console.log('  --missing-only      Only generate images that do not already exist on disk');
        console.log('\nExamples:');
        console.log('  bun tasks/create-images.ts AIzaSy...');
        console.log('  bun tasks/create-images.ts xai-... --style superhero_comic --missing-only');
        console.log('  bun tasks/create-images.ts sk-or-v1-... --model "flux.2-pro" --style manga_comic');
        process.exit(1);
    }

    const providerType = identifyApiKeyProvider(apiKey);
    console.log(`🔑 Key Provider Detected: ${providerType}`);

    if (providerType === 'UNKNOWN') {
        console.error('❌ ERROR: Unrecognized API key format.');
        console.error('Expected prefixes:');
        console.error('  - Google: "AIza..." or "AQ...."');
        console.error('  - xAI: "xai-..."');
        console.error('  - OpenRouter: "sk-or-..."');
        process.exit(1);
    }

    const providerMap: Record<string, 'google' | 'xai' | 'openRouter'> = {
        GOOGLE: 'google',
        XAI: 'xai',
        OPENROUTER: 'openRouter',
    };

    const targetProvider = providerMap[providerType];

    let modelsToRun = IMAGE_GENERATION_MODELS.filter(m => m.provider === targetProvider);

    if (modelFilter) {
        modelsToRun = modelsToRun.filter(m =>
            m.name.toLowerCase().includes(modelFilter.toLowerCase())
        );
        if (modelsToRun.length === 0) {
            console.error(`❌ No models found matching filter "${modelFilter}" under provider "${targetProvider}".`);
            console.log('Available models for this provider:');
            IMAGE_GENERATION_MODELS.filter(m => m.provider === targetProvider).forEach(m => console.log(`  - ${m.name}`));
            process.exit(1);
        }
    }

    let stylesToRun = STYLES;

    if (styleFilter) {
        const normalizedFilter = styleFilter.toLowerCase().replace(/[- ]/g, '_');
        stylesToRun = STYLES.filter(s =>
            s.key.toLowerCase().includes(normalizedFilter) ||
            s.folder.toLowerCase().includes(normalizedFilter) ||
            s.name.toLowerCase().includes(styleFilter.toLowerCase())
        );

        if (stylesToRun.length === 0) {
            console.error(`❌ No styles found matching filter "${styleFilter}".`);
            console.log('Available styles:');
            STYLES.forEach(s => console.log(`  - ${s.folder} ("${s.name}")`));
            process.exit(1);
        }
    }

    const outputBaseDir = path.resolve(process.cwd(), 'public/examples');
    const totalJobs = modelsToRun.length * stylesToRun.length;

    console.log(`📋 Models (${modelsToRun.length}): ${modelsToRun.map(m => m.name).join(', ')}`);
    console.log(`🎨 Styles (${stylesToRun.length}): ${stylesToRun.map(s => s.folder).join(', ')}`);
    console.log(`⚡ Mode: ${missingOnly ? 'Generate MISSING ONLY (Skip existing)' : 'Generate ALL (Overwrite)'}`);
    console.log(`📁 Target Base Directory: ${outputBaseDir}`);
    console.log(`🚀 Total Tasks: ${totalJobs}\n`);

    const results: GenerateResult[] = [];
    let jobIndex = 0;

    for (const styleDef of stylesToRun) {
        console.log(`\n================== STYLE: ${styleDef.name} (${styleDef.folder}) ==================`);

        for (const modelDef of modelsToRun) {
            jobIndex++;
            console.log(`--- [Task ${jobIndex}/${totalJobs}] ---`);
            const res = await runModelForStyle(modelDef, styleDef, apiKey, outputBaseDir, missingOnly);
            results.push(res);
        }
    }

    // Print summary report
    console.log('\n' + '='.repeat(70));
    console.log('  EXECUTION SUMMARY');
    console.log('='.repeat(70));

    const successes = results.filter(r => r.status === 'SUCCESS');
    const skipped = results.filter(r => r.status === 'SKIPPED');
    const failures = results.filter(r => r.status === 'FAILED');
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

    console.log(`Total Tasks:         ${results.length}`);
    console.log(`✅ Succeeded:        ${successes.length}`);
    console.log(`⏭️  Skipped:          ${skipped.length}`);
    console.log(`❌ Failed:           ${failures.length}`);
    console.log(`⏱️  Total Time:        ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`💰 Total Cost:        $${totalCost.toFixed(4)}`);
    console.log('='.repeat(70));

    if (failures.length > 0) {
        console.log('\nFailed Tasks:');
        failures.forEach(f => console.log(`  - [${f.style}] ${f.model}: ${f.error}`));
    }

    if (successes.length > 0) {
        console.log('\nNewly Saved Images:');
        successes.forEach(s => console.log(`  - ${s.filePath}`));
    }
}

main().catch(err => {
    console.error('Fatal error running image generation task:', err);
    process.exit(1);
});
