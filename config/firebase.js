// Firebase Admin initialization
const admin = require('firebase-admin');

// Service account config file path
const serviceAccount = require('../firebase-admin.json');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Export a ready flag
const firebaseAdminReady = !!admin.apps.length;

module.exports = {
  admin,
  firebaseAdminReady,
};
