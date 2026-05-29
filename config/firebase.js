// 🔐 FIREBASE ADMIN INITIALIZATION - ULTIMATE FIX
const admin = require('firebase-admin');

const initializeFirebaseAdmin = () => {
    try {
        if (admin.apps.length > 0) return; // Pehle se init hai toh wapas mat karo

        let cert;
        let projectId;
        // 1. PRODUCTION MODE (Render)
        if (process.env.FIREBASE_CONFIG_JSON) {
            console.log("📱 Parsing Firebase JSON from Environment Variable...");
            const rawJson = process.env.FIREBASE_CONFIG_JSON.trim();
            // Handle common parsing errors
            const parsed = JSON.parse(rawJson);
            // 💡 Private key mein \n ko sahi newline character se badlo
            if (parsed.private_key) {
                parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
            }
            cert = admin.credential.cert(parsed);
            projectId = parsed.project_id;
        } 
        // 2. LOCAL MODE (VS Code)
        else {
            console.log("📂 Loading Firebase from local JSON file...");
            const serviceAccount = require("../firebase-admin.json");
            cert = admin.credential.cert(serviceAccount);
            projectId = serviceAccount.project_id;
        }

        admin.initializeApp({ 
            credential: cert,
            projectId: projectId
        });
        console.log(`✅ Firebase Admin Sync SUCCESS: ${admin.app().options.projectId}`);
    } catch (error) {
        console.error("❌ CRITICAL: Firebase SDK initialization FAILED!");
        console.error("Message:", error.message);
    }
};

initializeFirebaseAdmin();

const firebaseAdminReady = !!admin.apps.length;

module.exports = {
  admin,
  firebaseAdminReady,
};
