# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```


## Skills

npx skills add https://github.com/sickn33/antigravity-awesome-skills --skill senior-frontend
npx skills add https://github.com/sickn33/antigravity-awesome-skills --skill react-patterns
npx skills add https://github.com/sickn33/antigravity-awesome-skills --skill typescript-expert
npx skills add https://github.com/sickn33/antigravity-awesome-skills --skill frontend-dev-guidelines 

## Decoupled Saving and Processing Queue Design

To optimize responsiveness, file saves are decoupled from publication processing. Saves write immediately to disk, while processing is delegated to a background Web Worker and managed via a cross-tab queue (needs-processing flag) coordinated by browser-native Web Locks:

```mermaid
sequenceDiagram
    participant UI as Tab UI
    participant LS as LocalStorage
    participant Lock as Web Lock "publication-processing"
    participant WW as Web Worker

    UI->>LS: Save content
    UI->>LS: publication-needs-processing = true
    UI->>+Lock: Try acquire lock

    alt Lock acquired
        Lock->>WW: Start processing
        WW-->>Lock: Done
        Lock->>LS: Check flag
        alt Flag == true
            Lock->>WW: Start follow-up processing
            WW-->>Lock: Done
            Lock->>LS: publication-needs-processing = false
        end
        Lock->>-Lock: Release lock
    else Lock busy
        Note over UI,Lock: Wait for current processor to finish
    end
```
 

