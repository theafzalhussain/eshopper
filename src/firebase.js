import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, RecaptchaVerifier } from 'firebase/auth';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_KEY || process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyDlXoKQZn0BG5kosCM92cqCOZb3phXV310',
  authDomain: process.env.REACT_APP_AUTH_DOMAIN || 'eshopper-auth.firebaseapp.com',
  projectId: process.env.REACT_APP_PROJECT_ID || 'eshopper-auth',
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET || 'eshopper-auth.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_SENDER_ID || process.env.REACT_APP_MESSAGING_SENDER_ID || '586466157633',
  appId: process.env.REACT_APP_APP_ID || '1:586466157633:web:2bf5267dca5af4684952c0',
};

// Debug: Verify each config value
if (typeof window !== 'undefined') {
  console.log('🔍 Firebase Config Environment Check:', {
    apiKey: firebaseConfig.apiKey ? 'Set (' + firebaseConfig.apiKey.substring(0, 10) + '...)' : 'UNDEFINED',
    authDomain: firebaseConfig.authDomain || 'UNDEFINED',
    projectId: firebaseConfig.projectId || 'UNDEFINED',
    storageBucket: firebaseConfig.storageBucket || 'UNDEFINED',
    messagingSenderId: firebaseConfig.messagingSenderId || 'UNDEFINED',
    appId: firebaseConfig.appId ? firebaseConfig.appId.substring(0, 15) + '...' : 'UNDEFINED',
  });
}

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId &&
  firebaseConfig.apiKey !== 'your-api-key-here'
);

let app = null;
let auth = null;
let googleProvider = null;

if (hasFirebaseConfig) {
  console.log('🔥 Firebase Config Loaded:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey
  });

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} else {
  console.warn('⚠️ Firebase configuration is incomplete. Auth features will be unavailable until env variables are set.');
  console.warn('Missing values check:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
    hasStorageBucket: !!firebaseConfig.storageBucket,
    hasSenderId: !!firebaseConfig.messagingSenderId,
    hasAppId: !!firebaseConfig.appId,
  });
}

export { auth, googleProvider };

// Set up reCAPTCHA verifier for phone authentication
export const setUpRecaptcha = (containerId = 'recaptcha-container') => {
  try {
    if (!auth) {
      console.error('❌ Cannot setup reCAPTCHA because Firebase Auth is not initialized.');
      return null;
    }

    // Check if verifier already exists and is valid
    if (window.recaptchaVerifier) {
      console.log('ℹ️ reCAPTCHA verifier already exists, reusing...');
      return window.recaptchaVerifier;
    }

    // Clear the container before creating new verifier
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('❌ reCAPTCHA container not found:', containerId);
      return null;
    }
    
    // Clear container innerHTML to prevent "already rendered" error
    container.innerHTML = '';
    
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        console.log('✅ reCAPTCHA verified:', response);
      },
      'expired-callback': () => {
        console.warn('⚠️ reCAPTCHA expired, clearing verifier...');
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (e) {
            console.warn('Cleanup error:', e);
          }
          window.recaptchaVerifier = null;
        }
      },
    });
    
    console.log('✅ reCAPTCHA setup successful');
    return window.recaptchaVerifier;
  } catch (error) {
    console.error('❌ reCAPTCHA setup failed:', error.message);
    // Clear on error
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    return null;
  }
};

export default app;
