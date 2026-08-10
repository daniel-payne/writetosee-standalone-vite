# WriteToSee LLM Interactions Specification

## Purpose & Overview

This document specifies the core **LLM Interaction Workflows** and **Prompt Templates** in the WriteToSee standalone application:
1. **Text Summarization** (`text -> text`): Condensing long narrative text into cached summaries.
2. **Image-to-Text Description & Visual Analysis** (`image -> text`): Vision model analysis of style reference portraits and character visual traits.
3. **Character Extraction & Literary Analysis** (`text -> text` / `text -> JSON`): Extracting character rosters from story text and enriching character backstories.
4. **Image Generation** (`text -> image`): Generating scene illustration panels from compiled 5-segment prompts.

All interactions are deterministic, cache-backed, and integrate directly with Dexie IndexedDB and the local File System Access API.

```mermaid
flowchart LR
    subgraph Interaction1["1. Text Summarization (Text -> Text)"]
        RawText[Raw Uncompressed Text] --> LLMSumm[LLM Summarization Engine]
        LLMSumm --> CachedSumm[summaries/digest.md & Dexie summaries]
    end

    subgraph Interaction2["2. Vision & Character Analysis"]
        RefImage[Reference Image / Portrait] --> LLMVision[LLM Multimodal Vision Engine]
        LLMVision --> ExtractedDirectives[style.reference_instructions\ncharacters.description_text]
        StoryText[Story Narrative Text] --> LLMChar[Character Extraction Engine]
        LLMChar --> CharacterRoster[characters.md & Dexie characters]
    end

    subgraph Interaction3["3. Image Generation (Text -> Image)"]
        CompiledPrompt[Compiled 5-Segment Prompt] --> LLMImage[Image Generation Model]
        LLMImage --> SavedPNG[images/digest.png & Dexie images]
    end
```

---

## Prompt Template Architectural Standards (`src/data/llm/prompts/`)

All LLM prompts in the application must strictly adhere to the following architecture:
1. **One Prompt Per File**: Every individual prompt template (system prompt or user prompt template) resides in its own dedicated TypeScript file.
2. **`verbNoun` Naming Standard**: File names and builder function names must follow the `verbNoun` convention starting with a verb (e.g. `createBookIllustrationPrompt`, `createExtractCharactersSystemPrompt`, `createExtractCharactersUserPrompt`).
3. **Direct File Imports**: Files must be imported directly from their specific module path (e.g. `import { createBookIllustrationPrompt } from '@/data/llm/prompts/createBookIllustrationPrompt'`). No `index.ts` barrel files are used.
4. **Mustache Placeholders**: Dynamic prompt values use standard Mustache tag notation (e.g. `{{STYLE_TEXT}}`, `{{CHARACTER_NAME}}`, `{{STORY_TEXT}}`).

---

## 1. Interaction 1: Text Summarization (`text -> text`)

### Purpose
Reduces long narrative text across the story hierarchy when it exceeds specific word thresholds to fit within LLM context windows while preserving plot, mood, character actions, and visual cues.

### Invocation Triggers & Thresholds
*   **Story Summary** (`story.story_summary`): Triggered when `story_text` > 1500 words $\rightarrow$ compressed to maximum 400 words.
*   **Chapter Summary** (`chapters.chapter_summary`): Triggered when `chapter_text` > 500 words $\rightarrow$ compressed to maximum 250 words.
*   **Page Summary** (`pages.page_summary`): Triggered when `page_text` > 100 words $\rightarrow$ compressed to maximum 100 words.
*   **Narrative Context** (`paragraphs.narrative_summary`): Triggered when preceding context (`preceding_text + prior_text`) > 500 words $\rightarrow$ compressed to maximum 150 words.

### Cache Protocol
1. Compute `summary_digest = SHA256(raw_uncompressed_text)`.
2. Check Dexie `processDb.summaries.get(summary_digest)` / disk `summaries/{summary_digest}.md`.
3. If cache hit $\rightarrow$ return cached `summary_text` (zero LLM calls).
4. If cache miss $\rightarrow$ call LLM Summarization API $\rightarrow$ store in Dexie and write to `summaries/{summary_digest}.md`.

