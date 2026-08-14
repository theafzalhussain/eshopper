import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
/* Loaded after index.css on purpose: these rules reserve layout space for
   async content and must win on equal specificity. See the file header for
   the Datadog RUM findings each block addresses. */
import './styles/cls-fixes.css';
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
import { isChunkLoadFailure, recoverFromChunkError } from './utils/chunkRecovery';

/* ════════════════════════════════════════════════════════════
   EARLY ERROR BUFFER
   Sentry and Datadog now load after first paint, so we catch
   anything that breaks in the meantime and replay it later.
════════════════════════════════════════════════════════════ */
const earlyErrors = [];
const MAX_BUFFERED = 20;

const bufferError = (message, error) => {
  if (earlyErrors.length >= MAX_BUFFERED) return;
  earlyErrors.push({
    message: String(message || ''),
    error,
    /* kept separately: an extension error often has no Error instance,
       and monitoring.js needs the frames to tell ours from theirs */
    stack: String(error?.stack || '')
  });
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
   Detection + one-time cache-busted reload live in utils/chunkRecovery
   so App.jsx's error boundary uses exactly the same rules.
════════════════════════════════════════════════════════════ */
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
