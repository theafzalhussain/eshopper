import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, RecaptchaVerifier } from 'firebase/auth';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
};

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
  console.error('❌ Firebase configuration is incomplete. Auth features will be unavailable until env variables are set.');
  console.error('Missing values check:', {
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

    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    
    window.recaptchaVerifier = new RecaptchaVerifier(containerId, {
      size: 'invisible',
      callback: (response) => {
        console.log('✅ reCAPTCHA verified:', response);
      },
      'expired-callback': () => {
        console.warn('⚠️ reCAPTCHA expired');
        window.recaptchaVerifier = null;
      },
    }, auth);
    
    console.log('✅ reCAPTCHA setup successful');
    return window.recaptchaVerifier;
  } catch (error) {
    console.error('❌ reCAPTCHA setup failed:', error.message);
    return null;
  }
};

export default app;