### Prompt Files & Templates

#### System Prompt: [`src/data/llm/prompts/createGenerateSummarySystemPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createGenerateSummarySystemPrompt.ts)
*   **Function**: `createGenerateSummarySystemPrompt(contextType?: string, maxWords?: number): string`
*   **Template**:
    ```mustache
    You are an expert literary and narrative summarizer for illustrated book scenes.
    Analyze the provided {{CONTEXT_TYPE}} text and generate a concise, high-level narrative summary.
    Guidelines:
    1. Maximum length: strictly no more than {{MAX_WORDS}} words.
    2. Focus on core characters, central conflict, setting, and essential narrative progression.
    3. Output ONLY the plain summary text. Do not add titles, headers, bullet points, or commentary wrappers.
    ```

#### User Prompt: [`src/data/llm/prompts/createGenerateSummaryUserPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createGenerateSummaryUserPrompt.ts)
*   **Function**: `createGenerateSummaryUserPrompt(textToSummarize: string): string`
*   **Template**:
    ```mustache
    <text-to-summarize>
    {{TEXT_TO_SUMMARIZE}}
    </text-to-summarize>
    ```

---

## 2. Interaction 2: Visual Analysis & Character Extraction

### Mode A: Style Reference Vision Analysis (`image -> text`)
Analyzes an artist reference painting, photo, or drawing to extract artistic medium, lighting setup, color palette, brush texture, rendering style, and overall visual mood for `style.reference_instructions`.

*   **System Prompt**: [`src/data/llm/prompts/createStyleReferenceSystemPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createStyleReferenceSystemPrompt.ts)
    *   **Function**: `createStyleReferenceSystemPrompt(): string`
    *   **Template**:
        ```text
        You are a professional art director and style analyzer for AI image generation.
        Analyze the style reference image provided. Generate a precise, detailed list of drawing instructions that capture its artistic style, medium, coloring, lighting, composition, mood, and characters.
        Each point should be a clear descriptive instruction.
        Do NOT use markdown headers, bullet points (like -, *, or numbers), or lists in your output.
        Return ONLY the description sentences, each sentence on its own line.
        Output 5 to 8 lines.
        ```
*   **User Prompt**: [`src/data/llm/prompts/createStyleReferenceUserPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createStyleReferenceUserPrompt.ts)
    *   **Function**: `createStyleReferenceUserPrompt(): string`
    *   **Template**:
        ```text
        Analyze this image and produce 5 to 8 detailed drawing instruction sentences, with each sentence on a new line. Focus on the art style, colors, lighting, medium, shapes, and character design.
        ```

---

### Mode B: Extract Characters from Story (`text -> JSON`)
Parses story text to extract up to 10 key character entities and their visual appearance summaries into structured JSON.

*   **System Prompt**: [`src/data/llm/prompts/createExtractCharactersSystemPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createExtractCharactersSystemPrompt.ts)
    *   **Function**: `createExtractCharactersSystemPrompt(): string`
    *   **Template**:
        ```text
        You are an expert literary analyst and character extractor.
        Your task is to analyze the story text provided by the user and extract all key characters.

        Strict Constraints:
        1. Extract at most 10 characters (maximum of 10 characters).
        2. For each character, provide a "name" and a clear, descriptive summary ("description") covering their physical appearance, traits, and role in the story.
        3. Return ONLY a valid JSON array of character objects with keys "name" and "description".
        4. Do not include markdown formatting tags, fences, or introductory text.

        Example format:
        [
          {"name": "Alice", "description": "A curious young girl with blue eyes and blonde hair who explores Wonderland."},
          {"name": "White Rabbit", "description": "A frantic, waistcoat-wearing rabbit who is always running late."}
        ]
        ```
*   **User Prompt**: [`src/data/llm/prompts/createExtractCharactersUserPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createExtractCharactersUserPrompt.ts)
    *   **Function**: `createExtractCharactersUserPrompt({ storyText }): string`
    *   **Template**:
        ```mustache
        <story>
        {{STORY_TEXT}}
        </story>
        ```

