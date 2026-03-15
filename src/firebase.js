const admin = require('firebase-admin');

try {
    const configData = process.env.FIREBASE_CONFIG_JSON;
    
    if (configData) {
        const serviceAccount = JSON.parse(configData);
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("✅ Firebase Admin Connected!");
        }
    } else {
        console.error("⚠️ Error: FIREBASE_CONFIG_JSON variable not found in Railway!");
    }
} catch (err) {
    console.error("❌ Firebase Secret Error:", err.message);
}

module.exports = admin;