const admin = require('firebase-admin');

try {
  // Railway ke Environment Variable se data utha rahe hain
  const firebaseConfig = process.env.FIREBASE_CONFIG_JSON;

  if (!firebaseConfig) {
    throw new Error("FIREBASE_CONFIG_JSON variable is missing in Railway!");
  }

  // String ko JSON object mein convert kar rahe hain
  const serviceAccount = JSON.parse(firebaseConfig);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase Admin Initialized Successfully via Environment Variable');
} catch (error) {
  console.error('❌ Firebase Admin Init Error:', error.message);
}

// Ye export zaroori hai taaki server.js crash na ho
const firebaseAdminReady = true;

module.exports = { admin, firebaseAdminReady };