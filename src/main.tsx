// Patch window.atob to handle non-base64 hash changes (like React Router HashRouter routes) gracefully
const originalAtob = window.atob;
window.atob = function(str: string): string {
  try {
    return originalAtob(str);
  } catch (e) {
    return '';
  }
};

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