---

### Mode C: Analyze Character Story (`text -> text`)
Analyzes full story text for a specific character to build rich physical and personality descriptions (`characters.description_text`).

*   **System Prompt**: [`src/data/llm/prompts/createAnalyzeCharacterStorySystemPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createAnalyzeCharacterStorySystemPrompt.ts)
    *   **Function**: `createAnalyzeCharacterStorySystemPrompt(characterName: string): string`
    *   **Template**:
        ```mustache
        You are an expert literary character analyst.
        Your task is to analyze the provided story text and generate a detailed, rich, comprehensive character description for the character named "{{CHARACTER_NAME}}".
        Focus on physical appearance, facial features, age, body type, clothing style, personality, key traits, and role in the story.
        Return ONLY the description text. Do not include markdown headers or commentary wrapper tags.
        ```
*   **User Prompt**: [`src/data/llm/prompts/createAnalyzeCharacterStoryUserPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createAnalyzeCharacterStoryUserPrompt.ts)
    *   **Function**: `createAnalyzeCharacterStoryUserPrompt({ characterName, currentDescription, storyText }): string`
    *   **Template**:
        ```mustache
        <character-name>{{CHARACTER_NAME}}</character-name>
        <current-description>{{CURRENT_DESCRIPTION}}</current-description>
        <story>
        {{STORY_TEXT}}
        </story>
        ```

---

### Mode D: Analyze Character Reference Image (`image -> text`)
Analyzes character reference images or cropped face/body regions to extract consistent illustration drawing directives (`characters.instructions_text`).

*   **System Prompt**: [`src/data/llm/prompts/createAnalyzeCharacterImageSystemPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createAnalyzeCharacterImageSystemPrompt.ts)
    *   **Function**: `createAnalyzeCharacterImageSystemPrompt(characterName: string): string`
    *   **Template**:
        ```mustache
        You are an expert visual artist and character illustrator.
        Analyze the provided image of the character "{{CHARACTER_NAME}}".
        Generate precise, highly detailed step-by-step drawing instructions for illustrating this character.
        Cover: art style, body proportions, facial structure & features, eye shape/color, hair style/color, outfit & clothing details, color palette, lighting/shadowing, and key visual attributes.
        Return ONLY the drawing instructions text. Do not include markdown headers or wrapper commentary.
        ```
*   **User Prompt**: [`src/data/llm/prompts/createAnalyzeCharacterImageUserPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createAnalyzeCharacterImageUserPrompt.ts)
    *   **Function**: `createAnalyzeCharacterImageUserPrompt(characterName: string): string`
    *   **Template**:
        ```mustache
        Analyze the character picture for "{{CHARACTER_NAME}}" and provide detailed drawing instructions.
        ```

---

## 3. Interaction 3: Image Generation (`text -> image`)

### Purpose
Generates high-resolution scene illustrations for each illustrated panel based on the compiled 5-segment prompt.

### Prompt Builder: [`src/data/llm/prompts/createBookIllustrationPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createBookIllustrationPrompt.ts)
*   **Function**: `createBookIllustrationPrompt(variables: BookIllustrationPromptVariables): string`
*   **Constant**: `BOOK_ILLUSTRATION_PROMPT_TEMPLATE`
*   **Template Structure**:
    ```mustache
    # Role
    You are an illustrator for a book.
    Please draw an illustration for the scene-text bellow.
    The narrative-text lays out the story before the current scene, and the scene-text is the current scene.


    ## Drawing Instructions
    The following style text describes how you should draw, and the target for the drawing.
    There might also be some cinematographic instructions for the drawing.

    <style-text>
    {{STYLE_TEXT}}
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
    {{CINEMATOGRAPHIC_TEXT}}
    </cinematographic-text>

    ## Character Instructions

    The scene contains the following characters, please use these instructions when drawing the scene:

    <character-text>
    {{CHARACTER_TEXT}}
    </character-text>

    ## Scene Instructions
    Please draw the scene described bellow. The narrative text is there to give you an indication of how the story lead to this scene.
    **CRITICAL**: Illustrate ONLY the <scene-text>. Do NOT illustrate the <narrative-text>, which is provided strictly for background context.

    <narrative-text>
    {{NARRATIVE_TEXT}}
    </narrative-text>

    <scene-text>
    {{SCENE_TEXT}}
    </scene-text>
    ```

