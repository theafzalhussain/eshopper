#!/usr/bin/env node

/**
 * 🚀 QUICK SMOKE TEST - Omni-Flow System
 * Validates core email triggers and invoice system
 * Minimal setup required
 */

const http = require('http');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    step: (num, msg) => console.log(`\n${colors.bright}${num}. ${msg}${colors.reset}`)
};

// Test server health
async function testServerHealth() {
    log.step('1️⃣', 'Checking Server Health...');
    
    return new Promise((resolve) => {
        const req = http.get('http://localhost:8000/api/health', (res) => {
            if (res.statusCode === 200 || res.statusCode === 404) {
                log.success('Server is running on http://localhost:8000');
                resolve(true);
            } else {
                log.error(`Server responded with status: ${res.statusCode}`);
                resolve(false);
            }
        });

        req.on('error', (err) => {
            log.error('Server is not running!');
            log.warning('Start server with: npm start or node server.js');
            resolve(false);
        });

        req.setTimeout(3000, () => {
            req.destroy();
            log.error('Server connection timeout');
            resolve(false);
        });
    });
}

// Check environment configuration
function checkConfiguration() {
    log.step('2️⃣', 'Checking Configuration...');
    
    const checks = [
        { name: 'FEATURE_EMAIL_NOTIFICATIONS', required: true },
        { name: 'FEATURE_INVOICE_SYSTEM', required: true },
        { name: 'BREVO_API_KEY or SMTP_HOST', required: true },
        { name: 'MONGODB_URI', required: true },
        { name: 'ADMIN_SECRET', required: false }
    ];

    log.info('Check server.js logs to verify:');
    checks.forEach(check => {
        const status = check.required ? '🔴 Required' : '🟢 Optional';
        console.log(`   ${status} - ${check.name}`);
    });

    return true;
}

// Validate code changes
function validateCodeChanges() {
    log.step('3️⃣', 'Validating Code Changes...');
    
    const fs = require('fs');
    const checks = [];

    // Check server.js for key functions
    try {
        const serverCode = fs.readFileSync('./server.js', 'utf8');
        
        checks.push({
            name: 'enqueueEmailJob function',
            pass: serverCode.includes('enqueueEmailJob')
        });
        
        checks.push({
            name: 'sendOrderPlacedEmail function',
            pass: serverCode.includes('sendOrderPlacedEmail')
        });
        
        checks.push({
            name: 'sendOrderStatusEmail function',
            pass: serverCode.includes('sendOrderStatusEmail')
        });
        
        checks.push({
            name: 'isValidBase64Payload helper',
            pass: serverCode.includes('isValidBase64Payload')
        });
        
        checks.push({
            name: '/download-invoice endpoint',
            pass: serverCode.includes('/download-invoice')
        });

    } catch (err) {
        log.error('Could not read server.js file');
        return false;
    }

    // Check frontend files
    try {
        const myOrdersCode = fs.readFileSync('./src/Component/MyOrders.jsx', 'utf8');
        checks.push({
            name: 'MyOrders download endpoint updated',
            pass: myOrdersCode.includes('/download-invoice')
        });

        const trackingCode = fs.readFileSync('./src/Component/OrderTracking.jsx', 'utf8');
        checks.push({
            name: 'OrderTracking download endpoint updated',
            pass: trackingCode.includes('/download-invoice')
        });
    } catch (err) {
        log.warning('Could not read frontend files');
    }

    // Print results
    let allPass = true;
    checks.forEach(check => {
        if (check.pass) {
            log.success(check.name);
        } else {
            log.error(check.name);
            allPass = false;
        }
    });

    return allPass;
}

