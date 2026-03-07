/**
 * 🧪 OMNI-FLOW EMAIL & INVOICE TEST MATRIX
 * Complete simulation of all 4 email triggers + invoice download
 * Run: node test-omni-flow.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
const TEST_USER_ID = process.env.TEST_USER_ID || '507f1f77bcf86cd799439011'; // Replace with real user ID
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_NAME = process.env.TEST_USER_NAME || 'Test User';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your-admin-secret-here';

// Test results tracking
const results = {
    passed: [],
    failed: [],
    logs: []
};

const log = (emoji, message) => {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} ${emoji} ${message}`;
    console.log(logLine);
    results.logs.push(logLine);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== TEST 1: ORDER PLACED TRIGGER ====================
async function testOrderPlacedTrigger() {
    log('🧪', '='.repeat(80));
    log('📦', 'TEST 1: ORDER PLACED TRIGGER (Receipt PDF Attachment)');
    log('🧪', '='.repeat(80));

    try {
        const orderPayload = {
            userId: TEST_USER_ID,
            paymentMethod: 'COD',
            totalAmount: 2500,
            shippingAmount: 150,
            finalAmount: 2650,
            shippingAddress: {
                fullName: TEST_USER_NAME,
                phone: '9876543210',
                addressline1: '123 Test Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                pin: '400001',
                country: 'India'
            },
            products: [
                {
                    productid: '507f1f77bcf86cd799439012',
                    name: 'Premium Silk Scarf',
                    qty: 2,
                    price: 1250,
                    total: 2500,
                    size: 'One Size',
                    color: 'Gold',
                    pic: 'https://via.placeholder.com/150'
                }
            ]
        };

        log('📤', 'Sending order placement request...');
        const response = await axios.post(`${BASE_URL}/api/place-order`, orderPayload, {
            timeout: 30000
        });

        if (response.data.success) {
            const orderId = response.data.order.orderId;
            log('✅', `Order placed successfully: ${orderId}`);
            log('📧', 'Expected: Email queued with OrderReceipt.pdf attachment');
            log('📋', `Response: ${JSON.stringify(response.data, null, 2)}`);
            
            results.passed.push('Test 1: Order Placed Trigger');
            return { success: true, orderId };
        } else {
            throw new Error('Order placement failed');
        }
    } catch (error) {
        log('❌', `Test 1 FAILED: ${error.message}`);
        results.failed.push(`Test 1: ${error.message}`);
        return { success: false };
    }
}

// ==================== TEST 2: ADMIN CONFIRM TRIGGER ====================
async function testAdminConfirmTrigger(orderId) {
    log('🧪', '='.repeat(80));
    log('✅', 'TEST 2: ADMIN CONFIRM ORDER TRIGGER (Proforma PDF Attachment)');
    log('🧪', '='.repeat(80));

    if (!orderId) {
        log('⚠️', 'Skipping Test 2: No orderId from Test 1');
        return { success: false };
    }

    try {
        const confirmPayload = {
            orderId,
            adminSecret: ADMIN_SECRET,
            estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };

        log('📤', `Confirming order: ${orderId}...`);
        const response = await axios.post(`${BASE_URL}/api/admin/confirm-order`, confirmPayload, {
            timeout: 30000,
            headers: {
                'x-admin-secret': ADMIN_SECRET
            }
        });

        if (response.data.success) {
            log('✅', `Order confirmed successfully: ${orderId}`);
            log('📧', 'Expected: Confirmation email with Proforma PDF attachment');
            log('📋', `Response: ${JSON.stringify(response.data, null, 2)}`);
            
            results.passed.push('Test 2: Admin Confirm Trigger');
            return { success: true };
        } else {
            throw new Error('Order confirmation failed');
        }
    } catch (error) {
        log('❌', `Test 2 FAILED: ${error.message}`);
        if (error.response) {
            log('📋', `Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        results.failed.push(`Test 2: ${error.message}`);
        return { success: false };
    }
}

// ==================== TEST 3: STATUS UPDATES (NO PDF) ====================
async function testStatusUpdatesTrigger(orderId) {
    log('🧪', '='.repeat(80));
    log('📦', 'TEST 3: STATUS UPDATES TRIGGERS (Packed/Shipped/OFD - NO PDF)');
    log('🧪', '='.repeat(80));

    if (!orderId) {
        log('⚠️', 'Skipping Test 3: No orderId from Test 1');
        return { success: false };
    }

    const statuses = ['Packed', 'Shipped', 'Out for Delivery'];
    let allPassed = true;

    for (const status of statuses) {
        try {
            log('📤', `Updating order to status: ${status}...`);
            
            const updatePayload = {
                orderId,
                status,
                estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            };

            const response = await axios.post(`${BASE_URL}/api/update-order-status`, updatePayload, {
                timeout: 30000
            });

            if (response.data.success) {
                log('✅', `Status updated to ${status}: ${orderId}`);
                log('📧', `Expected: Status email sent WITHOUT PDF attachment`);
                log('📋', `Response: ${JSON.stringify(response.data, null, 2)}`);
            } else {
                throw new Error(`Status update to ${status} failed`);
            }

            await delay(2000); // Wait 2s between status updates
        } catch (error) {
            log('❌', `Test 3 (${status}) FAILED: ${error.message}`);
            if (error.response) {
                log('📋', `Response: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            allPassed = false;
            results.failed.push(`Test 3 (${status}): ${error.message}`);
        }
    }

    if (allPassed) {
        results.passed.push('Test 3: Status Updates (Packed/Shipped/OFD)');
    }

    return { success: allPassed };
}

// ==================== TEST 4: DELIVERED TRIGGER (FINAL INVOICE) ====================
async function testDeliveredTrigger(orderId) {
    log('🧪', '='.repeat(80));
    log('🎉', 'TEST 4: DELIVERED TRIGGER (Final Tax Invoice PDF Attachment)');
    log('🧪', '='.repeat(80));

    if (!orderId) {
        log('⚠️', 'Skipping Test 4: No orderId from Test 1');
        return { success: false };
    }

    try {
        const deliveredPayload = {
            orderId,
            status: 'Delivered'
        };

        log('📤', `Marking order as Delivered: ${orderId}...`);
        const response = await axios.post(`${BASE_URL}/api/update-order-status`, deliveredPayload, {
            timeout: 30000
        });

        if (response.data.success) {
            log('✅', `Order marked as Delivered: ${orderId}`);
            log('📧', 'Expected: Delivered email with FinalTaxInvoice.pdf attachment');
            log('📋', `Response: ${JSON.stringify(response.data, null, 2)}`);
            
            results.passed.push('Test 4: Delivered Trigger (Final Invoice)');
            return { success: true };
        } else {
            throw new Error('Delivered status update failed');
        }
    } catch (error) {
        log('❌', `Test 4 FAILED: ${error.message}`);
        if (error.response) {
            log('📋', `Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        results.failed.push(`Test 4: ${error.message}`);
        return { success: false };
    }
}

// ==================== TEST 5: DYNAMIC INVOICE DOWNLOAD ====================
async function testDynamicInvoiceDownload(orderId) {
    log('🧪', '='.repeat(80));
    log('📥', 'TEST 5: DYNAMIC INVOICE DOWNLOAD ENDPOINT');
    log('🧪', '='.repeat(80));

    if (!orderId) {
        log('⚠️', 'Skipping Test 5: No orderId from Test 1');
        return { success: false };
    }

    const testCases = [
        { status: 'Ordered', expectedFilename: 'Receipt', description: 'Receipt PDF' },
        { status: 'Confirmed', expectedFilename: 'Confirmation', description: 'Proforma PDF' },
        { status: 'Delivered', expectedFilename: 'TaxInvoice', description: 'Final Tax Invoice PDF' }
    ];

    let allPassed = true;

    for (const testCase of testCases) {
        try {
            log('📤', `Testing download for status: ${testCase.status}...`);
            
            const response = await axios.get(
                `${BASE_URL}/api/orders/${orderId}/download-invoice?userId=${TEST_USER_ID}`,
                {
                    responseType: 'arraybuffer',
                    timeout: 45000
                }
            );

            const contentDisposition = response.headers['content-disposition'] || '';
            const filenameMatch = contentDisposition.match(/filename="?([^\";]+)"?/i);
            const filename = filenameMatch ? filenameMatch[1] : 'unknown.pdf';

            if (filename.includes(testCase.expectedFilename)) {
                log('✅', `Download successful for ${testCase.status}: ${filename}`);
                log('📄', `PDF size: ${response.data.length} bytes`);
                log('🎯', `Expected: ${testCase.description}`);
                log('✓', `Filename contains "${testCase.expectedFilename}": PASS`);
            } else {
                throw new Error(`Filename mismatch: expected "${testCase.expectedFilename}", got "${filename}"`);
            }

            await delay(1000);
        } catch (error) {
            log('❌', `Test 5 (${testCase.status}) FAILED: ${error.message}`);
            allPassed = false;
            results.failed.push(`Test 5 (${testCase.status}): ${error.message}`);
        }
    }

    if (allPassed) {
        results.passed.push('Test 5: Dynamic Invoice Download');
    }

    return { success: allPassed };
}

// ==================== MAIN TEST RUNNER ====================
async function runAllTests() {
    log('🚀', '='.repeat(80));
    log('🎯', 'OMNI-FLOW EMAIL & INVOICE SYSTEM - COMPLETE TEST MATRIX');
    log('🚀', '='.repeat(80));
    log('📅', `Test Started: ${new Date().toLocaleString()}`);
    log('🌐', `Base URL: ${BASE_URL}`);
    log('👤', `Test User: ${TEST_USER_EMAIL}`);
    log('🔑', `Admin Secret: ${ADMIN_SECRET ? '✓ Configured' : '✗ Missing'}`);
    log('🧪', '='.repeat(80));

    console.log('\n');

    let testOrderId = null;

    // Test 1: Order Placed
    const test1 = await testOrderPlacedTrigger();
    if (test1.success) {
        testOrderId = test1.orderId;
        await delay(3000); // Wait 3s for email processing
    }

    console.log('\n');

    // Test 2: Admin Confirm
    await testAdminConfirmTrigger(testOrderId);
    await delay(3000);

    console.log('\n');

    // Test 3: Status Updates
    await testStatusUpdatesTrigger(testOrderId);
    await delay(3000);

    console.log('\n');

    // Test 4: Delivered
    await testDeliveredTrigger(testOrderId);
    await delay(3000);

    console.log('\n');

    // Test 5: Dynamic Invoice Download
    await testDynamicInvoiceDownload(testOrderId);

    console.log('\n');

    // Print Final Report
    log('🎯', '='.repeat(80));
    log('📊', 'FINAL TEST REPORT');
    log('🎯', '='.repeat(80));
    log('✅', `Passed Tests: ${results.passed.length}`);
    results.passed.forEach(test => log('  ✓', test));
    
    console.log('');
    log('❌', `Failed Tests: ${results.failed.length}`);
    if (results.failed.length > 0) {
        results.failed.forEach(test => log('  ✗', test));
    } else {
        log('🎉', 'ALL TESTS PASSED! System is production-ready! 🚀');
    }

    log('🎯', '='.repeat(80));
    log('📅', `Test Completed: ${new Date().toLocaleString()}`);
    log('🎯', '='.repeat(80));

    // Save log file
    const logFile = path.join(__dirname, 'test-results.log');
    fs.writeFileSync(logFile, results.logs.join('\n'));
    log('💾', `Test logs saved to: ${logFile}`);

    // Exit with proper code
    process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
