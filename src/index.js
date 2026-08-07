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

/* ══════════════════════════════════════════════════════════
   EARLY ERROR BUFFER
   Sentry and Datadog now load after first paint, so we catch
   anything that breaks in the meantime and replay it later.
══════════════════════════════════════════════════════════ */
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
