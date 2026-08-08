---
name: writetosee-standalone
description: "Use when developing features, managing state, or saving files in the WriteToSee standalone React application."
category: development
risk: low
source: local
date_added: "2026-05-19"
---

# WriteToSee Standalone UI Developer Skills

This skill governs development rules, state management, and file storage guidelines for the WriteToSee standalone frontend.

## Domain Specifications & Architecture References

Always reference and adhere to the following domain architecture and processing specification documents:
*   **Domain Models:** [`domain.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/domain.md) – Defines entities, data structures, and relationships.
*   **Interactions:** [`interactions.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/interactions.md) – Defines UI actions, intents, buttons, and user interaction flows.
*   **Processing Pipeline:** [`processing.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/processing.md) – Defines data transformation, instruction compilation, and LLM processing workflows.
*   **States & Storage:** [`states.md`](file:///home/daniel/Data/GitHub/writetosee/writetosee-standalone-vite/skills/writetosee-standalone/states.md) – Defines Dexie IndexedDB schemas, `@keldan-systems/state-mutex` display keys, and synchronization.

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