#### Segments Definition:
1. **`style_text`**: Global drawing medium, lighting rules, and reference style modifiers from `style` table.
2. **`cinematographic_text`**: Camera angle, framing, and scene mood from `instructions.cinematographic_directions`.
3. **`character_text`**: Visual traits and rendering directives for all characters present in `instructions.assigned_characters`.
4. **`narrative_text`**: Compressed preceding story context from `paragraphs.narrative_summary`.
5. **`scene_text`**: The immediate paragraph narrative sentence from `paragraphs.paragraph_text`.

---

## 4. Complete Prompt & File Reference Matrix

| Interaction Mode | Prompt File | Builder Function | Mustache Variables |
| :--- | :--- | :--- | :--- |
| **Image Generation** | [`createBookIllustrationPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createBookIllustrationPrompt.ts) | `createBookIllustrationPrompt` | `{{STYLE_TEXT}}`<br>`{{CINEMATOGRAPHIC_TEXT}}`<br>`{{CHARACTER_TEXT}}`<br>`{{NARRATIVE_TEXT}}`<br>`{{SCENE_TEXT}}` |
| **Character Extraction (Sys)** | [`createExtractCharactersSystemPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createExtractCharactersSystemPrompt.ts) | `createExtractCharactersSystemPrompt` | None |
| **Character Extraction (User)** | [`createExtractCharactersUserPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createExtractCharactersUserPrompt.ts) | `createExtractCharactersUserPrompt` | `{{STORY_TEXT}}` |
| **Style Reference (Sys)** | [`createStyleReferenceSystemPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createStyleReferenceSystemPrompt.ts) | `createStyleReferenceSystemPrompt` | None |
| **Style Reference (User)** | [`createStyleReferenceUserPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createStyleReferenceUserPrompt.ts) | `createStyleReferenceUserPrompt` | None |
| **Character Story Analysis (Sys)** | [`createAnalyzeCharacterStorySystemPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createAnalyzeCharacterStorySystemPrompt.ts) | `createAnalyzeCharacterStorySystemPrompt` | `{{CHARACTER_NAME}}` |
| **Character Story Analysis (User)** | [`createAnalyzeCharacterStoryUserPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createAnalyzeCharacterStoryUserPrompt.ts) | `createAnalyzeCharacterStoryUserPrompt` | `{{CHARACTER_NAME}}`<br>`{{CURRENT_DESCRIPTION}}`<br>`{{STORY_TEXT}}` |
| **Character Image Analysis (Sys)** | [`createAnalyzeCharacterImageSystemPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createAnalyzeCharacterImageSystemPrompt.ts) | `createAnalyzeCharacterImageSystemPrompt` | `{{CHARACTER_NAME}}` |
| **Character Image Analysis (User)** | [`createAnalyzeCharacterImageUserPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createAnalyzeCharacterImageUserPrompt.ts) | `createAnalyzeCharacterImageUserPrompt` | `{{CHARACTER_NAME}}` |
| **Text Summarization (Sys)** | [`createGenerateSummarySystemPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createGenerateSummarySystemPrompt.ts) | `createGenerateSummarySystemPrompt` | `{{CONTEXT_TYPE}}`<br>`{{MAX_WORDS}}` |
| **Text Summarization (User)** | [`createGenerateSummaryUserPrompt.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/llm/prompts/createGenerateSummaryUserPrompt.ts) | `createGenerateSummaryUserPrompt` | `{{TEXT_TO_SUMMARIZE}}` |
