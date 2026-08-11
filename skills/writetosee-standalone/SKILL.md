---
name: writetosee-standalone
description: "Systems analysis and architecture guidelines for the WriteToSee application. WHAT: Enforces strict state partitioning (Dexie.js IndexedDB domain models with useLiveQuery vs. @keldan-systems/state-mutex transient display state), deterministic SHA-256 prompt compilation, LLM summarization and image generation pipelines, and File System Access API disk synchronization. WHEN: Use whenever designing, writing, refactoring, or debugging code in WriteToSee—including creating React components, querying or updating database tables, building LLM prompts, parsing markdown files (story.md, style.md, characters.md, instructions.md), handling disk caches, or managing UI interaction flows."
category: development
risk: low
source: local
date_added: "2026-05-19"
---

# WriteToSee Standalone UI Developer Skills

This skill governs the system architecture, domain models, state management, and file storage rules for the WriteToSee standalone frontend.

## Systems Analysis Mental Model & What This Skill Enforces

WriteToSee is engineered around a deterministic, reactive system architecture:
1. **Strict State Partitioning:** Pure domain data lives exclusively in **Dexie.js IndexedDB** (`processDb`) and is subscribed to via `useLiveQuery`. Ephemeral UI layout preferences live exclusively in **`@keldan-systems/state-mutex`**.
2. **Deterministic Content-Addressable Pipelines:** Text hierarchies, summaries, prompts, and generated artwork are hashed using SHA-256 digests (`story_digest`, `chapter_digest`, `page_digest`, `narrative_digest`, `prompt_digest`).
3. **Structured Prompt Compilation:** 5-segment prompt builders (`style_text`, `cinematographic_text`, `character_text`, `narrative_text`, `scene_text`) with strict image generation output rules.
4. **Offline-First File System Synchronization:** Two-way synchronization between disk files (`story.md`, `style.md`, `characters.md`, `instructions.md`, `prompts/*.md`, `images/*.png`, `summaries/*.md`) and Dexie via the browser File System Access API.

## When to Use
* **Building/Refactoring Components:** Whenever creating new UI components or modifying panels (always using `DefaultComponent.tsx` as the template).
* **Managing State & Data:** When reading or writing domain entities (`story`, `chapters`, `pages`, `paragraphs`, `style`, `characters`, `instructions`, `images`, `prompts`, `summaries`) or updating transient layout state.
* **LLM & Prompt Engineering:** When building prompts, modifying system/user prompt builders, or adjusting summarization / image generation pipelines.
* **File System Operations:** When ingesting markdown/binary disk assets or saving reactive file cascades.
* **Debugging Interaction Flows:** When tracing user actions, panel selection, character tagging, prompt locks, or generation triggers.

## Domain Specifications & Architecture References

Always reference and adhere to the following domain architecture and processing specification documents:
*   **Domain Entities:** [`references/domain-entities.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/references/domain-entities.md) – Defines entities, data structures, and relationships.
*   **LLM Interactions & Prompts:** [`references/llm-interactions.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/references/llm-interactions.md) – Defines UI actions, intents, prompt templates, and user interaction flows.
*   **State Processing Pipeline:** [`references/state-processing.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/references/state-processing.md) – Defines data transformation, instruction compilation, and LLM processing workflows.
*   **Entity States & Storage:** [`references/entity-states.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/references/entity-states.md) – Defines Dexie IndexedDB schemas, `@keldan-systems/state-mutex` display keys, and synchronization.
*   **File Formats & Schemas:** [`references/file-schemas.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/references/file-schemas.md) – Exact Markdown grammars, parsing rules, and disk cache schemas for `story.md`, `style.md`, `characters.md`, `instructions.md`.
*   **UI Architecture & Patterns:** [`references/ui-architecture.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/references/ui-architecture.md) – Three-file route patterns, `DefaultComponent` scaffolding, and Dexie live query mutations.
*   **Edge Cases & Error Recovery:** [`references/edge-cases-and-recovery.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/references/edge-cases-and-recovery.md) – Browser File System Access quirks, parsing fallbacks, failure lifecycle, and cache resets.
*   **Glossary & Nomenclature:** [`references/glossary.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/references/glossary.md) – Canonical glossary of domain entities, SHA-256 digest definitions, and prompt text segments.

