// Test Brevo email sending
require('dotenv').config();
const axios = require('axios');

async function testEmail() {
    try {
        const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
        
        if (!BREVO_KEY) {
            console.error("❌ BREVO_API_KEY not found");
            return;
        }
        
        console.log("✅ BREVO_API_KEY found (length:", BREVO_KEY.length, ")");
        console.log("🧪 Testing email send...");
        
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { 
                name: "Eshopper", 
                email: process.env.SENDER_EMAIL || "support@eshopperr.me" 
            },
            to: [{ email: "test@example.com" }],
            subject: "🔐 Test Email",
            htmlContent: "<h1>Test OTP: 123456</h1>"
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_KEY,
                'content-type': 'application/json'
            }
        });
        
        console.log("✅ Email sent successfully!");
        console.log("📧 Message ID:", response.data.messageId);
    } catch (error) {
        console.error("❌ Email Error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Full error:", error);
        }
    }
}

testEmail();
