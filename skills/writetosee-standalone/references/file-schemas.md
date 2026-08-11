# WriteToSee Markdown File Formats & Disk Storage Grammar

This document provides the exact serialization schemas, regex parsing rules, and grammar definitions for all disk files in a WriteToSee project directory.

---

## Root Project Files Overview

A connected project root directory contains four human-editable Markdown files:

```text
<project-root>/
├── story.md            # Hierarchical story text (Title, Chapters, Pages, Paragraphs)
├── style.md            # Global artistic directives, reference art URLs & toggles
├── characters.md       # Character visual descriptions, crop boxes & portraits
├── instructions.md     # Panel-by-panel camera directions, character tags & prompt digests
├── images/             # {image_digest}.png generated artwork cache
├── prompts/            # {prompt_digest}.md compiled 5-segment illustration prompts
└── summaries/          # {summary_digest}.md compressed contextual summaries
```

---

## 1. `story.md` Grammar & Schema

`story.md` contains the primary narrative hierarchy.

### Grammar Structure
```markdown
# [Story Title]

## [Chapter 1 Title]

### [Page 1 Title]

First paragraph text block of page 1.

Second paragraph text block of page 1.

### [Page 2 Title]

Paragraph on page 2.

## [Chapter 2 Title]

Paragraph in chapter 2 (if page heading omitted, defaults to Page 1).
```

### Hierarchy & Fallback Rules
1. **Title (`#`):** The first `# <Title>` sets `story_title`. Defaults to `"Untitled Story"`.
2. **Chapters (`##`):** Each `## <Chapter Title>` starts a new chapter (`chapter_no: 0, 1, ...`).
3. **Pages (`###`):** Each `### <Page Title>` inside a chapter starts a new page (`page_no: 0, 1, ...`). If no `###` is specified, the parser wraps paragraphs into a default `"Page 1"` (`page_no: 0`).
4. **Paragraphs:** Plain text blocks separated by double newlines (`\n\n`) form individual `Paragraph` objects (`paragraph_no: 0, 1, ...` continuous global index).
5. **Preceding & Prior Text Calculation:**
   - `prior_text`: Accumulated paragraph text on the same page preceding the current paragraph.
   - `preceding_text`: Accumulated summaries or raw text for all prior chapters and prior pages in the current chapter.
   - `narrative_text`: Concatenation of `preceding_text` and `prior_text`.

---

## 2. `style.md` Grammar & Schema

`style.md` governs the global illustration aesthetic, reference portrait instructions, and layout modes.

### Grammar Structure
```markdown
# Style Instructions

- panelPerParagraph: true
- referenceUrl: https://example.com/reference-art.jpg
- useReferenceInstructions: true

## Drawing Instructions
Vibrant, colorful illustration style, bright colors, clear shapes, studio lighting.

## Reference Instructions
Follow the ink hatching and watercolor aesthetic demonstrated in the reference image.
```

### Field Definitions
* `- panelPerParagraph: [true|false]`: If `true`, each paragraph generates an illustration.
* `- referenceUrl: [URL]`: URL or path to a visual style reference.
* `- useReferenceInstructions: [true|false]`: Flag determining whether `## Reference Instructions` are appended to prompt compilation.
* `## Drawing Instructions`: Free-form text describing global artistic style, mediums, palettes, and lighting.
* `## Reference Instructions`: Specific instructions derived from the style reference URL/image.

---

## 3. `characters.md` Grammar & Schema

`characters.md` maintains the roster of all recurring characters, visual traits, and reference portrait bounding boxes.

### Grammar Structure
```markdown
## [Character Name]

- ReferenceUrl: https://example.com/portraits/alice.png
- CropBox: {"x":0.1,"y":0.15,"width":0.7,"height":0.7}

Alice is a 12-year-old girl with curly auburn hair, hazel eyes, and green overalls.

**Instructions:**
Always render Alice wearing her silver pocket watch necklace.

## [Second Character]

- ReferenceUrl: 
- CropBox: {"x":0,"y":0,"width":1,"height":1}

Barnaby is a tall, slender mechanical automaton made of polished brass with glowing blue optic sensors.

**Instructions:**
Maintain brass texture and visible cog joints.
```

### Parsing Rules & Field Extraction
* `## <Character Name>`: Starts a new character record (`character_name`).
* `- ReferenceUrl: <url>`: URL of the character portrait.
* `- CropBox: {"x":..., "y":..., "width":..., "height":...}`: Normalized 0–1 bounding box for face/portrait crop.
* Description body: Free text between metadata bullets and `**Instructions:**`. Stored in `description_text`.
* `**Instructions:**`: Specific rendering rules. Stored in `instructions_text`.

---

## 4. `instructions.md` Grammar & Schema

`instructions.md` contains the scene layout directives for each illustration panel, linking characters, camera directions, lock states, and prompt digests.

### Grammar Structure
```markdown
## Instruction 0

- paragraphId: 0
- pageId: 0
- chapterId: 0
- imageIndex: 0
- isLocked: true
- currentPromptDigest: A1B2C3D4E5F67890
- assignedPromptDigests: ["A1B2C3D4E5F67890", "F0E1D2C3B4A59876"]

**Characters:** Alice, Barnaby

<cinematographic-directions>
Wide angle shot from low perspective, dramatic morning rim lighting, looking upward at the characters.
</cinematographic-directions>

## Instruction 1

- paragraphId: 1
- pageId: 0
- chapterId: 0
- imageIndex: 0

**Characters:** Alice

<cinematographic-directions>
Close-up on Alice's face as she looks through the brass telescope.
</cinematographic-directions>
```

### Parsing & Field Extraction
* `## Instruction <N>`: Identifies the panel index.
* `- paragraphId: <N>`: Maps directly to `paragraphs.paragraph_no`.
* `- pageId: <N>`: Maps to `pages.page_no`.
* `- chapterId: <N>`: Maps to `chapters.chapter_no`.
* `- imageIndex: <N>`: The active selected image index from `assignedPromptDigests`.
* `- isLocked: true`: When present, prevents automated prompt regeneration when narrative text changes.
* `- currentPromptDigest: <HASH>`: SHA-256 digest of the currently active prompt.
* `- assignedPromptDigests: [...]`: JSON array of all prompt digests historically generated or assigned to this panel.
* `**Characters:** <Name1>, <Name2>`: Comma-separated list of assigned character canonical names.
* `<cinematographic-directions>...</cinematographic-directions>`: Camera framing, lens focal length, lighting, and mood directives.

---

## 5. Disk Caches (`prompts/`, `summaries/`, `images/`)

### `prompts/{prompt_digest}.md`
Contains the complete, compiled 5-segment prompt text sent to the image model.
* Filename: `{prompt_digest}.md` (Uppercase 16-char / SHA-256 hex digest).
* Content: Raw text formatted with `# Role`, `## Drawing Instructions`, `## Character Instructions`, `## Scene Instructions`.

### `summaries/{summary_digest}.md`
Contains LLM-generated summaries for stories, chapters, pages, or narrative contexts.
* Filename: `{summary_digest}.md` (Hash of the uncompressed source text).
* Content: Compressed narrative summary string.

### `images/{image_digest}.png`
Binary PNG illustration returned by the image generation model.
* Filename: `{prompt_digest}.png` matching the prompt digest.