---

## State Management Architecture: Dexie.js vs `@keldan-systems/state-mutex`

State in WriteToSee is strictly partitioned into **Domain Data** and **Display State**:

### 1. Domain Data State: Dexie.js with `useLiveQuery` (Mandatory)
All domain entity data (`story`, `chapters`, `pages`, `paragraphs`, `style`, `characters`, `instructions`, `images`, `prompts`, `summaries`) MUST come directly through **Dexie.js reactive hooks** (`useLiveQuery` from `dexie-react-hooks`).

*   **Database Source:** [`src/data/process/db.ts`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/src/data/process/db.ts) (`processDb`).
*   **Reactivity:** Any write, import, or update to Dexie automatically re-renders all subscribed React components.
*   **Usage Example:**
    ```typescript
    import { useLiveQuery } from 'dexie-react-hooks';
    import { processDb } from '../data/process/db';

    export function PanelList() {
      // Live query for domain data
      const instructions = useLiveQuery(() => processDb.instructions.toArray()) ?? [];
      const story = useLiveQuery(() => processDb.story.get('main'));
      const style = useLiveQuery(() => processDb.style.get('main'));
      const characters = useLiveQuery(() => processDb.characters.toArray()) ?? [];
      
      // Render domain data...
    }
    ```

### 2. Display / Transient UI State: `@keldan-systems/state-mutex`
`@keldan-systems/state-mutex` is strictly reserved for **transient display state** and UI layout preferences that are not part of the core domain model:

*   **Allowed Display State Examples:**
    - `images-per-row` (e.g. 1, 2, 3, 4 images per grid row)
    - `selected-tab` / active navigation views
    - `sidebar-collapsed` / panel expand-collapse states
    - `zoom-level` / image display scale
*   **Hooks:**
    - `useSharedState<T>(key: string, defaultValue: T)`: In-memory reactive state across components.
    - `useLocalState<T>(key: string, defaultValue: T)`: Persisted in `localStorage` across reloads and multi-tab sync.
*   **Usage Example:**
    ```typescript
    import { useLocalState } from '@keldan-systems/state-mutex';

    export function LayoutControls() {
      // Transient UI display state only
      const [imagesPerRow, setImagesPerRow] = useLocalState<number>('images-per-row', 3);
      const [zoomLevel, setZoomLevel] = useLocalState<number>('panel-zoom-level', 100);
      
      return (
        <div>
          <button onClick={() => setImagesPerRow(2)}>2 Columns</button>
          <button onClick={() => setImagesPerRow(4)}>4 Columns</button>
        </div>
      );
    }
    ```

---

## File Storage with File System Access API

When storing files received from LLMs (such as Markdown `.md` text and PNG `.png` images) directly to the user's local disk, utilize the browser **File System Access API**.

*   **Directory Permissions:** Prompt the user to select and authorize access to a local directory once.
*   **File Writing:** Create and write to `.md` and `.png` files inside that designated directory.
*   **Handle Persistence:** Store the directory handle in IndexedDB so that the user doesn't have to re-select the folder on every reload (though they will need to re-grant permission).

---

## Version Control & Git Commit Ownership

*   **Commit Responsibility:** The developer agent must **NEVER** run `git commit` commands. All commits and repository snapshot updates are handled exclusively by the user. Do not attempt to commit code changes.

---

## Component Creation

*   **Template:** ALWAYS use `src/components/DefaultComponent.tsx` as a template when creating a new React component in this project. It provides the standard `HTMLAttributes` and `PropsWithChildren` wrapper, along with proper `data-name` attributes for debugging.

---

## Planning and Execution Guidelines

*   **No Planning Mode Unless Explicitly Requested:** Do NOT create implementation plans, task checklists (e.g. `task.md`), or walkthrough artifacts (e.g. `walkthrough.md`) automatically at the start of a conversation. The agent must proceed directly to code changes and execution, skipping the implementation plan phase entirely, unless the user explicitly requests one.
