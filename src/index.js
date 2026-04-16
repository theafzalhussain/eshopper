import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './Component/App.jsx';
import { Provider } from 'react-redux';
import Store from "./Store/Store"
import { MembershipProvider } from './Component/MembershipContext';

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
   <Provider store={Store}>
    <MembershipProvider>
     <App />
    </MembershipProvider>
   </Provider>
  </React.StrictMode>
);
