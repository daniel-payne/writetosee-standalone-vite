// Patch window.atob to handle non-base64 hash changes (like React Router HashRouter routes) gracefully
const originalAtob = window.atob;
window.atob = function(str: string): string {
  try {
    return originalAtob(str);
  } catch {
    return '';
  }
};

// Helper to remove apiKey query param from a URL string, including standard and hash-based search parameters
function cleanUrlParams(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    let modified = false;

    if (url.searchParams.has('apiKey')) {
      url.searchParams.delete('apiKey');
      modified = true;
    }

    if (url.hash && url.hash.includes('apiKey')) {
      const parts = url.hash.split('?');
      if (parts.length > 1) {
        const hashPath = parts[0];
        const hashSearch = parts[1];
        const hashParams = new URLSearchParams(hashSearch);
        if (hashParams.has('apiKey')) {
          hashParams.delete('apiKey');
          const newHashSearch = hashParams.toString();
          url.hash = newHashSearch ? `${hashPath}?${newHashSearch}` : hashPath;
          modified = true;
        }
      }
    }

    return modified ? url.toString() : urlStr;
  } catch (_e) {
    return urlStr;
  }
}

// Capture API key from URL query parameter (either standard query or hash query) and store it in sessionStorage
try {
  if (typeof window !== 'undefined' && window.location) {
    const searchParams = new URLSearchParams(window.location.search);
    let apiKeyParam = searchParams.get('apiKey');
    
    // If not found, check inside the hash query parameter (useful for HashRouter or hash-based routing)
    if (!apiKeyParam) {
      const hash = window.location.hash;
      if (hash.includes('?')) {
        const hashSearch = hash.split('?')[1];
        const hashParams = new URLSearchParams(hashSearch);
        apiKeyParam = hashParams.get('apiKey');
      }
    }
    
    // Fallback: parse from the full location href
    if (!apiKeyParam) {
      const url = new URL(window.location.href);
      apiKeyParam = url.searchParams.get('apiKey');
    }

    if (apiKeyParam) {
      window.sessionStorage.setItem('apiKey', apiKeyParam);
      
      // Overwrite the browser history with the URL stripped of ?apiKey=... to prevent leakage
      setTimeout(() => {
        try {
          const cleanUrl = cleanUrlParams(window.location.href);
          if (cleanUrl !== window.location.href) {
            window.history.replaceState(null, '', cleanUrl);
          }
        } catch (historyErr) {
          console.warn('Failed to replace state in browser history:', historyErr);
        }
      }, 0);
    }
  }
} catch (e) {
  console.warn('Failed to extract apiKey from URL on initial load:', e);
}

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
    } catch {
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
    } catch {
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
