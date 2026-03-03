import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './Component/App';
import { Provider } from 'react-redux';
import { datadogRum } from '@datadog/browser-rum';
import { reactPlugin } from '@datadog/browser-rum-react';

import Store from "./Store/Store"

// 🔇 GLOBAL ERROR SUPPRESSION FOR HARMLESS THIRD-PARTY ERRORS
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorString = args.join(' ');
  
  // Suppress harmless Google Analytics errors (blocked by ad blockers)
  if (errorString.includes('google-analytics.com') || 
      errorString.includes('ERR_BLOCKED_BY_CLIENT') ||
      errorString.includes('academia-Cma1O4UX.js')) {
    return; // Silently ignore
  }
  
  // Suppress Firebase reCAPTCHA initialization warnings
  if (errorString.includes('reCAPTCHA verified') || 
      errorString.includes('recaptcha')) {
    return; // Silently ignore
  }
  
  // Allow all other errors
  originalConsoleError.apply(console, args);
};

datadogRum.init({
  applicationId: process.env.REACT_APP_DATADOG_APP_ID || '3955c403-a66a-4cfe-a13b-6fbf7f629960',
  clientToken: process.env.REACT_APP_DATADOG_CLIENT_TOKEN || 'pub4e55a313802bdb08c6394e6fb377ce8d',
  site: process.env.REACT_APP_DATADOG_SITE || 'us5.datadoghq.com',
  service: process.env.REACT_APP_DATADOG_SERVICE || 'eshopper-frontend',
  env: process.env.REACT_APP_DATADOG_ENV || process.env.NODE_ENV || 'production',
  version: process.env.REACT_APP_DATADOG_VERSION || '1.0.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 100,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  plugins: [reactPlugin({ router: false })],
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
   <Provider store={Store}>
   <App />
   </Provider>
  </React.StrictMode>
);
