const admin = require('firebase-admin');

try {
    const firebaseVar = process.env.FIREBASE_CONFIG_JSON;
    
    if (!firebaseVar) {
        console.error("⚠️ Railway variable FIREBASE_CONFIG_JSON nahi mila!");
    } else {
        // Variable ko JSON mein convert kar rahe hain
        const serviceAccount = JSON.parse(firebaseVar);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("✅ Firebase Admin Initialized Successfully!");
        }
    }
} catch (error) {
    console.error("❌ Firebase Backend Error:", error.message);
}

module.exports = admin;