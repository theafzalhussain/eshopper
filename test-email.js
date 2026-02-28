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
                email: "support@eshopperr.me"
            },
            to: [{ email: "theafzalhussain786@gmail.com" }],
            subject: "Your Verification Code for Eshopper Account",
            textContent: "Your verification code is: 123456\n\nThis code will expire in 10 minutes.\n\nBest regards,\nEshopper Team",
            htmlContent: `
                <!DOCTYPE html>
                <html>
                <body style="font-family:Arial,sans-serif;background-color:#f4f4f4;padding:20px;">
                    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
                        <div style="background:#17a2b8;padding:30px;text-align:center;">
                            <h1 style="color:#fff;margin:0;">Eshopper</h1>
                        </div>
                        <div style="padding:40px;">
                            <h2 style="color:#333;">Account Verification</h2>
                            <p style="color:#666;">Thank you for choosing Eshopper. Your verification code:</p>
                            <div style="background:#f8f9fa;border:2px solid #17a2b8;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
                                <div style="font-size:36px;font-weight:bold;color:#17a2b8;letter-spacing:8px;">123456</div>
                            </div>
                            <p style="color:#666;font-size:14px;">Code expires in 10 minutes.</p>
                        </div>
                        <div style="background:#f8f9fa;padding:20px;text-align:center;">
                            <p style="color:#999;font-size:12px;margin:0;">© 2026 Eshopper | www.eshopperr.me</p>
                        </div>
                    </div>
                </body>
                </html>
            `
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
