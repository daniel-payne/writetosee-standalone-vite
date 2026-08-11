# WriteToSee Canonical Glossary & Nomenclature

This reference provides unambiguous definitions of all terminology, digests, text variables, and domain concepts used throughout the WriteToSee system.

---

## 1. Domain Entities & Structural Units

| Term | Definition |
| :--- | :--- |
| **Story** | The root document entity (`story_id: 'main'`) containing the entire narrative text, title, and all child chapters. |
| **Chapter** | A major section of a story (`## [Title]`), containing multiple pages. |
| **Page** | A subdivision of a chapter (`### [Title]`), containing a sequence of paragraphs. |
| **Paragraph** | An individual narrative text block separated by double newlines (`\n\n`), carrying a global continuous `paragraph_no`. |
| **Instruction / Panel** | The visual directive record for a specific paragraph, linking character tags, camera directions, lock status, and compiled prompt digests. |
| **Character** | A recurring person, creature, or entity with a name, visual description, reference portrait, and crop bounding box. |
| **Style** | The global illustration configuration singleton defining medium, lighting, artist reference, and drawing directives. |

---

## 2. Text Variables & Prompt Segments

| Text Variable | Definition |
| :--- | :--- |
| **`paragraph_text`** | The raw, uncompressed text of a single paragraph on a page. |
| **`prior_text`** | Accumulated paragraph text on the same page occurring *before* the current paragraph. |
| **`preceding_text`** | Accumulated summary or text of all previous chapters and earlier pages in the current chapter. |
| **`narrative_text`** | Combined preceding context (`preceding_text + prior_text`), compressed via LLM if exceeding word limits. |
| **`scene_text`** | The exact paragraph text that the illustration model must visually depict. |
| **`cinematographic_text`** | Camera angle, shot framing, perspective, and lighting mood directives. |
| **`character_text`** | Extracted physical visual traits and rendering rules for all characters assigned to a panel. |
| **`style_text`** | Global artistic medium, palette, and lighting guidelines from `style.md`. |

---

## 3. SHA-256 Digests & Content-Addressable Keys

| Digest Name | Computed From | Usage |
| :--- | :--- | :--- |
| **`story_digest`** | `SHA256(story_text)` | Cache key for full story summary in `summaries/`. |
| **`chapter_digest`** | `SHA256(chapter_text)` | Cache key for chapter-level summary. |
| **`page_digest`** | `SHA256(page_text)` | Cache key for page-level summary. |
| **`narrative_digest`** | `SHA256(narrative_text)` | Cache key for paragraph narrative context summary. |
| **`prompt_digest`** | `SHA256(prompt_text)` | Deterministic hash of the compiled 5-segment prompt; matches `prompts/{digest}.md` and `images/{digest}.png`. |
| **`summary_digest`** | `SHA256(source_text)` | Base filename for summary cache files in `summaries/{digest}.md`. |

---

## 4. State & Storage Terminology

| Term | Definition |
| :--- | :--- |
| **Domain Data** | Core application models (`story`, `characters`, `instructions`, etc.) persisted in Dexie IndexedDB and synchronized with disk markdown files. |
| **Display State** | Transient UI preferences (`zoom-level`, `selected-tab`, `columns-per-row`) managed exclusively via `@keldan-systems/state-mutex`. |
| **Live Query** | Reactive subscription hook (`useLiveQuery`) that automatically re-renders React components whenever underlying IndexedDB tables mutate. |
| **Directory Handle** | The browser `FileSystemDirectoryHandle` stored in IndexedDB (`WriteToSeeFileStorageDB`) to interact with the local filesystem. |
