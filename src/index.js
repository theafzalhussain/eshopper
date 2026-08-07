import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './Component/App.jsx';
import { Provider } from 'react-redux';
import Store from "./Store/Store"
import { MembershipProvider } from './Component/MembershipContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queries/queryClient';
import { startMonitoring } from './monitoring';

/* ════════════════════════════════════════════════════════════
   EARLY ERROR BUFFER
   Sentry and Datadog now load after first paint, so we catch
   anything that breaks in the meantime and replay it later.
════════════════════════════════════════════════════════════ */
const earlyErrors = [];
const MAX_BUFFERED = 20;

const bufferError = (message, error) => {
  if (earlyErrors.length >= MAX_BUFFERED) return;
  earlyErrors.push({ message: String(message || ''), error });
};

const onWindowError = (e) => bufferError(e?.message || e?.error?.message, e?.error);
const onRejection = (e) => bufferError(e?.reason?.message || e?.reason, e?.reason);

window.addEventListener('error', onWindowError);
window.addEventListener('unhandledrejection', onRejection);

/* ════════════════════════════════════════════════════════════
   CHUNK LOAD RECOVERY (CRA / code-splitting)
   After a new deploy, an old tab can request a deleted JS chunk.
   That shows as:
     ChunkLoadError: Loading chunk X failed
     Uncaught SyntaxError: Unexpected token '<'
   (because the missing chunk URL returns index.html)
   Fix: reload once so the browser picks up the latest main.js.
════════════════════════════════════════════════════════════ */
const CHUNK_RELOAD_KEY = 'eshopper_chunk_reload_ts';

function isChunkLoadFailure(value) {
  const msg = String(
    value?.message ||
    value?.reason?.message ||
    value?.error?.message ||
    value ||
    ''
  );
  const name = String(value?.name || value?.reason?.name || value?.error?.name || '');
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

function recoverFromChunkError(source) {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    const now = Date.now();
    // Prevent infinite reload loops
    if (now - last < 15000) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    console.warn('[Eshopper] Chunk load failed after deploy. Reloading once...', source);
    // cache-bust reload
    const url = new URL(window.location.href);
    url.searchParams.set('_r', String(now));
    window.location.replace(url.toString());
  } catch (_) {
    window.location.reload();
  }
}

window.addEventListener('error', (e) => {
  if (isChunkLoadFailure(e?.error) || isChunkLoadFailure(e?.message)) {
    recoverFromChunkError(e?.message || e?.error);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  if (isChunkLoadFailure(e?.reason)) {
    recoverFromChunkError(e?.reason);
  }
});

/* 🔇 Suppress harmless third-party console noise (cheap, stays synchronous) */
const originalConsoleError = console.error;
const harmlessPatterns = [
  'google-analytics.com',
  'ERR_BLOCKED_BY_CLIENT',
  'academia-Cma1O4UX.js',
  'reCAPTCHA verified',
  'recaptcha'
];
console.error = (...args) => {
  const errorString = args.join(' ');
  if (harmlessPatterns.some(p => errorString.includes(p))) return;
  // Also recover if React logs ChunkLoadError via console.error
  if (isChunkLoadFailure(errorString)) {
    recoverFromChunkError(errorString);
    return;
  }
  originalConsoleError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
   <HelmetProvider>
    <QueryClientProvider client={queryClient}>
     <Provider store={Store}>
      <MembershipProvider>
       <App />
      </MembershipProvider>
     </Provider>
    </QueryClientProvider>
   </HelmetProvider>
  </React.StrictMode>
);

/* Observability boots once the page is interactive — never before. */
startMonitoring(earlyErrors);
