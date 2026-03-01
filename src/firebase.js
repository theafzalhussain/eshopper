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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Provider for OAuth
export const googleProvider = new GoogleAuthProvider();

// Set up reCAPTCHA verifier for phone authentication
export const setUpRecaptcha = (containerId = 'recaptcha-container') => {
  try {
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