// Print manual testing guide
function printManualTestGuide() {
    log.step('4️⃣', 'Manual Testing Guide');
    
    console.log(`
${colors.bright}Quick Manual Test:${colors.reset}

1️⃣  ${colors.cyan}Order Placed Trigger:${colors.reset}
   - Place order from frontend (http://localhost:3000)
   - Check server logs for: "📧 Order Placed email sent"
   - Check logs for: "OrderReceipt-[orderId].pdf"

2️⃣  ${colors.cyan}Admin Confirm Trigger:${colors.reset}
   - Go to admin panel, confirm the order
   - Check logs for: "Email queued for [orderId] (Confirmed)"
   - Check logs for: "Confirmation-[orderId].pdf attached"

3️⃣  ${colors.cyan}Status Update Triggers (No PDF):${colors.reset}
   - Change status to Packed/Shipped/Out for Delivery
   - Check logs confirm: NO PDF attachment
   - Verify: "Status template email sent" appears

4️⃣  ${colors.cyan}Delivered Trigger (Final Invoice):${colors.reset}
   - Change status to Delivered
   - Check logs for: "FinalTaxInvoice-[orderId].pdf attached"
   - Verify final invoice has GST/tax details

5️⃣  ${colors.cyan}Dynamic Invoice Download:${colors.reset}
   - Go to My Orders page
   - Click "Download Receipt/Proforma/Tax Invoice" button
   - Verify PDF downloads with correct filename
   - Test at different order statuses

${colors.bright}What to Look for in Server Logs:${colors.reset}

${colors.green}✅ Success patterns:${colors.reset}
   • "enqueueEmailJob('order-placed'..."
   • "enqueueEmailJob('order-confirmed'..."
   • "enqueueEmailJob('order-status'..."
   • "Dynamic invoice generated: [filename]"
   • "Status template email sent"

${colors.red}❌ Error patterns to avoid:${colors.reset}
   • "PDF generation failed"
   • "Email queue failed"
   • "Template load error"
   • "Buffer is invalid"
    `);
}

// Print production checklist
function printProductionChecklist() {
    log.title('📋 PRE-PRODUCTION CHECKLIST');
    
    console.log(`
${colors.bright}Before pushing to production:${colors.reset}

[ ] Server starts without errors
[ ] All email triggers tested (1-4)
[ ] PDFs attach on correct triggers only
[ ] Dynamic invoice download works
[ ] Frontend button labels update correctly
[ ] No console errors in browser
[ ] Email provider dashboard shows sent emails
[ ] Downloaded PDFs open and render correctly
[ ] Socket.io updates work for status changes
[ ] Admin panel actions trigger emails
[ ] Test with real user account

${colors.bright}Environment Variables to Verify:${colors.reset}

Production .env must have:
- FEATURE_EMAIL_NOTIFICATIONS=true
- FEATURE_INVOICE_SYSTEM=true
- BREVO_API_KEY or SMTP config
- MONGODB_URI
- FRONTEND_URL (for links in emails)
- ADMIN_SECRET (for admin endpoints)

${colors.bright}Deployment Command:${colors.reset}

${colors.cyan}git add .
git commit -m "feat: Complete Omni-Flow email & dynamic invoice system"
git push origin main${colors.reset}
    `);
}

// Main runner
async function main() {
    console.log(`
${colors.bright}${colors.blue}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 OMNI-FLOW SYSTEM - QUICK SMOKE TEST 🚀              ║
║                                                           ║
║   Email Triggers + Dynamic Invoice Download              ║
║   Version: 1.0.0                                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);

    // Run checks
    const serverHealthy = await testServerHealth();
    const configOk = checkConfiguration();
    const codeValid = validateCodeChanges();

    console.log('\n' + '='.repeat(60));
    
    if (serverHealthy && codeValid) {
        log.title('🎉 SMOKE TEST PASSED!');
        log.success('Core system changes are in place');
        log.success('Server is running and responsive');
        log.success('Code validations passed');
        console.log('');
        log.info('Next: Run manual tests or full automated suite');
        log.info('See TEST_SETUP_GUIDE.md for detailed instructions');
        
        printManualTestGuide();
        printProductionChecklist();
        
        process.exit(0);
    } else {
        log.title('⚠️  SMOKE TEST WARNINGS');
        if (!serverHealthy) log.error('Server is not running properly');
        if (!codeValid) log.error('Some code validations failed');
        console.log('');
        log.warning('Fix issues above before proceeding');
        log.info('See TEST_SETUP_GUIDE.md for troubleshooting');
        
        process.exit(1);
    }
}

// Run
main().catch(err => {
    log.error(`Fatal error: ${err.message}`);
    process.exit(1);
});
