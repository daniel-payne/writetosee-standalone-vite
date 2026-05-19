# Standalone UI Developer Skills

This repository represents the standalone frontend service for **WriteToSee**. This document details vital repository-specific development skills, state management rules, and file system storage guidelines that developer agents and assistants must follow.

## 1. State Management with `@keldan-systems/state-mutex`

For state management and persistent local UI state, we use `@keldan-systems/state-mutex`. This replaces native React state when sharing state or synchronizing with localStorage.

### Core Hooks:
*   `useSharedState<T>(key: string, defaultValue: T)`: Shares state across components using the same key.
*   `useLocalState<T>(key: string, defaultValue: T)`: Shares state across components and synchronizes it with browser `localStorage`. Perfect for multi-tab synchronization and persisting user preferences/inputs between sessions.

### Usage Example:
```typescript
import { useLocalState } from '@keldan-systems/state-mutex';

// Persisted username input that updates across components and browser tabs
const [username, setUsername] = useLocalState<string>('username', 'Guest');
```

---

## 2. File Storage with File System Access API

When storing files received from LLMs (such as Markdown `.md` text and PNG `.png` images) directly to the user's local disk, we utilize the modern browser **File System Access API**. 

*   **Directory Permissions:** Prompt the user to select and authorize access to a local directory once.
*   **File Writing:** Create and write to `.md` and `.png` files inside that designated directory.
*   **Handle Persistence:** Store the directory handle in IndexedDB (or serialized) so that the user doesn't have to re-select the folder on every reload (though they will need to re-grant permission).

---

## 3. Version Control & Git Commit Ownership

*   **Commit Responsibility:** The developer agent must **NEVER** run `git commit` commands. All commits and repository snapshot updates are handled exclusively by the user. Do not attempt to commit code changes.
