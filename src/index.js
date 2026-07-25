import './datadogRUM-init';    // ← Datadog RUM for session replay & performance
import * as Sentry from '@sentry/react';

// Initialize Sentry for error tracking (separate from DatadogRUM - no conflict)
Sentry.init({
  dsn: "https://9a338081afe9842d896054b81c3ce5f6@o4510951293976576.ingest.us.sentry.io/4510951305379840",
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0,   // Don't use Sentry replay - DatadogRUM handles this
  replaysOnErrorSampleRate: 0,   // Avoid duplicate replay with DatadogRUM
  environment: process.env.NODE_ENV || 'production',
  // Filter out noisy errors that aren't actionable
  beforeSend(event) {
    const msg = String(event?.exception?.values?.[0]?.value || '');
    const noisePatterns = [
      'ResizeObserver loop',
      'Loading chunk',
      'ChunkLoadError',
      'Network Error',
      'AbortError',
      'Request timeout or abort',
      'google-analytics',
      'ERR_BLOCKED_BY_CLIENT',
      'recaptcha'
    ];
    if (noisePatterns.some(p => msg.includes(p))) return null;
    return event;
  }
});

console.log('✅ Sentry frontend error tracking initialized (env:', process.env.NODE_ENV || 'production', ')');

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './Component/App.jsx';
import { Provider } from 'react-redux';
import Store from "./Store/Store"
import { MembershipProvider } from './Component/MembershipContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queries/queryClient';

// 🔇 GLOBAL ERROR SUPPRESSION FOR HARMLESS THIRD-PARTY ERRORS
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorString = args.join(' ');
  const harmlessPatterns = [
    'google-analytics.com',
    'ERR_BLOCKED_BY_CLIENT',
    'academia-Cma1O4UX.js',
    'reCAPTCHA verified',
    'recaptcha'
  ];
  
  if (harmlessPatterns.some(p => errorString.includes(p))) return;
  originalConsoleError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
   <QueryClientProvider client={queryClient}>
    <Provider store={Store}>
     <MembershipProvider>
      <App />
     </MembershipProvider>
    </Provider>
   </QueryClientProvider>
  </React.StrictMode>
);
