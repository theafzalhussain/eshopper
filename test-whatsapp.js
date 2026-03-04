// Quick WhatsApp Test Script
require('dotenv').config();
const axios = require('axios');

const testWhatsApp = async () => {
    console.log('\n🔍 WhatsApp Configuration Check:\n');
    console.log('EVOLUTION_API_URL:', process.env.EVOLUTION_API_URL ? '✅ Set' : '❌ Missing');
    console.log('WHATSAPP_TOKEN:', process.env.WHATSAPP_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('EVOLUTION_API_KEY:', process.env.EVOLUTION_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('WHATSAPP_INSTANCE:', process.env.WHATSAPP_INSTANCE || 'eshopper_bot');
    console.log('WHATSAPP_SENDER_NUMBER:', process.env.WHATSAPP_SENDER_NUMBER || '❌ Missing');
    
    console.log('\n📡 Testing Evolution API Connection...\n');
    
    try {
        // Test 1: Check instance status
        const statusResponse = await axios.get(
            `${process.env.EVOLUTION_API_URL}/instance/connect/${process.env.WHATSAPP_INSTANCE}`,
            {
                headers: {
                    'apikey': process.env.EVOLUTION_API_KEY
                }
            }
        );
        
        console.log('✅ Instance Status:', statusResponse.data);
        
        // Test 2: Send a test message
        console.log('\n📤 Sending test message...\n');
        
        const testPayload = {
            number: '918447859784', // Your admin number
            text: '🧪 **WhatsApp Diagnostic Test**\n\n✅ Evolution API: Connected\n✅ Message Sending: Working\n✅ Server Integration: Active\n\nTimestamp: ' + new Date().toLocaleString('en-IN')
        };
        
        const sendResponse = await axios.post(
            `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.WHATSAPP_INSTANCE}`,
            testPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': process.env.EVOLUTION_API_KEY || process.env.WHATSAPP_TOKEN
                },
                timeout: 30000
            }
        );
        
        console.log('✅ Message Sent Successfully!');
        console.log('Status:', sendResponse.status);
        console.log('Message ID:', sendResponse.data.key?.id);
        console.log('Response:', JSON.stringify(sendResponse.data, null, 2));
        
        console.log('\n✨ WhatsApp is working correctly! Check your phone for the test message.\n');
        
    } catch (error) {
        console.error('\n❌ WhatsApp Test Failed!\n');
        console.error('Error Message:', error.message);
        if (error.response) {
            console.error('Status Code:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
            console.error('Request URL:', error.config?.url);
        }
        
        console.log('\n🔧 Possible Fixes:');
        console.log('1. Check if EVOLUTION_API_URL is correct');
        console.log('2. Verify EVOLUTION_API_KEY or WHATSAPP_TOKEN is valid');
        console.log('3. Ensure WhatsApp instance is connected on Evolution API dashboard');
        console.log('4. Check if phone number format is correct (91 + 10 digits)');
        process.exit(1);
    }
};

testWhatsApp();
