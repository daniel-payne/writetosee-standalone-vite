// Patch window.atob to handle non-base64 hash changes (like React Router HashRouter routes) gracefully
const originalAtob = window.atob;
window.atob = function(str: string): string {
  try {
    return originalAtob(str);
  } catch (e) {
    return '';
  }
};

import { setState, StoragePersistence } from '@keldan-systems/state-mutex';

declare global {
  interface Window {
    localstate?: {
      clear: (key: string) => void;
    };
  }
}

window.localstate = {
  clear: (key: string) => {
    setState(key, null, StoragePersistence.local);
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignore security errors in some iframe contexts
    }
  }
};

const handleCleanup = () => {
  if (window.localstate) {
    try {
      const apiKey = sessionStorage.getItem('apiKey');
      if (apiKey) {
        window.localstate.clear('publication-data');
      }
    } catch (e) {
      // Ignore security errors in some iframe contexts
    }
  }
};

window.addEventListener('pagehide', handleCleanup);
window.addEventListener('beforeunload', handleCleanup);

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
