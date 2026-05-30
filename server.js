// 🔴 LOAD ENV VARIABLES FIRST
require('dotenv').config();

// NOW REQUIRE EXPRESS AND OTHER FRAMEWORKS
const express = require('express');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cartRoutes = require('./routes/cartRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const imageProxy = require('./routes/imageProxy');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const Sentry = require('@sentry/node');
const puppeteer = require('puppeteer');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const QRCode = require('qrcode');
const compression = require('compression');
const { createClient: createRedisClient } = require('./config/redis');
const { sendOrderStatus, registerTemplatePartials } = require('./mailController');
const Activity = require('./models/Activity');
const { clearCache } = require('./utils/cache');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin(origin, callback) {
            if (!origin) return callback(null, true);
            if (isTrustedOrigin(origin)) return callback(null, true);
            return callback(new Error('Socket CORS policy: Unauthorized origin'));
        },
        credentials: true,
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true
});
app.set('io', io);

app.use(express.json());
app.use(compression()); // ✅ Payload size reduced by 70%
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// UptimeRobot / platform health checks
app.get(['/', '/healthz'], (req, res) => {
    res.status(200).send('Eshopper API is up');
});

// Initialize Redis client (optional). Configure using REDIS_URL and REDIS_PASSWORD in your environment.
try {
    const redisClient = createRedisClient();
    if (redisClient) {
        app.set('redisClient', redisClient);
    }
} catch (redisInitErr) {
    console.warn('Redis init skipped:', redisInitErr && redisInitErr.message);
}

const allowedOrigins = [
    String(process.env.FRONTEND_URL || '').trim().replace(/\/$/, ''),
    'https://eshopperr.me',
    'https://www.eshopperr.me',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
].filter(Boolean);

const extraAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const isVercelPreviewOrigin = (origin = '') => /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
const isTrustedOrigin = (origin = '') => allowedOrigins.includes(origin) || extraAllowedOrigins.includes(origin) || isVercelPreviewOrigin(origin);

const corsOptions = {
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (isTrustedOrigin(origin)) return callback(null, true);
        return callback(new Error('CORS policy: Unauthorized origin'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-admin-secret', 'x-admin-role', 'x-admin-userid'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

let firebaseAdminReady = false;

try {
    let firebaseCredentials = null;
    if (process.env.FIREBASE_CONFIG_JSON) {
        firebaseCredentials = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
    } else {
        const localPath = path.join(__dirname, 'firebase-admin.json');
        if (fs.existsSync(localPath)) {
            firebaseCredentials = require('./firebase-admin.json');
        }
    }

    if (
        firebaseCredentials &&
        firebaseCredentials.project_id &&
        firebaseCredentials.private_key &&
        firebaseCredentials.client_email
    ) {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(firebaseCredentials),
                projectId: firebaseCredentials.project_id
            });
        }
        firebaseAdminReady = true;
        console.log('Firebase Admin initialized');
    } else {
        console.warn('Firebase Admin credentials missing; auth-sync route will stay disabled');
    }
} catch (firebaseInitErr) {
    console.warn('Firebase Admin init skipped:', firebaseInitErr.message);
}

const ALLOWED_ORDER_STATUS = [
    'Order Placed',
    'Ordered',
    'Confirmed',
    'Packed',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Return Initiated',
    'Return Completed',
    'Refund Initiated',
    'Refund Completed'
];

const getMembershipTypeFromOrders = (totalOrders = 0) => {
    const orders = Number(totalOrders || 0);
    if (orders >= 10) return 'Elite';
    if (orders >= 5) return 'Gold';
    return 'Silver';
};

const normalizeOrderStatus = (status = '') => {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'ordered') return 'Ordered';
    if (value === 'order placed') return 'Order Placed';
    if (value === 'confirmed') return 'Confirmed';
    if (value === 'packed') return 'Packed';
    if (value === 'shipped') return 'Shipped';
    if (value === 'out for delivery') return 'Out for Delivery';
    if (value === 'delivered') return 'Delivered';
    if (value === 'return initiated') return 'Return Initiated';
    if (value === 'return completed') return 'Return Completed';
    if (value === 'refund initiated') return 'Refund Initiated';
    if (value === 'refund completed') return 'Refund Completed';
    return null;
};

const FEATURE_EMAIL_NOTIFICATIONS = String(process.env.FEATURE_EMAIL_NOTIFICATIONS || 'true').toLowerCase() === 'true';
const FEATURE_WHATSAPP_NOTIFICATIONS = String(process.env.FEATURE_WHATSAPP_NOTIFICATIONS || 'false').toLowerCase() === 'true';
const FEATURE_INVOICE_SYSTEM = String(process.env.FEATURE_INVOICE_SYSTEM || 'true').toLowerCase() === 'true';
const DELIVERY_OTP_EXPIRY_MINUTES = Math.max(10, Number(process.env.DELIVERY_OTP_EXPIRY_MINUTES || 120));

const generateDeliveryOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const maskEmail = (email = '') => {
    const clean = String(email || '').trim();
    const parts = clean.split('@');
    if (parts.length !== 2) return clean;
    const [local, domain] = parts;
    if (local.length <= 2) return `${local.charAt(0) || '*'}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
};

const buildInvoiceHtmlLegacy = async ({
    orderId,
    userName,
    userEmail,
    paymentMethod,
    paymentStatus,
    finalAmount,
    totalAmount,
    shippingAmount,
    couponDiscount,
    discountAmount,
    gstAmount,
    giftWrapCharge,
    protectionCharge,
    ecoCharge,
    paymentFee,
    extraCharges,
    preDiscountTotal,
    shippingAddress,
    products,
    orderDate,
    orderStatus,
    pdfType,
    trackingUrl,
    statusUpdatedAt,
    deliveryProofNote,
    signedBy
}) => {
    const safeProducts = normalizeOrderProducts(products);
    const safeAddress = shippingAddress || {};
    const pdfKind = String(pdfType || 'placed').toLowerCase();
    const invoiceTitle = pdfKind === 'final' ? 'Final Tax Invoice' : (pdfKind === 'confirmation' ? 'Order Confirmation Invoice' : 'Order Placed Invoice');
    const invoiceNo = `INV-${String(orderId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-10) || '000000'}`;
    const dateLabel = new Date(orderDate || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const safeSubtotal = Number(totalAmount || 0);
    const safeShipping = Number(shippingAmount || 0);
    const safeCouponDiscount = Math.max(0, Number(couponDiscount || 0));
    const safeBaseDiscount = Math.max(0, Number(discountAmount || 0));
    const safeGst = Math.max(0, Number(gstAmount || 0));
    const safeExtraCharges = Math.max(0, Number(extraCharges || (Number(giftWrapCharge || 0) + Number(protectionCharge || 0) + Number(ecoCharge || 0) + Number(paymentFee || 0))));
    const safePreDiscount = Number(preDiscountTotal || (safeSubtotal + safeShipping + safeGst + safeExtraCharges));
    const companyAddress = process.env.COMPANY_ADDRESS || 'Eshopper Luxe, New Delhi, India';
    const companyGstin = process.env.COMPANY_GSTIN || '09XXXXXX1234X1Z5';
    const companyCin = process.env.COMPANY_CIN || 'U51909UP2020PTC123456';
    const supportEmail = SUPPORT_EMAIL_DEFAULT;
    const supportPhone = SUPPORT_PHONE_DEFAULT;
    const orderTrackingUrl = trackingUrl || `${BRAND_SITE_URL}/order-tracking/${encodeURIComponent(String(orderId || '').trim())}`;
    const paymentMethodLabel = String(paymentMethod || 'COD').toUpperCase();
    const paymentStatusLabel = String(paymentStatus || 'Pending');
    const statusStamp = formatOrderDate(statusUpdatedAt || orderDate || Date.now());
    const signatureName = signedBy || safeAddress.fullName || userName || 'Authorized Receiver';
    const proofText = deliveryProofNote || `Delivered to ${signatureName} on ${statusStamp}`;

    const summaryRows = [
        ['Subtotal', `₹${safeSubtotal.toLocaleString('en-IN')}`],
        ['Shipping', safeShipping === 0 ? 'FREE' : `₹${safeShipping.toLocaleString('en-IN')}`],
        ['GST', `₹${safeGst.toLocaleString('en-IN')}`],
        ['Extra Charges', safeExtraCharges === 0 ? '₹0' : `₹${safeExtraCharges.toLocaleString('en-IN')}`],
        ['Instant Discount', safeBaseDiscount > 0 ? `-₹${safeBaseDiscount.toLocaleString('en-IN')}` : '₹0'],
        ['Coupon Discount', safeCouponDiscount > 0 ? `-₹${safeCouponDiscount.toLocaleString('en-IN')}` : '₹0']
    ];

    let qrDataUrl = '';
    try {
        qrDataUrl = await QRCode.toDataURL(orderTrackingUrl, {
            margin: 1,
            width: 220,
            errorCorrectionLevel: 'M',
            color: { dark: '#0f172a', light: '#ffffff' }
        });
    } catch (qrErr) {
        console.warn('⚠️ QR generation failed:', qrErr.message);
    }

    const rows = safeProducts.map((p, idx) => {
        const qty = Number(p.qty || p.quantity || 1);
        const price = Number(p.price || 0);
        const lineTotal = Number(p.total || qty * price);
        const name = String(p.name || 'Product');
        const sku = String(p.productid || p._id || p.id || '').slice(0, 14);
        return `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${name}</strong><br/><span style="color:#64748b;font-size:11px;">SKU: ${sku || 'N/A'}</span></td>
                <td>${qty}</td>
                <td>₹${price.toLocaleString('en-IN')}</td>
                <td>₹${lineTotal.toLocaleString('en-IN')}</td>
            </tr>
        `;
    }).join('');

    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8" />
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #f4f7fb; }
                img { max-width: 100%; height: auto; border: 0; display: block; }
                .card { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #dbe4ef; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 50px rgba(15, 23, 42, 0.08); }
                .hero { background: linear-gradient(120deg, ${pdfKind === 'final' ? '#062f1b' : pdfKind === 'confirmation' ? '#0f2315' : '#1f2430'}, #111827); color: #fff; padding: 18px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
                .hero h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: .2px; }
                .hero p { margin: 0; color: #cbd5e1; font-size: 12px; line-height: 1.45; }
                .chip { display:inline-block;padding:5px 10px;border-radius:999px;background:${pdfKind === 'final' ? '#14532d' : pdfKind === 'confirmation' ? '#166534' : '#1d4ed8'};color:#fff;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase; margin-top: 6px; }
                .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; padding: 14px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                .meta .box { background: #fff; border: 1px solid #dbe4ef; border-radius: 12px; padding: 10px; }
                .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 4px; letter-spacing: 0.4px; }
                .val { font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.5; }
                .body { padding: 16px 18px 18px; }
                .section { margin-top: 14px; border: 1px solid #dbe4ef; border-radius: 14px; overflow: hidden; }
                .section .titlebar { padding: 12px 14px; background: linear-gradient(90deg, #0f172a, #1e293b); color: #fff; font-size: 13px; font-weight: 800; letter-spacing: .4px; text-transform: uppercase; }
                .section .content { padding: 14px; background: #fff; }
                .pill-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
                .pill { border: 1px solid #dbe4ef; border-radius: 12px; padding: 10px; background: #f8fafc; }
                .pill .k { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 4px; }
                .pill .v { font-size: 13px; font-weight: 700; color: #0f172a; }
                .legal { font-size: 11px; color: #475569; line-height: 1.6; }
                .proof { margin-top: 10px; padding: 12px; border-radius: 12px; background: linear-gradient(120deg,#f8fafc,#eef2ff); border: 1px solid #cbd5e1; }
                .proof strong { color: #0f172a; }
                .qr-wrap { display:flex; gap:14px; align-items:center; padding: 14px; border: 1px solid #dbe4ef; border-radius: 14px; background: #f8fafc; }
                .qr-box { width: 120px; min-width: 120px; height: 120px; border-radius: 12px; background: #fff; border: 1px solid #dbe4ef; display:flex; align-items:center; justify-content:center; overflow:hidden; }
                .qr-box img { width: 100%; height: 100%; object-fit: contain; }
                .qr-meta { flex:1; }
                .qr-meta .t { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
                .qr-meta .d { font-size: 12px; color: #475569; line-height: 1.55; }
                .totals { margin-top: 14px; margin-left: auto; width: 340px; border: 1px solid #dbe4ef; border-radius: 12px; padding: 10px; background: #f8fafc; }
                .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 13px; }
                .grand { display: flex; justify-content: space-between; align-items: center; font-size: 17px; font-weight: 900; color: ${pdfKind === 'final' ? '#16a34a' : pdfKind === 'confirmation' ? '#4ade80' : '#2563eb'}; border-top: 1px dashed #94a3b8; padding-top: 8px; margin-top: 8px; }
                .footer { margin-top: 14px; padding: 12px 14px 18px; border-top: 1px solid #e2e8f0; color: #475569; font-size: 11px; line-height: 1.7; }
                .footer strong { color: #0f172a; }
                .footer-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
                .footer-card { border: 1px solid #dbe4ef; border-radius: 12px; padding: 10px; background: #fff; }
                .footer-card .k { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 4px; }
                .footer-card .v { font-size: 12px; color: #0f172a; line-height: 1.5; font-weight: 600; }
                .signbox { display:flex;justify-content:space-between;align-items:flex-end;gap:12px; margin-top: 12px; }
                .signline { width: 180px; border-top: 1px solid #0f172a; margin-top: 34px; padding-top: 6px; font-size: 12px; color: #475569; }
                .disclaimer { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: #f1f5f9; border: 1px dashed #94a3b8; color: #334155; font-size: 11px; line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; }
                th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; padding: 9px 7px; letter-spacing: 0.4px; }
                td { border-bottom: 1px solid #e2e8f0; padding: 10px 7px; font-size: 13px; vertical-align: top; }
                .item-table { margin-top: 12px; }
                @media print { body { background: #fff; } .card { box-shadow: none; } }
                @media only screen and (max-width: 720px) {
                    body { padding: 10px; }
                    .hero { flex-direction: column; }
                    .meta { grid-template-columns: 1fr; }
                    .pill-grid { grid-template-columns: 1fr; }
                    .totals { width: 100%; box-sizing: border-box; }
                    .qr-wrap { flex-direction: column; align-items: flex-start; }
                    .qr-box { width: 100%; max-width: 180px; height: 180px; }
                    .footer-grid { grid-template-columns: 1fr; }
                    .signbox { flex-direction: column; align-items: flex-start; }
                    .signline { width: 100%; max-width: 220px; }
                    .body { padding: 12px; }
                }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="hero">
                    <div>
                        <h1>${invoiceTitle}</h1>
                        <p>Order ID: ${orderId || 'N/A'}</p>
                        <p>Invoice No: ${invoiceNo}</p>
                        <span class="chip">${pdfKind === 'final' ? 'Delivered' : pdfKind === 'confirmation' ? 'Confirmed' : 'Placed'}</span>
                    </div>
                    <div style="text-align:right;min-width:160px;">
                        <img src="${BRAND_LOGO_PDF_SRC}" alt="brand" style="width:130px;background:#fff;border-radius:10px;padding:4px;margin-left:auto;" />
                        <p style="margin-top:8px;">${BRAND_SITE_URL}</p>
                    </div>
                </div>
                <div class="meta">
                    <div class="box"><div class="label">Customer</div><div class="val">${userName || 'Customer'}<br/>${userEmail || '-'}</div></div>
                    <div class="box"><div class="label">Order Date</div><div class="val">${dateLabel}<br/>Status: ${orderStatus || (pdfKind === 'final' ? 'Delivered' : pdfKind === 'confirmation' ? 'Confirmed' : 'Ordered')}</div></div>
                    <div class="box"><div class="label">Payment</div><div class="val">${paymentMethodLabel}<br/>${paymentStatusLabel}</div></div>
                </div>
                <div class="body">
                    <div class="section">
                        <div class="titlebar">${pdfKind === 'placed' ? 'Proforma Summary' : pdfKind === 'confirmation' ? 'Payment Overview' : 'Legal & GST Information'}</div>
                        <div class="content">
                            <div class="pill-grid">
                                <div class="pill"><div class="k">Invoice Type</div><div class="v">${invoiceTitle}</div></div>
                                <div class="pill"><div class="k">Payment Mode</div><div class="v">${paymentMethodLabel}</div></div>
                                <div class="pill"><div class="k">Payment Status</div><div class="v">${paymentStatusLabel}</div></div>
                            </div>
                            <div style="margin-top:12px;" class="legal">
                                <strong>Billing Address</strong><br/>
                                ${safeAddress.fullName || '-'} • ${safeAddress.phone || '-'}<br/>
                                ${safeAddress.addressline1 || '-'}<br/>
                                ${safeAddress.city || '-'}, ${safeAddress.state || '-'} ${safeAddress.pin || '-'}<br/>
                                ${safeAddress.country || 'India'}
                            </div>
                        </div>
                    </div>

                    <table class="item-table">
                        <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>

                    <div class="section">
                        <div class="titlebar">${pdfKind === 'placed' ? 'Order Summary' : pdfKind === 'confirmation' ? 'Payment Breakdown' : 'Tax Breakdown'}</div>
                        <div class="content">
                            ${summaryRows.map(([label, value]) => `<div class="row"><span>${label}</span><strong>${value}</strong></div>`).join('')}
                            <div class="grand"><span>Grand Total</span><span>₹${Number(finalAmount || 0).toLocaleString('en-IN')}</span></div>
                        </div>
                    </div>

                    ${pdfKind === 'placed' ? `
                    <div class="section">
                        <div class="titlebar">Proforma Notes</div>
                        <div class="content">
                            <div class="disclaimer">This is a proforma invoice generated at order placement. It is not a tax invoice. Final GST invoice will be issued only after delivery and completion.</div>
                            <div class="proof" style="margin-top:12px;"><strong>Next Step:</strong> Your order is under processing. Use the QR or tracking link below to follow updates in real time.</div>
                        </div>
                    </div>
                    ` : ''}

                    ${pdfKind === 'confirmation' ? `
                    <div class="section">
                        <div class="titlebar">Payment Confirmation</div>
                        <div class="content">
                            <div class="disclaimer">Payment has been verified and the order is now in the fulfillment queue. Please keep this confirmation invoice for your records until delivery.</div>
                        </div>
                    </div>
                    ` : ''}

                    ${pdfKind === 'final' ? `
                    <div class="section">
                        <div class="titlebar">Final Tax Invoice & Delivery Proof</div>
                        <div class="content">
                            <div class="legal">
                                <strong>Company:</strong> ${companyAddress}<br/>
                                <strong>GSTIN:</strong> ${companyGstin}<br/>
                                <strong>CIN:</strong> ${companyCin}<br/>
                                <strong>Support:</strong> ${supportEmail} | ${supportPhone}
                            </div>
                            <div class="proof">
                                <strong>Delivery Proof:</strong> ${proofText}<br/>
                                <strong>Received By:</strong> ${signatureName}<br/>
                                <strong>Order Tracking:</strong> ${orderTrackingUrl}
                            </div>
                            <div class="signbox">
                                <div class="legal"><strong>Authorized Signature</strong><br/>This invoice is electronically generated and valid without a physical seal.</div>
                                <div class="signline">Signature / Stamp</div>
                            </div>
                            <div class="disclaimer">This final tax invoice reflects the completed delivery and should be retained for warranty, returns, tax, and compliance records.</div>
                        </div>
                    </div>
                    ` : ''}

                    <div class="section">
                        <div class="titlebar">Track & Verify</div>
                        <div class="content">
                            <div class="qr-wrap">
                                <div class="qr-box">${qrDataUrl ? `<img src="${qrDataUrl}" alt="tracking qr" />` : `<div style="padding:10px;text-align:center;font-size:12px;color:#475569;">QR unavailable<br/>${orderTrackingUrl}</div>`}</div>
                                <div class="qr-meta">
                                    <div class="t">Scan to track order</div>
                                    <div class="d">This QR opens your live order tracking page. It is included so customers can quickly verify shipment, delivery, and invoice status from any device.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <div class="footer-grid">
                            <div class="footer-card"><div class="k">Company</div><div class="v">${companyAddress}</div></div>
                            <div class="footer-card"><div class="k">Contact</div><div class="v">${supportEmail}<br/>${supportPhone}</div></div>
                            <div class="footer-card"><div class="k">Policy</div><div class="v">Returns, taxes, and billing records are governed by standard eShopper Luxe policies.</div></div>
                        </div>
                        <div style="margin-top:10px;">
                            GSTIN: ${companyGstin} | CIN: ${companyCin}
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

const generateInvoicePdfBufferLegacy = async (invoiceData) => {
    const buildFallbackPdf = (data = {}) => {
        const safeProducts = normalizeOrderProducts(data.products || []);
        const safeAddress = data.shippingAddress || {};
        const pdfKind = String(data.pdfType || 'placed').toLowerCase();
        const invoiceTitle = pdfKind === 'final' ? 'Final Tax Invoice' : (pdfKind === 'confirmation' ? 'Order Confirmation Invoice' : 'Order Placed Invoice');
        const orderDateStr = formatOrderDate(data.orderDate || Date.now());
        const subtotal = Number(data.totalAmount || 0);
        const shipping = Number(data.shippingAmount || 0);
        const gst = Math.max(0, Number(data.gstAmount || 0));
        const extraCharges = Math.max(0, Number(data.extraCharges || 0));
        const finalAmount = Number(data.finalAmount || 0);
        const companyAddress = process.env.COMPANY_ADDRESS || 'Eshopper Luxe, New Delhi, India';
        const companyGstin = process.env.COMPANY_GSTIN || '09XXXXXX1234X1Z5';
        const companyCin = process.env.COMPANY_CIN || 'U51909UP2020PTC123456';
        const supportEmail = SUPPORT_EMAIL_DEFAULT;
        const supportPhone = SUPPORT_PHONE_DEFAULT;

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(invoiceTitle, 40, 44);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Order ID: ${data.orderId || 'N/A'}`, 40, 64);
        doc.text(`Date: ${orderDateStr}`, 40, 79);
        doc.text(`Status: ${data.orderStatus || (pdfKind === 'final' ? 'Delivered' : pdfKind === 'confirmation' ? 'Confirmed' : 'Ordered')}`, 40, 94);

        doc.setFont('helvetica', 'bold');
        doc.text('Bill To', 40, 122);
        doc.setFont('helvetica', 'normal');
        doc.text(String(data.userName || 'Customer'), 40, 138);
        doc.text(String(data.userEmail || '-'), 40, 153);
        doc.text(String(safeAddress.phone || '-'), 40, 168);
        doc.text(String(safeAddress.addressline1 || '-'), 40, 183);
        doc.text(`${safeAddress.city || '-'}, ${safeAddress.state || '-'} ${safeAddress.pin || '-'}`, 40, 198);

        const rows = safeProducts.map((p) => {
            const qty = Number(p.qty || p.quantity || 1);
            const price = Number(p.price || 0);
            const lineTotal = Number(p.total || qty * price);
            return [String(p.name || 'Product'), String(qty), `INR ${price.toLocaleString('en-IN')}`, `INR ${lineTotal.toLocaleString('en-IN')}`];
        });

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                startY: 225,
                head: [['Item', 'Qty', 'Unit Price', 'Line Total']],
                body: rows.length > 0 ? rows : [['No items found', '-', '-', '-']],
                styles: { fontSize: 9, cellPadding: 6 },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }
            });
        }

        const summaryStartY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 22 : 280;
        doc.setFont('helvetica', 'normal');
        doc.text(`Subtotal: INR ${subtotal.toLocaleString('en-IN')}`, 360, summaryStartY);
        doc.text(`Shipping: INR ${shipping.toLocaleString('en-IN')}`, 360, summaryStartY + 16);
        doc.text(`GST: INR ${gst.toLocaleString('en-IN')}`, 360, summaryStartY + 32);
        doc.text(`Extra Charges: INR ${extraCharges.toLocaleString('en-IN')}`, 360, summaryStartY + 48);
        doc.setFont('helvetica', 'bold');
        doc.text(`Grand Total: INR ${finalAmount.toLocaleString('en-IN')}`, 360, summaryStartY + 68);

        if (pdfKind === 'final') {
            doc.setFont('helvetica', 'bold');
            doc.text('Company Details', 40, summaryStartY + 120);
            doc.setFont('helvetica', 'normal');
            doc.text(companyAddress, 40, summaryStartY + 136, { maxWidth: 240 });
            doc.text(`GSTIN: ${companyGstin}`, 40, summaryStartY + 156);
            doc.text(`CIN: ${companyCin}`, 40, summaryStartY + 172);
            doc.text(`Support: ${supportEmail} | ${supportPhone}`, 40, summaryStartY + 188, { maxWidth: 240 });
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Generated by eShopper Luxe billing service', 40, 810);
        return Buffer.from(doc.output('arraybuffer'));
    };

    let browser = null;
    try {
        const html = await buildInvoiceHtmlLegacy(invoiceData || {});
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote']
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1100, height: 1600 });
            await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 });
            const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' } });
            return Buffer.from(pdf);
        } catch (pageErr) {
            console.error('❌ Puppeteer page error:', pageErr.message);
            console.warn('⚠️ Falling back to jsPDF invoice renderer...');
            return buildFallbackPdf(invoiceData || {});
        } finally {
            try {
                if (browser) await browser.close();
            } catch (closeErr) {
                console.warn('⚠️ Browser close warning:', closeErr.message);
            }
        }
    } catch (err) {
        console.error('❌ Invoice PDF generation error:', err.message);
        try {
            console.warn('⚠️ Using jsPDF fallback after launch/runtime failure...');
            return buildFallbackPdf(invoiceData || {});
        } catch (fallbackErr) {
            throw new Error(`Invoice PDF failed: ${err.message}; fallback failed: ${fallbackErr.message}`);
        }
    }
    };

// 🔴 SOCKET.IO AUTH MIDDLEWARE: Copy userId from handshake.auth to socket.data.userId
io.use((socket, next) => {
    const userId = socket.handshake.auth && socket.handshake.auth.userId;
    if (userId) {
        socket.data.userId = userId;
    }
    next();
});

// 🔴 SOCKET.IO CONNECTION & ROOM SETUP
io.on('connection', (socket) => {
    const userRoom = `user:${socket.data.userId}`;
    socket.join(userRoom);
    
    // Join admin room if admin-dashboard connection
    if (socket.data.userId === 'admin-dashboard') {
        socket.join('admin:dashboard');
        console.log(`✅ Admin Dashboard connected to room admin:dashboard`);
    }
    
    socket.emit('connected', { ok: true, room: userRoom });
    console.log(`✅ User ${socket.data.userId} connected to room ${userRoom}`);

    // 🛒 CART: UPDATE QUANTITY (Real-time without loading)
    socket.on('cart:update-quantity', async (data) => {
        try {
            const { userId, productId, quantity } = data;
            if (!userId || !productId || quantity < 1) {
                socket.emit('cart:error', { message: 'Invalid request' });
                return;
            }

            const cart = await Cart.findOne({ $or: [{ userid: userId }, { user: userId }] });
            if (!cart) {
                socket.emit('cart:error', { message: 'Cart not found' });
                return;
            }

            const item = cart.items.find(i => String(i._id) === String(productId));
            if (!item) {
                socket.emit('cart:error', { message: 'Item not found in cart' });
                return;
            }

            // Check stock
            const product = await Product.findById(item.productid || item.product?._id);
            if (product && Number(quantity) > Number(product.stock || 0)) {
                socket.emit('cart:error', { message: 'Out of Stock' });
                return;
            }

            item.quantity = quantity;
            await cart.save();

            // Send updated cart immediately (no loading)
            socket.emit('cart:updated', { 
                success: true, 
                item: item,
                message: 'Quantity updated' 
            });
        } catch (e) {
            console.error('Cart update error:', e);
            socket.emit('cart:error', { message: 'Failed to update quantity' });
        }
    });

    // 🛒 CART: REMOVE ITEM (Real-time without loading)
    socket.on('cart:remove-item', async (data) => {
        try {
            const { userId, productId } = data;
            if (!userId || !productId) {
                socket.emit('cart:error', { message: 'Invalid request' });
                return;
            }

            const cart = await Cart.findOne({ $or: [{ userid: userId }, { user: userId }] });
            if (!cart) {
                socket.emit('cart:error', { message: 'Cart not found' });
                return;
            }

            const itemIndex = cart.items.findIndex(i => String(i._id) === String(productId));
            if (itemIndex === -1) {
                socket.emit('cart:error', { message: 'Item not found' });
                return;
            }

            cart.items.splice(itemIndex, 1);
            await cart.save();

            // Send removed item confirmation
            socket.emit('cart:item-removed', { 
                success: true, 
                productId: productId,
                message: 'Item removed from cart' 
            });
        } catch (e) {
            console.error('Cart remove error:', e);
            socket.emit('cart:error', { message: 'Failed to remove item' });
        }
    });

    // 🛒 CART: RECALCULATE SUMMARY (Get fresh totals)
    socket.on('cart:recalculate', async (data) => {
        try {
            const { userId } = data;
            if (!userId) {
                socket.emit('cart:error', { message: 'Invalid userId' });
                return;
            }

            const cart = await Cart.findOne({ $or: [{ userid: userId }, { user: userId }] }).populate('items.productid').populate('items.product').populate('items.productId');
            if (!cart || !cart.items.length) {
                socket.emit('cart:summary-updated', { 
                    subtotal: 0, 
                    discount: 0, 
                    shipping: 0, 
                    gst: 0 
                });
                return;
            }

            let subtotal = 0;
            let totalDiscount = 0;
            cart.items.forEach(item => {
                const price = Number(item.price || item.productid?.finalprice || 0);
                const qty = Number(item.quantity || 1);
                const itemTotal = price * qty;
                subtotal += itemTotal;

                if (item.discount) {
                    totalDiscount += item.discount * qty;
                }
            });

            const shipping = subtotal > 1000 ? 0 : 100;
            const gst = Math.round(subtotal * 0.1);

            socket.emit('cart:summary-updated', { 
                subtotal, 
                discount: totalDiscount, 
                shipping, 
                gst,
                items: cart.items
            });
        } catch (e) {
            console.error('Cart recalculate error:', e);
            socket.emit('cart:error', { message: 'Failed to recalculate' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ User ${socket.data.userId} disconnected`);
    });
});

// 1. Sabse pehle Models wale section mein Review model confirm karein
const Review = mongoose.models.Review || mongoose.model('Review', new mongoose.Schema({ 
    userId: String, 
    orderId: String, 
    rating: Number, 
    title: String, 
    comment: String, 
    products: Array, 
    pic: String,
    pics: Array,
    helpfulVotes: { type: [String], default: [] }
}, { timestamps: true }));

app.put('/api/review/:id/helpful', async (req, res) => {
    try {
        const { userId } = req.body;
        const reviewId = req.params.id.trim();
        
        console.log(`👍 Helpful vote requested for Review ID: ${reviewId} by User: ${userId}`);
        
        if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });
        
        const review = await Review.findById(reviewId);
        if (!review) {
            console.log(`❌ Review ${reviewId} not found in database`);
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        
        if (!Array.isArray(review.helpfulVotes)) {
            review.helpfulVotes = [];
        }
        
        const index = review.helpfulVotes.indexOf(userId);
        if (index === -1) {
            review.helpfulVotes.push(userId); // Add vote
            console.log(`✅ Vote added`);
        } else {
            review.helpfulVotes.splice(index, 1); // Remove vote (toggle off)
            console.log(`✅ Vote removed`);
        }
        
        await review.save();
        res.json({ success: true, helpfulVotes: review.helpfulVotes });
    } catch (error) {
        console.error('Helpful vote error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// 2. Ab ye Route likhein (Ise external routes catch-alls se pehle rakhein)
app.post('/api/review', (req, res) => {
    // Ise 'upload' middleware ke saath wrap karein kyunki frontend se image bhej rahe ho
    upload(req, res, async (err) => {
        if (err) {
            console.error("❌ Multer Error:", err.message);
            return res.status(400).json({ success: false, message: "Image upload failed" });
        }

        try {
            const { userId, orderId, rating, title, comment, products } = req.body;
            let pic = '';
            let pics = [];

            // Agar photo upload hui hai toh Cloudinary URL uthayein
            if (req.files && req.files.pic && req.files.pic[0]) {
                pic = req.files.pic[0].path;
            }
            
            // Multiple photos handling
            if (req.files && req.files.pics && req.files.pics.length > 0) {
                pics = req.files.pics.map(file => file.path);
                if (!pic) pic = pics[0]; // backward compatibility
            }

            // Products list ko array mein badlein (kyunki frontend stringify karke bhej raha hai)
            let parsedProducts = [];
            try {
                parsedProducts = products ? JSON.parse(products) : [];
            } catch (e) {
                parsedProducts = [];
            }

            const newReview = new Review({
                userId,
                orderId,
                rating: Number(rating) || 5,
                title: title || '',
                comment: comment || '',
                products: parsedProducts,
                pic: pic,
                pics: pics
            });

            await newReview.save();
            console.log("✅ Review successfully saved for Order:", orderId);
            
            return res.status(200).json({ 
                success: true, 
                message: "Review stored successfully", 
                review: newReview 
            });
        } catch (error) {
            console.error('❌ Review Save Error:', error.message);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    });
});

// 🔴 EDIT REVIEW
app.put('/api/review/:id', (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: "Image upload failed" });

        try {
            const { userId, rating, title, comment, existingPics } = req.body;
            const review = await Review.findById(req.params.id);
            
            if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
            if (String(review.userId) !== String(userId)) return res.status(403).json({ success: false, message: 'Unauthorized to edit this review' });

            let newPics = [];
            if (req.files && req.files.pics && req.files.pics.length > 0) {
                newPics = req.files.pics.map(file => file.path);
            }

            let retainedPics = [];
            if (existingPics) {
                try { retainedPics = JSON.parse(existingPics); } catch (e) { retainedPics = []; }
            }

            review.rating = Number(rating) || review.rating;
            review.title = title || review.title;
            review.comment = comment || review.comment;
            
            if (existingPics || newPics.length > 0) {
                review.pics = [...retainedPics, ...newPics].slice(0, 5); // Max 5 pics
                review.pic = review.pics[0] || '';
            }

            await review.save();
            return res.status(200).json({ success: true, message: "Review updated successfully", review });
        } catch (error) {
            console.error('Edit Review Error:', error.message);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    });
});

// 🔴 DELETE REVIEW
app.delete('/api/review/:id', async (req, res) => {
    try {
        const userId = req.body.userId || req.query.userId;
        const review = await Review.findById(req.params.id);
        
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
        if (String(review.userId) !== String(userId)) return res.status(403).json({ success: false, message: 'Unauthorized' });

        await Review.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete Review Error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// 🔴 GET REVIEWS FOR A SPECIFIC PRODUCT
app.get('/api/review/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        let objId = null;
        try {
            if (mongoose.Types.ObjectId.isValid(productId)) {
                objId = new mongoose.Types.ObjectId(productId);
            }
        } catch(e) {}

        // Hume wo saare reviews chahiye jinke 'products' array mein ye productId ho
        const reviews = await Review.find({ 
            $or: [
                { productId: productId },
                { products: productId },
                { products: { $in: [productId] } },
                ...(objId ? [
                    { productId: objId },
                    { products: objId },
                    { products: { $in: [objId] } }
                ] : [])
            ]
        }).sort({ createdAt: -1 }).lean();

        // Attach user details dynamically for a richer review display
        for (let r of reviews) {
            if (r.userId) {
                try {
                    const cleanUserId = String(r.userId).replace(/['"]/g, '');
                    const userDoc = await User.findById(cleanUserId).select('name username pic').lean();
                    
                    if (userDoc) {
                        r.userName = userDoc.name || userDoc.username || 'Verified Customer';
                        r.userPic = userDoc.pic;
                    }
                } catch (e) { 
                    console.error('⚠️ Review user fetch error:', e.message);
                }
            }
        }

        // Agar koi review nahi milta toh khali array bhejenge (404 nahi)
        res.status(200).json({ success: true, reviews });
    } catch (error) {
        console.error('❌ Fetch Reviews Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
});

// 🔴 GET ALL REVIEWS (Optional - for admin dashboard)
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
});

// 🔴 GET REVIEW BY ORDER ID
app.get('/api/reviews/order/:orderId', async (req, res) => {
    try {
        const review = await Review.findOne({ orderId: req.params.orderId }).lean();
        res.status(200).json({ success: true, review });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch order review' });
    }
});

app.use('/api', cartRoutes);
app.use('/api/admin', adminRoutes);

// Register order routes before /api/user/:id handlers so /api/user/orders does not get shadowed.
app.use(orderRoutes);

app.use('/api/user', userRoutes);
app.use('/user', userRoutes);

// Register product routes (enables /product/add and file upload endpoints)
app.use('/product', productRoutes);

// Image proxy for Cloudinary/local images (used by frontend optimize helpers)
app.use('/img', imageProxy);

// 🔒 SECURITY HEADERS
// 🔒 SECURITY HEADERS
app.use(helmet({ contentSecurityPolicy: false }));

app.post('/api/activity-log', async (req, res) => {
    try {
        const action = String(req.body?.action || '').trim();
        const userId = String(req.body?.userId || '').trim();
        const userEmail = String(req.body?.userEmail || '').trim();
        const meta = req.body?.meta && typeof req.body.meta === 'object' ? req.body.meta : {};

        if (!action) {
            return res.status(400).json({ success: false, message: 'action is required' });
        }

        const payload = {
            action,
            userEmail,
            meta,
            ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim(),
            userAgent: String(req.headers['user-agent'] || '').trim()
        };

        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            payload.userId = userId;
        }

        const activity = await Activity.create(payload);
        return res.status(201).json({
            success: true,
            id: activity?._id || null
        });
    } catch (err) {
        console.error('Activity log error:', err && err.message ? err.message : err);
        return res.status(500).json({ success: false, message: 'Failed to log activity' });
    }
});

// 🔒 RATE LIMITERS
// 🔒 RATE LIMITERS
const isLocalDevelopment = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 2000),
    standardHeaders: true,
    legacyHeaders: false,
    // In local dev + realtime UI, these endpoints can burst (React StrictMode/socket refreshes).
    skip: (req) => {
        if (isLocalDevelopment) return true;

        if (req.path.startsWith('/socket.io/') || req.method === 'OPTIONS') return true;

        return (
            req.path.startsWith('/user/') ||
            req.path === '/product' ||
            req.path.startsWith('/api/orders/') ||
            req.path.startsWith('/api/membership/check')
        );
    }
});
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { message: "Too many attempts. Try again later." }, standardHeaders: true, legacyHeaders: false });
if (!isLocalDevelopment) {
    app.use(globalLimiter);
} else {
    console.log('⚙️ Global rate limiter disabled for local development');
}


// 📊 REQUEST LOGGING MIDDLEWARE (with CORS origin info)
app.use((req, res, next) => {
    const origin = req.headers.origin || 'NO-ORIGIN';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | Origin: ${origin}`);
    next();
});

// 🛡️ GLOBAL ERROR HANDLER FOR MALFORMED REQUESTS & CORS
// 🛡️ GLOBAL ERROR HANDLER FOR MALFORMED REQUESTS & CORS
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.warn('⚠️ Malformed JSON request detected');
        return res.status(400).json({ message: 'Invalid request format. Please check your input.' });
    }
    if (err.message && err.message.includes('CORS')) {
        console.warn('⚠️ CORS error:', err.message);
        return res.status(403).json({ message: 'CORS error: Unauthorized origin' });
    }
    next(err);
});

// 🖼️ BRAND LOGO SOURCES (robust for invoice/email rendering)
const BRAND_SITE_URL = (process.env.BRAND_SITE_URL || process.env.FRONTEND_URL || 'https://eshopperr.me').trim().replace(/\/$/, '');
const BRAND_LOGO_PRIMARY_URL = process.env.BRAND_LOGO_URL || `${BRAND_SITE_URL}/logo512.png`;
const BRAND_LOGO_FALLBACK_URL = process.env.BRAND_LOGO_FALLBACK_URL || `${BRAND_SITE_URL}/logo192.png`;
const BRAND_LOGO_EMAIL_URL = process.env.BRAND_LOGO_EMAIL_URL || BRAND_LOGO_PRIMARY_URL;
const BRAND_LOGO_PDF_SRC = BRAND_LOGO_PRIMARY_URL;
const FRONTEND_PUBLIC_URL = (process.env.FRONTEND_URL || BRAND_SITE_URL).trim().replace(/\/$/, '');
const API_PUBLIC_URL = (
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    process.env.BACKEND_URL ||
    ((String(process.env.NODE_ENV || '').toLowerCase() !== 'production')
        ? `http://localhost:${process.env.PORT || 5000}`
        : BRAND_SITE_URL)
).trim().replace(/\/$/, '');
const SUPPORT_EMAIL_DEFAULT = (process.env.SUPPORT_EMAIL || process.env.BRAND_EMAIL || 'support@eshopperr.me').trim();
const SUPPORT_PHONE_DEFAULT = (process.env.SUPPORT_PHONE || process.env.BRAND_PHONE || '+91 8447859784').trim();
const INSTAGRAM_URL_DEFAULT = (
    process.env.INSTAGRAM_URL ||
    process.env.BRAND_INSTAGRAM ||
    process.env.BRAND_instagram ||
    'https://www.instagram.com/theafzal_hussain_786'
).trim();

const normalizeQuantityValue = (value, fallback = 1) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return fallback;
};

const normalizeOrderProducts = (products = []) => {
    return (Array.isArray(products) ? products : []).map((entry) => {
        const quantity = normalizeQuantityValue(
            entry?.qty ??
            entry?.quantity ??
            entry?.count ??
            entry?.orderedQty ??
            entry?.cartQuantity,
            1
        );
        const priceRaw = Number(entry?.price ?? entry?.finalprice ?? entry?.salePrice ?? 0);
        const price = Number.isFinite(priceRaw) ? priceRaw : 0;
        const totalRaw = Number(entry?.total ?? entry?.lineTotal ?? entry?.totalPrice ?? (quantity * price));
        const total = Number.isFinite(totalRaw) ? totalRaw : (quantity * price);

        return {
            ...entry,
            qty: quantity,
            quantity,
            price,
            total
        };
    });
};

const buildInvoiceHtml = async ({
    orderId,
    userName,
    userEmail,
    paymentMethod,
    paymentStatus,
    finalAmount,
    totalAmount,
    shippingAmount,
    couponDiscount,
    discountAmount,
    gstAmount,
    giftWrapCharge,
    protectionCharge,
    ecoCharge,
    paymentFee,
    extraCharges,
    preDiscountTotal,
    shippingAddress,
    products,
    orderDate,
    orderStatus,
    pdfType,
    trackingUrl,
    statusUpdatedAt,
    deliveryProofNote,
    signedBy
}) => {
    const safeProducts = normalizeOrderProducts(products);
    const safeAddress = shippingAddress || {};
    const pdfKind = String(pdfType || 'placed').toLowerCase();
    const invoiceTitle = pdfKind === 'final'
        ? 'Final Tax Invoice'
        : (pdfKind === 'confirmation'
            ? 'Order Confirmation Invoice'
            : 'Order Placed Invoice');
    const invoiceNo = `INV-${String(orderId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-10) || '000000'}`;
    const dateLabel = new Date(orderDate || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const safeSubtotal = Number(totalAmount || 0);
    const safeShipping = Number(shippingAmount || 0);
    const safeCouponDiscount = Math.max(0, Number(couponDiscount || 0));
    const safeBaseDiscount = Math.max(0, Number(discountAmount || 0));
    const safeGst = Math.max(0, Number(gstAmount || 0));
    const safeExtraCharges = Math.max(0, Number(extraCharges || (Number(giftWrapCharge || 0) + Number(protectionCharge || 0) + Number(ecoCharge || 0) + Number(paymentFee || 0))));
    const safePreDiscount = Number(preDiscountTotal || (safeSubtotal + safeShipping + safeGst + safeExtraCharges));
    const companyAddress = process.env.COMPANY_ADDRESS || 'Eshopper Luxe, New Delhi, India';
    const companyGstin = process.env.COMPANY_GSTIN || '09XXXXXX1234X1Z5';
    const companyCin = process.env.COMPANY_CIN || 'U51909UP2020PTC123456';
    const supportEmail = SUPPORT_EMAIL_DEFAULT;
    const supportPhone = SUPPORT_PHONE_DEFAULT;
    const orderTrackingUrl = trackingUrl || `${BRAND_SITE_URL}/order-tracking/${encodeURIComponent(String(orderId || '').trim())}`;
    const paymentMethodLabel = String(paymentMethod || 'COD').toUpperCase();
    const paymentStatusLabel = String(paymentStatus || 'Pending');
    const statusStamp = formatOrderDate(statusUpdatedAt || orderDate || Date.now());
    const signatureName = signedBy || safeAddress.fullName || userName || 'Authorized Receiver';
    const proofText = deliveryProofNote || `Delivered to ${signatureName} on ${statusStamp}`;
    const invoiceSummaryRows = [
        ['Subtotal', `₹${safeSubtotal.toLocaleString('en-IN')}`],
        ['Shipping', safeShipping === 0 ? 'FREE' : `₹${safeShipping.toLocaleString('en-IN')}`],
        ['GST', `₹${safeGst.toLocaleString('en-IN')}`],
        ['Extra Charges', safeExtraCharges === 0 ? '₹0' : `₹${safeExtraCharges.toLocaleString('en-IN')}`],
        ['Instant Discount', safeBaseDiscount > 0 ? `-₹${safeBaseDiscount.toLocaleString('en-IN')}` : '₹0'],
        ['Coupon Discount', safeCouponDiscount > 0 ? `-₹${safeCouponDiscount.toLocaleString('en-IN')}` : '₹0']
    ];

    let qrDataUrl = '';
    try {
        qrDataUrl = await QRCode.toDataURL(orderTrackingUrl, {
            margin: 1,
            width: 220,
            errorCorrectionLevel: 'M',
            color: { dark: '#0f172a', light: '#ffffff' }
        });
    } catch (qrErr) {
        console.warn('⚠️ QR generation failed:', qrErr.message);
    }

    const rows = safeProducts.map((p, idx) => {
        const qty = Number(p.qty || p.quantity || 1);
        const price = Number(p.price || 0);
        const lineTotal = Number(p.total || qty * price);
        const name = String(p.name || 'Product');
        const sku = String(p.productid || p._id || p.id || '').slice(0, 14);
        return `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${name}</strong><br/><span style="color:#64748b;font-size:11px;">SKU: ${sku || 'N/A'}</span></td>
                <td>${qty}</td>
                <td>₹${price.toLocaleString('en-IN')}</td>
                <td>₹${lineTotal.toLocaleString('en-IN')}</td>
            </tr>
        `;
    }).join('');

    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8" />
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #f4f7fb; }
                img { max-width: 100%; height: auto; border: 0; display: block; }
                .card { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #dbe4ef; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 50px rgba(15, 23, 42, 0.08); }
                .hero { background: linear-gradient(120deg, ${pdfKind === 'final' ? '#062f1b' : pdfKind === 'confirmation' ? '#0f2315' : '#1f2430'}, #111827); color: #fff; padding: 18px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
                .hero h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: .2px; }
                .hero p { margin: 0; color: #cbd5e1; font-size: 12px; line-height: 1.45; }
                .chip { display:inline-block;padding:5px 10px;border-radius:999px;background:${pdfKind === 'final' ? '#14532d' : pdfKind === 'confirmation' ? '#166534' : '#1d4ed8'};color:#fff;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase; margin-top: 6px; }
                .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; padding: 14px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                .meta .box { background: #fff; border: 1px solid #dbe4ef; border-radius: 12px; padding: 10px; }
                .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 4px; letter-spacing: 0.4px; }
                .val { font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.5; }
                .body { padding: 16px 18px 18px; }
                .section { margin-top: 14px; border: 1px solid #dbe4ef; border-radius: 14px; overflow: hidden; }
                .section .titlebar { padding: 12px 14px; background: linear-gradient(90deg, #0f172a, #1e293b); color: #fff; font-size: 13px; font-weight: 800; letter-spacing: .4px; text-transform: uppercase; }
                .section .content { padding: 14px; background: #fff; }
                .pill-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
                .pill { border: 1px solid #dbe4ef; border-radius: 12px; padding: 10px; background: #f8fafc; }
                .pill .k { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 4px; }
                .pill .v { font-size: 13px; font-weight: 700; color: #0f172a; }
                .legal { font-size: 11px; color: #475569; line-height: 1.6; }
                .proof { margin-top: 10px; padding: 12px; border-radius: 12px; background: linear-gradient(120deg,#f8fafc,#eef2ff); border: 1px solid #cbd5e1; }
                .proof strong { color: #0f172a; }
                .qr-wrap { display:flex; gap:14px; align-items:center; padding: 14px; border: 1px solid #dbe4ef; border-radius: 14px; background: #f8fafc; }
                .qr-box { width: 120px; min-width: 120px; height: 120px; border-radius: 12px; background: #fff; border: 1px solid #dbe4ef; display:flex; align-items:center; justify-content:center; overflow:hidden; }
                .qr-box img { width: 100%; height: 100%; object-fit: contain; }
                .qr-meta { flex:1; }
                .qr-meta .t { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
                .qr-meta .d { font-size: 12px; color: #475569; line-height: 1.55; }
                .totals { margin-top: 14px; margin-left: auto; width: 340px; border: 1px solid #dbe4ef; border-radius: 12px; padding: 10px; background: #f8fafc; }
                .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 13px; }
                .grand { display: flex; justify-content: space-between; align-items: center; font-size: 17px; font-weight: 900; color: ${pdfKind === 'final' ? '#16a34a' : pdfKind === 'confirmation' ? '#4ade80' : '#2563eb'}; border-top: 1px dashed #94a3b8; padding-top: 8px; margin-top: 8px; }
                .footer { margin-top: 14px; padding: 12px 14px 18px; border-top: 1px solid #e2e8f0; color: #475569; font-size: 11px; line-height: 1.7; }
                .footer strong { color: #0f172a; }
                .footer-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
                .footer-card { border: 1px solid #dbe4ef; border-radius: 12px; padding: 10px; background: #fff; }
                .footer-card .k { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 4px; }
                .footer-card .v { font-size: 12px; color: #0f172a; line-height: 1.5; font-weight: 600; }
                .signbox { display:flex;justify-content:space-between;align-items:flex-end;gap:12px; margin-top: 12px; }
                .signline { width: 180px; border-top: 1px solid #0f172a; margin-top: 34px; padding-top: 6px; font-size: 12px; color: #475569; }
                .disclaimer { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: #f1f5f9; border: 1px dashed #94a3b8; color: #334155; font-size: 11px; line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; }
                th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; padding: 9px 7px; letter-spacing: 0.4px; }
                td { border-bottom: 1px solid #e2e8f0; padding: 10px 7px; font-size: 13px; vertical-align: top; }
                .item-table { margin-top: 12px; }
                @media print { body { background: #fff; } .card { box-shadow: none; } }
                @media only screen and (max-width: 720px) {
                    body { padding: 10px; }
                    .hero { flex-direction: column; }
                    .meta { grid-template-columns: 1fr; }
                    .pill-grid { grid-template-columns: 1fr; }
                    .totals { width: 100%; box-sizing: border-box; }
                    .qr-wrap { flex-direction: column; align-items: flex-start; }
                    .qr-box { width: 100%; max-width: 180px; height: 180px; }
                    .footer-grid { grid-template-columns: 1fr; }
                    .signbox { flex-direction: column; align-items: flex-start; }
                    .signline { width: 100%; max-width: 220px; }
                    .body { padding: 12px; }
                }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="hero">
                    <div>
                        <h1>${invoiceTitle}</h1>
                        <p>Order ID: ${orderId || 'N/A'}</p>
                        <p>Invoice No: ${invoiceNo}</p>
                        <span class="chip">${pdfKind === 'final' ? 'Delivered' : pdfKind === 'confirmation' ? 'Confirmed' : 'Placed'}</span>
                    </div>
                    <div style="text-align:right;min-width:160px;">
                        <img src="${BRAND_LOGO_PDF_SRC}" alt="brand" style="width:130px;background:#fff;border-radius:10px;padding:4px;margin-left:auto;" />
                        <p style="margin-top:8px;">${BRAND_SITE_URL}</p>
                    </div>
                </div>
                <div class="meta">
                    <div class="box"><div class="label">Customer</div><div class="val">${userName || 'Customer'}<br/>${userEmail || '-'}</div></div>
                    <div class="box"><div class="label">Order Date</div><div class="val">${dateLabel}<br/>Status: ${orderStatus || (pdfKind === 'final' ? 'Delivered' : pdfKind === 'confirmation' ? 'Confirmed' : 'Ordered')}</div></div>
                    <div class="box"><div class="label">Payment</div><div class="val">${paymentMethodLabel}<br/>${paymentStatusLabel}</div></div>
                </div>
                <div class="body">
                    <div class="section">
                        <div class="titlebar">${pdfKind === 'placed' ? 'Proforma Summary' : pdfKind === 'confirmation' ? 'Payment Overview' : 'Legal & GST Information'}</div>
                        <div class="content">
                            <div class="pill-grid">
                                <div class="pill"><div class="k">Invoice Type</div><div class="v">${invoiceTitle}</div></div>
                                <div class="pill"><div class="k">Payment Mode</div><div class="v">${paymentMethodLabel}</div></div>
                                <div class="pill"><div class="k">Payment Status</div><div class="v">${paymentStatusLabel}</div></div>
                            </div>
                            <div style="margin-top:12px;" class="legal">
                                <strong>Billing Address</strong><br/>
                                ${safeAddress.fullName || '-'} • ${safeAddress.phone || '-'}<br/>
                                ${safeAddress.addressline1 || '-'}<br/>
                                ${safeAddress.city || '-'}, ${safeAddress.state || '-'} ${safeAddress.pin || '-'}<br/>
                                ${safeAddress.country || 'India'}
                            </div>
                        </div>
                    </div>

                    <table class="item-table">
                        <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>

                    <div class="section">
                        <div class="titlebar">${pdfKind === 'placed' ? 'Order Summary' : pdfKind === 'confirmation' ? 'Payment Breakdown' : 'Tax Breakdown'}</div>
                        <div class="content">
                            ${invoiceSummaryRows.map(([label, value]) => `<div class="row"><span>${label}</span><strong>${value}</strong></div>`).join('')}
                            <div class="grand"><span>Grand Total</span><span>₹${Number(finalAmount || 0).toLocaleString('en-IN')}</span></div>
                        </div>
                    </div>

                    ${pdfKind === 'placed' ? `
                    <div class="section">
                        <div class="titlebar">Proforma Notes</div>
                        <div class="content">
                            <div class="disclaimer">This is a proforma invoice generated at order placement. It is not a tax invoice. Final GST invoice will be issued only after delivery and completion.</div>
                            <div class="proof" style="margin-top:12px;"><strong>Next Step:</strong> Your order is under processing. Use the QR or tracking link below to follow updates in real time.</div>
                        </div>
                    </div>
                    ` : ''}

                    ${pdfKind === 'confirmation' ? `
                    <div class="section">
                        <div class="titlebar">Payment Confirmation</div>
                        <div class="content">
                            <div class="disclaimer">Payment has been verified and the order is now in the fulfillment queue. Please keep this confirmation invoice for your records until delivery.</div>
                        </div>
                    </div>
                    ` : ''}

                    ${pdfKind === 'final' ? `
                    <div class="section">
                        <div class="titlebar">Final Tax Invoice & Delivery Proof</div>
                        <div class="content">
                            <div class="legal">
                                <strong>Company:</strong> ${companyAddress}<br/>
                                <strong>GSTIN:</strong> ${companyGstin}<br/>
                                <strong>CIN:</strong> ${companyCin}<br/>
                                <strong>Support:</strong> ${supportEmail} | ${supportPhone}
                            </div>
                            <div class="proof">
                                <strong>Delivery Proof:</strong> ${proofText}<br/>
                                <strong>Received By:</strong> ${signatureName}<br/>
                                <strong>Order Tracking:</strong> ${orderTrackingUrl}
                            </div>
                            <div class="signbox">
                                <div class="legal"><strong>Authorized Signature</strong><br/>This invoice is electronically generated and valid without a physical seal.</div>
                                <div class="signline">Signature / Stamp</div>
                            </div>
                            <div class="disclaimer">This final tax invoice reflects the completed delivery and should be retained for warranty, returns, tax, and compliance records.</div>
                        </div>
                    </div>
                    ` : ''}

                    <div class="section">
                        <div class="titlebar">Track & Verify</div>
                        <div class="content">
                            <div class="qr-wrap">
                                <div class="qr-box">${qrDataUrl ? `<img src="${qrDataUrl}" alt="tracking qr" />` : `<div style="padding:10px;text-align:center;font-size:12px;color:#475569;">QR unavailable<br/>${orderTrackingUrl}</div>`}</div>
                                <div class="qr-meta">
                                    <div class="t">Scan to track order</div>
                                    <div class="d">This QR opens your live order tracking page. It is included so customers can quickly verify shipment, delivery, and invoice status from any device.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <div class="footer-grid">
                            <div class="footer-card"><div class="k">Company</div><div class="v">${companyAddress}</div></div>
                            <div class="footer-card"><div class="k">Contact</div><div class="v">${supportEmail}<br/>${supportPhone}</div></div>
                            <div class="footer-card"><div class="k">Policy</div><div class="v">Returns, taxes, and billing records are governed by standard eShopper Luxe policies.</div></div>
                        </div>
                        <div style="margin-top:10px;">
                            GSTIN: ${companyGstin} | CIN: ${companyCin}
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

const generateInvoicePdfBuffer = async (invoiceData) => {
    const buildFallbackPdf = (data = {}) => {
        const safeProducts = normalizeOrderProducts(data.products || []);
        const safeAddress = data.shippingAddress || {};
        const pdfKind = String(data.pdfType || 'placed').toLowerCase();
        const invoiceTitle = pdfKind === 'final' ? 'Final Tax Invoice' : (pdfKind === 'confirmation' ? 'Order Confirmation Invoice' : 'Order Placed Invoice');
        const orderDateStr = formatOrderDate(data.orderDate || Date.now());
        const subtotal = Number(data.totalAmount || 0);
        const shipping = Number(data.shippingAmount || 0);
        const gst = Math.max(0, Number(data.gstAmount || 0));
        const extraCharges = Math.max(0, Number(data.extraCharges || 0));
        const finalAmount = Number(data.finalAmount || 0);
        const companyAddress = process.env.COMPANY_ADDRESS || 'Eshopper Luxe, New Delhi, India';
        const companyGstin = process.env.COMPANY_GSTIN || '09XXXXXX1234X1Z5';
        const companyCin = process.env.COMPANY_CIN || 'U51909UP2020PTC123456';
        const supportEmail = SUPPORT_EMAIL_DEFAULT;
        const supportPhone = SUPPORT_PHONE_DEFAULT;

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(invoiceTitle, 40, 44);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Order ID: ${data.orderId || 'N/A'}`, 40, 64);
        doc.text(`Date: ${orderDateStr}`, 40, 79);
        doc.text(`Status: ${data.orderStatus || (pdfKind === 'final' ? 'Delivered' : pdfKind === 'confirmation' ? 'Confirmed' : 'Ordered')}`, 40, 94);

        doc.setFont('helvetica', 'bold');
        doc.text('Bill To', 40, 122);
        doc.setFont('helvetica', 'normal');
        doc.text(String(data.userName || 'Customer'), 40, 138);
        doc.text(String(data.userEmail || '-'), 40, 153);
        doc.text(String(safeAddress.phone || '-'), 40, 168);
        doc.text(String(safeAddress.addressline1 || '-'), 40, 183);
        doc.text(`${safeAddress.city || '-'}, ${safeAddress.state || '-'} ${safeAddress.pin || '-'}`, 40, 198);

        const rows = safeProducts.map((p) => {
            const qty = Number(p.qty || p.quantity || 1);
            const price = Number(p.price || 0);
            const lineTotal = Number(p.total || qty * price);
            return [String(p.name || 'Product'), String(qty), `INR ${price.toLocaleString('en-IN')}`, `INR ${lineTotal.toLocaleString('en-IN')}`];
        });

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                startY: 225,
                head: [['Item', 'Qty', 'Unit Price', 'Line Total']],
                body: rows.length > 0 ? rows : [['No items found', '-', '-', '-']],
                styles: { fontSize: 9, cellPadding: 6 },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }
            });
        }

        const summaryStartY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 22 : 280;
        doc.setFont('helvetica', 'normal');
        doc.text(`Subtotal: INR ${subtotal.toLocaleString('en-IN')}`, 360, summaryStartY);
        doc.text(`Shipping: INR ${shipping.toLocaleString('en-IN')}`, 360, summaryStartY + 16);
        doc.text(`GST: INR ${gst.toLocaleString('en-IN')}`, 360, summaryStartY + 32);
        doc.text(`Extra Charges: INR ${extraCharges.toLocaleString('en-IN')}`, 360, summaryStartY + 48);
        doc.setFont('helvetica', 'bold');
        doc.text(`Grand Total: INR ${finalAmount.toLocaleString('en-IN')}`, 360, summaryStartY + 68);

        if (pdfKind === 'final') {
            doc.setFont('helvetica', 'bold');
            doc.text('Company Details', 40, summaryStartY + 120);
            doc.setFont('helvetica', 'normal');
            doc.text(companyAddress, 40, summaryStartY + 136, { maxWidth: 240 });
            doc.text(`GSTIN: ${companyGstin}`, 40, summaryStartY + 156);
            doc.text(`CIN: ${companyCin}`, 40, summaryStartY + 172);
            doc.text(`Support: ${supportEmail} | ${supportPhone}`, 40, summaryStartY + 188, { maxWidth: 240 });
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Generated by eShopper Luxe billing service', 40, 810);
        return Buffer.from(doc.output('arraybuffer'));
    };

    let browser = null;
    try {
        const html = await buildInvoiceHtml(invoiceData || {});
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote']
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1100, height: 1600 });
            await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 });
            const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' } });
            return Buffer.from(pdf);
        } catch (pageErr) {
            console.error('❌ Puppeteer page error:', pageErr.message);
            console.warn('⚠️ Falling back to jsPDF invoice renderer...');
            return buildFallbackPdf(invoiceData || {});
        } finally {
            try {
                if (browser) await browser.close();
            } catch (closeErr) {
                console.warn('⚠️ Browser close warning:', closeErr.message);
            }
        }
    } catch (err) {
        console.error('❌ Invoice PDF generation error:', err.message);
        try {
            console.warn('⚠️ Using jsPDF fallback after launch/runtime failure...');
            return buildFallbackPdf(invoiceData || {});
        } catch (fallbackErr) {
            throw new Error(`Invoice PDF failed: ${err.message}; fallback failed: ${fallbackErr.message}`);
        }
    }
};

const buildOrderEmailHtml = ({
    userName,
    orderId,
    finalAmount,
    paymentMethod,
    estimatedArrival,
    products = []
}) => {
    const shortItems = normalizeOrderProducts(products).slice(0, 5);
    const listHtml = shortItems.map((p) => {
        const qty = Number(p.qty || p.quantity || 1);
        const price = Number(p.price || 0);
        return `<li style="margin-bottom:6px;"><strong>${p.name || 'Product'}</strong> • Qty ${qty} • ₹${price.toLocaleString('en-IN')}</li>`;
    }).join('');
    const eta = estimatedArrival ? new Date(estimatedArrival).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';

    return `
        <div style="font-family:Arial,sans-serif;background:#f5f8fc;padding:20px;color:#0f172a;">
            <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #dbe4ef;border-radius:14px;overflow:hidden;">
                <div style="padding:18px;background:linear-gradient(120deg,#0f172a,#1e293b);color:#fff;">
                    <img src="${BRAND_LOGO_EMAIL_URL}" alt="brand" style="width:130px;background:#fff;border-radius:8px;padding:4px;display:block;margin-bottom:8px;" />
                    <div style="font-size:20px;font-weight:800;">Order Update • ${orderId}</div>
                    <div style="font-size:13px;color:#cbd5e1;">Thank you ${userName || 'Customer'}, your premium order is being processed.</div>
                </div>
                <div style="padding:18px;">
                    <p style="margin:0 0 8px;">Amount Paid: <strong>₹${Number(finalAmount || 0).toLocaleString('en-IN')}</strong></p>
                    <p style="margin:0 0 8px;">Payment Method: <strong>${paymentMethod || 'COD'}</strong></p>
                    <p style="margin:0 0 14px;">Estimated Delivery: <strong>${eta}</strong></p>
                    <div style="font-weight:700;margin-bottom:8px;">Ordered Items:</div>
                    <ul style="padding-left:18px;margin-top:0;">${listHtml || '<li>Items will appear shortly.</li>'}</ul>
                    <a href="${getTrackingLink(orderId)}" style="display:inline-block;margin-top:8px;padding:10px 14px;border-radius:999px;background:linear-gradient(90deg,#0ea5b7,#0284c7);color:#fff;text-decoration:none;font-weight:700;">Track Order</a>
                </div>
            </div>
        </div>
    `;
};

const formatOrderDate = (value) => {
    const dt = new Date(value || Date.now());
    if (Number.isNaN(dt.getTime())) {
        return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAddressForEmail = (shippingAddress = {}) => {
    const parts = [
        shippingAddress?.addressline1,
        shippingAddress?.city,
        shippingAddress?.state,
        shippingAddress?.pin,
        shippingAddress?.country || 'India'
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
};

const mapProductsForEmailTemplate = (products = []) => {
    return normalizeOrderProducts(products).map((p) => {
        const qty = normalizeQuantityValue(p.qty || p.quantity, 1);
        const unitPrice = Number(p.price || p.finalprice || 0);
        const subtotal = Number(p.total || qty * unitPrice);
        const imageUrl =
            p.imageUrl ||
            p.pic ||
            p.pic1 ||
            p.product?.pic1 ||
            `${BRAND_SITE_URL}/assets/images/noimage.png`;
        return {
            imageUrl,
            name: p.name || p.product?.name || 'Product',
            size: p.size || p.product?.size || 'N/A',
            color: p.color || p.product?.color || 'N/A',
            quantity: qty,
            qty,
            price: unitPrice,
            subtotal
        };
    });
};

const DELIVERY_PROGRESS_STEP_META = [
    { label: 'Placed', icon: '&#9679;' },
    { label: 'Confirmed', icon: '&#10003;' },
    { label: 'Packed', icon: '&#9632;' },
    { label: 'Shipped', icon: '&#10148;' },
    { label: 'Delivered', icon: '&#10003;' }
];

const resolveProgressStage = (statusValue = '') => {
    const statusText = String(statusValue || '').trim().toLowerCase();
    if (!statusText) return 1;
    if (statusText.includes('delivered')) return 5;
    if (statusText.includes('out for delivery')) return 4;
    if (statusText.includes('shipped')) return 4;
    if (statusText.includes('packed')) return 3;
    if (statusText.includes('confirmed')) return 2;
    if (statusText.includes('cancel') || statusText.includes('fail')) return 1;
    if (
        statusText.includes('ordered') ||
        statusText.includes('order placed') ||
        statusText.includes('order received') ||
        statusText.includes('placed') ||
        statusText.includes('received')
    ) {
        return 1;
    }
    return 1;
};

const buildDeliveryProgress = (statusValue = '') => {
    const stage = resolveProgressStage(statusValue);
    const percentByStage = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };
    const steps = DELIVERY_PROGRESS_STEP_META.map((step, idx) => {
        const stepNo = idx + 1;
        const state = stepNo < stage ? 'done' : (stepNo === stage ? 'active' : 'pending');
        return {
            label: step.label.toUpperCase(),
            icon: state === 'done' ? '&#10003;' : step.icon,
            state
        };
    });

    return {
        stage,
        percent: percentByStage[stage] || 20,
        steps
    };
};

const buildInvoiceUrl = (orderId, userId, type = 'placed') => {
    const safeOrderId = encodeURIComponent(String(orderId || '').trim());
    const safeUserId = encodeURIComponent(String(userId || '').trim());
    const safeType = encodeURIComponent(String(type || 'placed').trim().toLowerCase());
    return `${API_PUBLIC_URL}/api/order/${safeOrderId}/invoice?userId=${safeUserId}&type=${safeType}&disposition=inline`;
};

const buildTemplatePayload = (status, payload = {}) => {
    const normStatus = String(status || payload.status || '').trim();
    const products = mapProductsForEmailTemplate(payload.products || []);
    const totalItems = products.reduce((acc, p) => acc + Number(p.quantity || 1), 0);
    const shippingAddress = payload.shippingAddress || {};
    const customerName = payload.customerName || payload.userName || shippingAddress.fullName || 'Customer';
    const userId = String(payload.userId || payload.userid || '').trim();
    const orderId = payload.orderId || 'ESHOPPER';
    const trackingUrl = payload.trackingUrl || getTrackingLink(orderId);
    const expectedArrivalDate = payload.estimatedDelivery || payload.estimatedArrival || new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    const expectedArrival = formatOrderDate(expectedArrivalDate);
    const referralCode = payload.referralCode || `LUXE${String(orderId).slice(-4)}`;
    const myOrdersUrl = payload.myOrdersUrl || `${FRONTEND_PUBLIC_URL}/my-orders`;
    const helpCenterUrl = payload.helpCenterUrl || `${FRONTEND_PUBLIC_URL}/contact`;
    const shopUrl = payload.shopUrl || `${FRONTEND_PUBLIC_URL}/shop`;
    const deliveryProgress = buildDeliveryProgress(normStatus || payload.orderStatus || payload.status);
    const statusTimestamp = payload.statusUpdatedAt || payload.updatedAt || payload.deliveryOtpVerifiedAt || payload.orderDate || Date.now();

    const invoiceType = (() => {
        const statusText = String(normStatus || payload.orderStatus || payload.status || '').toLowerCase();
        if (statusText.includes('delivered')) return 'final';
        if (statusText.includes('confirmed')) return 'confirmation';
        return 'placed';
    })();

    const invoiceUrl = payload.invoiceDownloadUrl || payload.taxInvoiceUrl || (userId ? buildInvoiceUrl(orderId, userId, invoiceType) : myOrdersUrl);
    const finalInvoiceUrl = payload.finalInvoiceUrl || (userId ? buildInvoiceUrl(orderId, userId, 'final') : myOrdersUrl);
    const confirmationInvoiceUrl = payload.confirmationInvoiceUrl || (userId ? buildInvoiceUrl(orderId, userId, 'confirmation') : myOrdersUrl);
    const placedInvoiceUrl = payload.placedInvoiceUrl || (userId ? buildInvoiceUrl(orderId, userId, 'placed') : myOrdersUrl);

    const shippingAddressLine1 = [
        shippingAddress.addressline1,
        shippingAddress.addressline2
    ].filter(Boolean).join(', ') || shippingAddress.addressline1 || '-';

    const shippingAddressLine2 = [
        shippingAddress.landmark,
        shippingAddress.area,
        shippingAddress.city
    ].filter(Boolean).join(', ') || shippingAddress.city || '-';

    const shippingAddressLine3 = [
        shippingAddress.state,
        shippingAddress.pin,
        shippingAddress.country || 'India'
    ].filter(Boolean).join(', ');

    return {
        status: normStatus,
        toEmail: payload.toEmail,
        logoUrl: BRAND_LOGO_EMAIL_URL,
        orderId,
        orderDate: formatOrderDate(payload.orderDate || payload.createdAt || Date.now()),
        customerName,
        customerEmail: payload.toEmail || payload.userEmail || '',
        items: products,
        subtotal: Number(payload.totalAmount || 0),
        shippingCharges: Number(payload.shippingAmount || 0),
        gst: Math.max(0, Math.round(Number(payload.totalAmount || 0) * 0.05)),
        totalAmount: Number(payload.totalAmount || 0),
        totalPaid: Number(payload.finalAmount || payload.totalAmount || 0),
        finalAmount: Number(payload.finalAmount || payload.totalAmount || 0),
        shippingName: shippingAddress.fullName || customerName,
        shippingAddress: formatAddressForEmail(shippingAddress),
        shippingAddressLine1,
        shippingAddressLine2,
        shippingAddressLine3,
        shippingPhone: shippingAddress.phone || payload.userPhone || '-',
        paymentMethod: payload.paymentMethod || 'COD',
        transactionId: payload.transactionId || orderId,
        paymentStatus: payload.paymentStatus || 'Pending',
        expectedArrival,
        companyAddress: process.env.COMPANY_ADDRESS || 'Eshopper Boutique Luxe, New Delhi, India',
        whatsappUrl: process.env.WHATSAPP_SUPPORT_URL || 'https://wa.me/919999999999',
        supportEmail: SUPPORT_EMAIL_DEFAULT,
        totalItems,
        packedOn: formatOrderDate(statusTimestamp),
        packageWeight: payload.packageWeight || `${Math.max(0.3, (totalItems * 0.25)).toFixed(1)} kg`,
        trackingUrl,
        courierPartner: payload.courierPartner || payload.deliveryPartner || 'Eshopper Express',
        trackingNumber: payload.trackingNumber || orderId,
        shippedOn: formatOrderDate(statusTimestamp),
        expectedDelivery: expectedArrival,
        liveTrackingUrl: trackingUrl,
        carrierWebsiteUrl: process.env.CARRIER_WEBSITE_URL || trackingUrl,
        deliveryDate: formatOrderDate(statusTimestamp),
        deliveryTimeSlot: payload.deliverySchedule?.time || payload.deliverySlot || 'By 9:00 PM',
        otp: payload.deliveryOtp || '',
        deliveryAgent: payload.deliveryAgent || 'Assigned Rider',
        agentContact: payload.agentContact || shippingAddress.phone || '-',
        deliveryLocation: `${shippingAddress.city || ''}${shippingAddress.state ? ', ' + shippingAddress.state : ''}` || 'Your Address',
        deliveredOn: formatOrderDate(statusTimestamp),
        receivedBy: payload.receivedBy || shippingAddress.fullName || customerName,
        taxInvoiceUrl: finalInvoiceUrl,
        placedInvoiceUrl,
        confirmationInvoiceUrl,
        finalInvoiceUrl,
        reviewUrl: payload.reviewUrl || `${BRAND_SITE_URL}/my-orders`,
        referralCode,
        referralShareUrl: payload.referralShareUrl || `${BRAND_SITE_URL}/signup?ref=${encodeURIComponent(referralCode)}`,
        instagramUrl: INSTAGRAM_URL_DEFAULT,
        brandSiteUrl: FRONTEND_PUBLIC_URL,
        privacyPolicyUrl: payload.privacyPolicyUrl || `${FRONTEND_PUBLIC_URL}/privacy-policy`,
        termsUrl: payload.termsUrl || `${FRONTEND_PUBLIC_URL}/terms`,
        returnPolicyUrl: payload.returnPolicyUrl || `${FRONTEND_PUBLIC_URL}/return-policy`,
        unsubscribeUrl: payload.unsubscribeUrl || `${FRONTEND_PUBLIC_URL}/contact`,
        myOrdersUrl,
        helpCenterUrl,
        shopUrl,
        supportPhone: SUPPORT_PHONE_DEFAULT,
        supportWhatsAppLabel: process.env.SUPPORT_WHATSAPP_LABEL || 'Chat on WhatsApp',
        companyGstin: process.env.COMPANY_GSTIN || '09XXXXXX1234X1Z5',
        companyCin: process.env.COMPANY_CIN || 'U51909UP2020PTC123456',
        invoiceDownloadUrl: invoiceUrl,
        progressSteps: deliveryProgress.steps,
        progressPercent: deliveryProgress.percent,
        progressStage: deliveryProgress.stage
    };
};

const renderTemplateEmailHtml = async (status, payload = {}) => {
    const prepared = buildTemplatePayload(status, payload);
    try {
        return await sendOrderStatus(prepared);
    } catch (templateErr) {
        console.warn(`⚠️ Template render failed for status ${status}:`, templateErr.message);
        return buildOrderEmailHtml({
            userName: prepared.customerName,
            orderId: prepared.orderId,
            finalAmount: prepared.finalAmount,
            paymentMethod: prepared.paymentMethod,
            estimatedArrival: prepared.expectedArrival,
            products: prepared.items
        });
    }
};

const sendOrderPlacedEmail = async (payload = {}) => {
    const toEmail = String(payload.toEmail || '').trim();
    if (!toEmail) return { skipped: true, reason: 'missing-email' };
    const subject = `Order Received - ${payload.orderId || 'ESHOPPER'} | eShopper Luxe`;
    const html = await renderTemplateEmailHtml('Order Placed', payload);
    const attachments = [];
    if (payload.invoiceBase64) {
        attachments.push({
            filename: `TaxInvoice-${payload.orderId || 'order'}.pdf`,
            content: payload.invoiceBase64,
            contentType: 'application/pdf'
        });
    }
    return sendTransactionalEmail({ toEmail, toName: payload.userName, subject, htmlContent: html, attachments });
};

const sendOrderConfirmationEmail = async (payload = {}) => {
    const toEmail = String(payload.toEmail || '').trim();
    if (!toEmail) return { skipped: true, reason: 'missing-email' };
    const subject = `Order Confirmed - ${payload.orderId || 'ESHOPPER'} | eShopper Luxe`;
    const html = await renderTemplateEmailHtml('Confirmed', payload);
    const attachments = [];
    if (payload.invoiceBase64) {
        attachments.push({
            filename: `TaxInvoice-${payload.orderId || 'order'}.pdf`,
            content: payload.invoiceBase64,
            contentType: 'application/pdf'
        });
    }
    return sendTransactionalEmail({ toEmail, toName: payload.userName, subject, htmlContent: html, attachments });
};

const sendOrderStatusEmail = async (payload = {}) => {
    const toEmail = String(payload.toEmail || '').trim();
    if (!toEmail) return { skipped: true, reason: 'missing-email' };
    const statusText = String(payload.status || 'Update').trim();
    const statusLower = statusText.toLowerCase();
    const subject = statusLower === 'packed'
        ? `Order Packed with Care - ${payload.orderId || 'ESHOPPER'} | eShopper Luxe`
        : statusLower === 'shipped'
            ? `Order Shipped - Track Your Package | ${payload.orderId || 'ESHOPPER'}`
            : statusLower === 'out for delivery'
                ? `Arriving Today - ${payload.orderId || 'ESHOPPER'} | eShopper Luxe`
                : statusLower === 'delivered'
                    ? `Delivered Successfully - ${payload.orderId || 'ESHOPPER'} | Rate Your Experience`
                    : `Order ${statusText || 'Update'} • ${payload.orderId || 'ESHOPPER'}`;
    const html = await renderTemplateEmailHtml(payload.status || 'Update', {
        ...payload,
        estimatedArrival: payload.estimatedDelivery || payload.estimatedArrival
    });
    const attachments = [];
    if (payload.invoiceBase64) {
        attachments.push({
            filename: `TaxInvoice-${payload.orderId || 'order'}.pdf`,
            content: payload.invoiceBase64,
            contentType: 'application/pdf'
        });
    }
    return sendTransactionalEmail({ toEmail, toName: payload.customerName || payload.userName, subject, htmlContent: html, attachments });
};

// 🔧 DATABASE CONNECTION SETUP
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("❌ CRITICAL: Missing MONGODB_URI in environment variables");
    console.error("   Please set MONGODB_URI in your Render environment");
    process.exit(1);
}

console.log("🔍 Attempting MongoDB connection...");

// 🔧 CLOUDINARY CONFIGURATION SETUP
const CLOUDINARY_CLOUD_NAME = process.env.CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUD_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUD_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("❌ CRITICAL: Missing Cloudinary credentials in environment variables");
    console.error("   Please set CLOUD_NAME, CLOUD_API_KEY, and CLOUD_API_SECRET in Render");
    process.exit(1);
}

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
});

console.log("✅ Cloudinary configured successfully");
console.log(`📸 Cloud Name: ${CLOUDINARY_CLOUD_NAME}`);

// 📝 HELPER FUNCTION TO RETURN CLOUDINARY URLS (for GET requests)
const sanitizeCloudinaryUrl = (url) => {
    if (!url) return null;
    // If it's already a Cloudinary URL, return as-is (already uploaded)
    if (url.includes('res.cloudinary.com')) {
        return url;
    }
    // Path format from multer-storage-cloudinary, return as-is
    return url;
};

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'eshoper_master',
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
        resource_type: 'auto'
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`));
        }
    }
}).fields([
    { name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 },
    { name: 'pic2', maxCount: 1 }, { name: 'pic3', maxCount: 1 },
    { name: 'pic4', maxCount: 1 },
    { name: 'pics', maxCount: 5 }
]);

// 📧 BREVO EMAIL SERVICE - Production Final Fix
const sendMail = async (to, otp) => {
    try {
        const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
        if (!BREVO_KEY) throw new Error("❌ BREVO_API_KEY Missing");
        const localPart = (to || '').split('@')[0] || 'Customer';
        const recipientName = localPart
            .replace(/[._-]+/g, ' ')
            .replace(/\d+/g, ' ')
            .trim()
            .split(' ')
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ') || 'Customer';

        let otpHtml = '';
        try {
            registerTemplatePartials();
            const templatePath = path.join(__dirname, 'views', 'emails', 'otp-email.hbs');
            const source = fs.readFileSync(templatePath, 'utf8');
            const template = handlebars.compile(source);
            otpHtml = template({
                userName: recipientName,
                otp: String(otp || ''),
                supportEmail: SUPPORT_EMAIL_DEFAULT,
                supportPhone: SUPPORT_PHONE_DEFAULT,
                websiteUrl: FRONTEND_PUBLIC_URL,
                companyAddress: process.env.COMPANY_ADDRESS || 'Eshopper Boutique Luxe, New Delhi, India'
            });
        } catch (templateErr) {
            console.warn('⚠️ OTP template render failed, using fallback HTML:', templateErr.message);
            otpHtml = `
                <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;padding:24px;color:#1f2937;">
                    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                        <div style="padding:22px 28px;background:linear-gradient(135deg,#111827,#1a2332,#8b7521);color:#ffffff;">
                            <div style="font-size:20px;font-weight:700;letter-spacing:0.3px;">EShoppper Security</div>
                            <div style="font-size:13px;opacity:0.9;margin-top:4px;color:#d4af37;font-weight:600;">Secure Account Verification</div>
                        </div>
                        <div style="padding:28px;">
                            <p style="margin:0 0 14px 0;font-size:15px;">Hi ${recipientName},</p>
                            <p style="margin:0 0 18px 0;font-size:15px;color:#4b5563;">Use this one-time verification code to continue securely:</p>
                            <div style="text-align:center;margin:18px 0 20px 0;">
                                <span style="display:inline-block;background:#f9fafb;border:1px solid #d1d5db;border-radius:10px;padding:14px 24px;font-size:34px;letter-spacing:8px;font-weight:700;color:#0f766e;">${otp}</span>
                            </div>
                            <p style="margin:0 0 8px 0;font-size:14px;color:#4b5563;">This code is valid for 10 minutes.</p>
                            <p style="margin:0;font-size:14px;color:#4b5563;">If you did not request this, please ignore this email and secure your account.</p>
                        </div>
                    </div>
                </div>`;
        }

        const data = {
            sender: { name: "eShopper Security", email: "support@eshopperr.me" },
            to: [{ email: to }],
            subject: `eShopper Security Code: ${otp}`,
            textContent: `Hi ${recipientName},\n\nYour eShopper one-time verification code is: ${otp}\nCode validity: 10 minutes.\n\nFor security, never share this code. If you did not request it, ignore this email and secure your account immediately.\n\neShopper Security Team\nsupport@eshopperr.me`,
            htmlContent: otpHtml,
            replyTo: { email: "support@eshopperr.me" }
        };

        const config = {
            headers: { 'api-key': BREVO_KEY, 'content-type': 'application/json', 'accept': 'application/json' }
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, config);
        console.log(`✅ SUCCESS! Mail sent to: ${to}. ID: ${response.data.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ BREVO CRITICAL ERROR:", error.response ? error.response.data : error.message);
        throw error;
    }
};

const SMTP_HOST = process.env.SMTP_HOST ? process.env.SMTP_HOST.trim() : '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
const SMTP_PASS = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : '';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL ? process.env.SMTP_FROM_EMAIL.trim() : 'support@eshopperr.me';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME ? process.env.SMTP_FROM_NAME.trim() : 'eShopper Boutique Luxe';
const SMTP_ENABLED = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let smtpTransporter = null;
if (SMTP_ENABLED) {
    smtpTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    console.log(`✅ SMTP configured (${SMTP_HOST}:${SMTP_PORT})`);
} else if (process.env.BREVO_API_KEY) {
    console.log('✅ Connected successfully to Brevo API for transactional emails');
} else {
    console.log('⚠️ No email provider configured (SMTP or BREVO)');
}

const normalizeAttachmentsForBrevo = (attachments = []) => {
    if (!Array.isArray(attachments) || attachments.length === 0) return [];
    return attachments
        .filter(Boolean)
        .map((item) => {
            const name = item.filename || item.name || 'attachment.pdf';
            let content = item.content || item.contentBase64 || '';
            if (Buffer.isBuffer(content)) {
                content = content.toString('base64');
            }
            return { name, content: String(content || '') };
        })
        .filter((item) => item.content.length > 0);
};

const sendTransactionalEmail = async ({ toEmail, toName, subject, htmlContent, textContent = '', attachments = [] }) => {
    if (!toEmail || !String(toEmail).includes('@')) {
        throw new Error('Invalid recipient email');
    }

    if (smtpTransporter) {
        const smtpAttachments = (attachments || []).map((item) => {
            const filename = item.filename || item.name || 'attachment.pdf';
            const contentType = item.contentType || undefined;
            let content = item.content || item.contentBase64 || '';
            if (typeof content === 'string' && /^[A-Za-z0-9+/=]+$/.test(content) && !content.includes('<html')) {
                content = Buffer.from(content, 'base64');
            }
            return { filename, content, contentType };
        });

        await smtpTransporter.sendMail({
            from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
            to: toName ? `"${toName}" <${toEmail}>` : toEmail,
            subject,
            html: htmlContent,
            text: textContent || undefined,
            replyTo: 'support@eshopperr.me',
            attachments: smtpAttachments
        });
        return { provider: 'nodemailer' };
    }

    const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
    if (!BREVO_KEY) {
        throw new Error('No email provider configured (SMTP or BREVO_API_KEY)');
    }

    const payload = {
        sender: { name: SMTP_FROM_NAME, email: SMTP_FROM_EMAIL },
        to: [{ email: toEmail, name: toName || 'Customer' }],
        subject,
        htmlContent,
        replyTo: { email: 'support@eshopperr.me' }
    };

    if (textContent) payload.textContent = textContent;
    const brevoAttachments = normalizeAttachmentsForBrevo(attachments);
    if (brevoAttachments.length > 0) payload.attachment = brevoAttachments;

    await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
            'api-key': BREVO_KEY,
            'content-type': 'application/json',
            'accept': 'application/json'
        },
        timeout: 30000
    });
    return { provider: 'brevo' };
};

const renderEmailTemplateByFile = (fileName, payload = {}) => {
    registerTemplatePartials();
    const templatePath = path.join(__dirname, 'views', 'emails', fileName);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template not found: ${fileName}`);
    }
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template(payload || {});
};

const sendAdminAlert = async ({ title, details, category = 'system', data = {} }) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'support@eshopperr.me';
    if (!adminEmail || !adminEmail.includes('@')) return;

    const safeTitle = title || 'System Alert';
    const safeDetails = details || 'No details provided';
    const now = new Date().toLocaleString('en-IN');
    let html = `
        <div style="font-family:'Trebuchet MS','Segoe UI',Arial,sans-serif;background:#0f172a;color:#e2e8f0;border:1px solid #334155;padding:18px;border-radius:12px;max-width:660px;margin:0 auto;">
            <h3 style="margin:0 0 10px 0;color:#fbbf24;font-size:20px;">${safeTitle}</h3>
            <p style="margin:0 0 10px 0;color:#cbd5e1;line-height:1.65;">${safeDetails}</p>
            <p style="margin:0;color:#94a3b8;font-size:12px;">Time: ${now}</p>
        </div>
    `;

    if (category === 'product-updated') {
        try {
            html = renderEmailTemplateByFile('product-updated.hbs', {
                productName: data.productName || 'Unnamed Product',
                productId: data.productId || 'N/A',
                maincategory: data.maincategory || 'N/A',
                subcategory: data.subcategory || 'N/A',
                brand: data.brand || 'N/A',
                stock: data.stock || 'N/A',
                finalprice: data.finalprice || '0',
                discount: data.discount || '0',
                description: data.description || 'No description provided.',
                imageUrl: data.imageUrl || '',
                updatedAt: data.updatedAt || now,
                adminProductUrl: data.adminProductUrl || `${FRONTEND_PUBLIC_URL}/admin/product`,
                storeUrl: data.storeUrl || FRONTEND_PUBLIC_URL,
                companyAddress: process.env.BRAND_ADDRESS || 'Eshopper Boutique Luxe, New Delhi, India'
            });
        } catch (templateErr) {
            console.warn('⚠️ Product-updated template render failed, using fallback admin alert:', templateErr.message);
        }
    }

    try {
        await sendTransactionalEmail({
            toEmail: adminEmail,
            toName: 'Admin',
            subject: `${safeTitle}`,
            htmlContent: html,
            textContent: `${safeTitle}\n${safeDetails}`
        });
    } catch (alertErr) {
        console.error('⚠️ Admin alert send failed:', alertErr.message);
    }
};

const EMAIL_QUEUE_ENABLED = String(process.env.EMAIL_QUEUE_ENABLED || 'true').toLowerCase() !== 'false';
const memoryEmailQueue = [];
let memoryQueueRunning = false;

let bullEmailQueue = null;
let bullQueueMode = false;

const executeEmailJob = async (jobType, payload) => {
    if (!FEATURE_EMAIL_NOTIFICATIONS) {
        return { skipped: true, reason: 'email-notifications-disabled' };
    }
    if (jobType === 'order-placed') return sendOrderPlacedEmail(payload);
    if (jobType === 'order-confirmed') return sendOrderConfirmationEmail(payload);
    if (jobType === 'order-status') return sendOrderStatusEmail(payload);
    throw new Error(`Unknown email job type: ${jobType}`);
};

bullQueueMode = false;

const processMemoryEmailQueue = async () => {
    if (memoryQueueRunning) return;
    memoryQueueRunning = true;
    while (memoryEmailQueue.length > 0) {
        const job = memoryEmailQueue.shift();
        try {
            await executeEmailJob(job.jobType, job.payload);
        } catch (queueErr) {
            console.error(`⚠️ Email queue job failed (${job.jobType}):`, queueErr.message);
            if (process.env.SENTRY_DSN && Sentry) Sentry.captureException(queueErr);
        }
    }
    memoryQueueRunning = false;
};

const enqueueEmailJob = async (jobType, payload) => {
    if (!FEATURE_EMAIL_NOTIFICATIONS) {
        return { skipped: true, reason: 'email-notifications-disabled' };
    }
    if (!EMAIL_QUEUE_ENABLED) {
        return executeEmailJob(jobType, payload);
    }

    if (bullQueueMode && bullEmailQueue) {
        await bullEmailQueue.add(jobType, payload || {}, {
            removeOnComplete: 100,
            removeOnFail: 200,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
        });
        return true;
    }

    memoryEmailQueue.push({ jobType, payload });
    setImmediate(processMemoryEmailQueue);
    return true;
};


const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

const OTPRecord = mongoose.models.OTPRecord || mongoose.model('OTPRecord', new mongoose.Schema({ email: String, otp: String, createdAt: { type: Date, expires: 600, default: Date.now } }));
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    name: String,
    username: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    phone: String,
    password: { type: String },
    uid: { type: String, unique: true, sparse: true, index: true }, // Firebase UID
    provider: { type: String, enum: ['email', 'google', 'phone'], default: 'email' }, // Auth provider
    role: { type: String, default: "User" },
    pic: String,
    addressline1: String,
    city: String,
    state: String,
    pin: String,
    addresses: [{
        type: { type: String, default: 'Home' },
        fullName: String,
        phone: String,
        addressline1: String,
        city: String,
        state: String,
        pin: String,
        country: { type: String, default: 'India' }
    }],
    otp: String,
    otpExpires: Date,
    lastLogin: { type: Date, default: Date.now }, // Track last login
    failedAttempts: { type: Number, default: 0 },
    lockUntil: Date
}, opts));
const Product = require('./models/Product');
const Maincategory = mongoose.models.Maincategory || mongoose.model('Maincategory', new mongoose.Schema({ name: String }, opts));
const Subcategory = mongoose.models.Subcategory || mongoose.model('Subcategory', new mongoose.Schema({ name: String }, opts));
const Brand = mongoose.models.Brand || mongoose.model('Brand', new mongoose.Schema({ name: String }, opts));
const Cart = require('./models/Cart');
const Coupon = require('./models/Coupon');
const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, pic: String }, opts));
const Checkout = mongoose.models.Checkout || mongoose.model('Checkout', new mongoose.Schema({ userid: String, paymentmode: String, orderstatus: { type: String, default: "Order Placed" }, paymentstatus: { type: String, default: "Pending" }, paidAt: { type: Date, default: null }, razorpayOrderId: { type: String, default: '' }, razorpayPaymentId: { type: String, default: '' }, razorpaySignature: { type: String, default: '' }, totalAmount: Number, shippingAmount: Number, finalAmount: Number, couponCode: { type: String, default: '' }, couponDiscount: { type: Number, default: 0 }, discountAmount: { type: Number, default: 0 }, gstAmount: { type: Number, default: 0 }, giftWrapCharge: { type: Number, default: 0 }, protectionCharge: { type: Number, default: 0 }, ecoCharge: { type: Number, default: 0 }, paymentFee: { type: Number, default: 0 }, extraCharges: { type: Number, default: 0 }, preDiscountTotal: { type: Number, default: 0 }, products: Array }, opts));
const Order = require('./models/Order');
const Contact = mongoose.models.Contact || mongoose.model('Contact', new mongoose.Schema({ name: String, email: String, phone: String, subject: String, message: String, status: { type: String, default: "Active" } }, opts));
const Newslatter = mongoose.models.Newslatter || mongoose.model('Newslatter', new mongoose.Schema({ email: { type: String, unique: true } }, opts));
const FooterConfig = mongoose.models.FooterConfig || mongoose.model('FooterConfig', new mongoose.Schema({
    brand: {
        name: { type: String, default: 'eShopper Boutique Luxe' },
        tagline: { type: String, default: 'Trusted Premium Commerce Experience' }
    },
    contact: {
        email: { type: String, default: SUPPORT_EMAIL_DEFAULT },
        phone: { type: String, default: SUPPORT_PHONE_DEFAULT },
        address: { type: String, default: 'Eshopper Boutique Luxe, New Delhi, India' }
    },
    socialLinks: {
        instagram: { type: String, default: 'https://instagram.com' },
        facebook: { type: String, default: 'https://facebook.com' },
        x: { type: String, default: 'https://x.com' },
        youtube: { type: String, default: 'https://youtube.com' },
        linkedin: { type: String, default: 'https://linkedin.com' }
    },
    trustBadges: {
        type: [String],
        default: ['Secure Payments', 'Verified Support', 'Premium Quality', 'Fast Delivery Network']
    },
    userFeatures: {
        type: [{
            title: { type: String, default: '' },
            subtitle: { type: String, default: '' }
        }],
        default: [
            { title: 'Live Order Tracking', subtitle: 'Real-time status updates after every order event' },
            { title: 'Secure Payments', subtitle: 'Protected checkout with verified payment security' },
            { title: 'Priority Support', subtitle: 'Fast help on WhatsApp and email whenever needed' },
            { title: 'Premium Drops', subtitle: 'Early alerts for new launches and exclusive deals' }
        ]
    }
}, opts));

const RAZORPAY_KEY_ID = String(process.env.RAZORPAY_KEY_ID || '').trim();
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET || '').trim();

const buildRazorpayReceipt = (userId, prefix = 'eshopper') => {
    const safeUserId = String(userId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'guest';
    // Compose receipt string
    let receipt = `${prefix}_${safeUserId}_${Date.now()}`;
    // Razorpay max receipt length = 40
    if (receipt.length > 40) {
        // Always keep the prefix and as much of userId as possible
        const maxUserIdLen = 40 - (prefix.length + 1 + 1 + String(Date.now()).length); // prefix + '_' + '_' + timestamp
        const trimmedUserId = safeUserId.slice(0, Math.max(0, maxUserIdLen));
        receipt = `${prefix}_${trimmedUserId}_${Date.now()}`.slice(0, 40);
    }
    return receipt;
};

const getRazorpayConfigPayload = () => ({
    keyId: RAZORPAY_KEY_ID,
    currency: 'INR',
    enabled: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)
});

const createRazorpayOrder = async ({ amount, currency = 'INR', receipt, paymentMethod }) => {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        const error = new Error('Razorpay credentials are not configured');
        error.status = 500;
        throw error;
    }

    const orderAmount = Math.max(1, Math.round(Number(amount || 0) * 100));
    // Ensure receipt is always <= 40 chars
    let safeReceipt = receipt || buildRazorpayReceipt(paymentMethod || 'payment');
    if (safeReceipt.length > 40) {
        safeReceipt = safeReceipt.substring(0, 40);
    }
    const response = await axios.post('https://api.razorpay.com/v1/orders', {
        amount: orderAmount,
        currency,
        receipt: safeReceipt,
        payment_capture: 1,
        notes: {
            paymentMethod: String(paymentMethod || 'Razorpay')
        }
    }, {
        auth: {
            username: RAZORPAY_KEY_ID,
            password: RAZORPAY_KEY_SECRET
        },
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 20000
    });

    return response.data;
};

const verifyRazorpaySignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    if (!RAZORPAY_KEY_SECRET) {
        return { verified: false, message: 'Razorpay credentials are not configured' };
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return { verified: false, message: 'Missing Razorpay payment details' };
    }

    const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        return { verified: false, message: 'Invalid Razorpay signature' };
    }

    return { verified: true };
};

const DEFAULT_FOOTER_CONFIG = {
    brand: {
        name: 'eShopper Boutique Luxe',
        tagline: 'Trusted Premium Commerce Experience'
    },
    contact: {
        email: SUPPORT_EMAIL_DEFAULT,
        phone: SUPPORT_PHONE_DEFAULT,
        address: process.env.COMPANY_ADDRESS || 'Eshopper Boutique Luxe, New Delhi, India'
    },
     socialLinks: {
        instagram: process.env.SOCIAL_INSTAGRAM_URL || 'https://instagram.com',
        facebook: process.env.SOCIAL_FACEBOOK_URL || 'https://facebook.com',
        x: process.env.SOCIAL_X_URL || 'https://x.com',
        youtube: process.env.SOCIAL_YOUTUBE_URL || 'https://youtube.com',
        linkedin: process.env.SOCIAL_LINKEDIN_URL || 'https://linkedin.com'
    },
    trustBadges: [
        'Secure Payments',
        'Verified Support',
        'Premium Quality',
        'Fast Delivery Network'
    ],
    userFeatures: [
        { title: 'Live Order Tracking', subtitle: 'Real-time status updates after every order event' },
        { title: 'Secure Payments', subtitle: 'Protected checkout with verified payment security' },
        { title: 'Priority Support', subtitle: 'Fast help on WhatsApp and email whenever needed' },
        { title: 'Premium Drops', subtitle: 'Early alerts for new launches and exclusive deals' }
    ]
};

const sanitizeFooterConfigInput = (payload = {}) => {
    const body = payload && typeof payload === 'object' ? payload : {};

    const toStringSafe = (value, fallback = '') => {
        const text = String(value ?? '').trim();
        return text || fallback;
    };

    const trustBadges = Array.isArray(body.trustBadges)
        ? body.trustBadges.map((item) => toStringSafe(item)).filter(Boolean).slice(0, 8)
        : [];

    const userFeatures = Array.isArray(body.userFeatures)
        ? body.userFeatures
            .map((item) => ({
                title: toStringSafe(item?.title),
                subtitle: toStringSafe(item?.subtitle)
            }))
            .filter((item) => item.title || item.subtitle)
            .slice(0, 8)
        : [];

    return {
        brand: {
            name: toStringSafe(body?.brand?.name, DEFAULT_FOOTER_CONFIG.brand.name),
            tagline: toStringSafe(body?.brand?.tagline, DEFAULT_FOOTER_CONFIG.brand.tagline)
        },
        contact: {
            email: toStringSafe(body?.contact?.email, DEFAULT_FOOTER_CONFIG.contact.email),
            phone: toStringSafe(body?.contact?.phone, DEFAULT_FOOTER_CONFIG.contact.phone),
            address: toStringSafe(body?.contact?.address, DEFAULT_FOOTER_CONFIG.contact.address)
        },
        socialLinks: {
            instagram: toStringSafe(body?.socialLinks?.instagram, DEFAULT_FOOTER_CONFIG.socialLinks.instagram),
            facebook: toStringSafe(body?.socialLinks?.facebook, DEFAULT_FOOTER_CONFIG.socialLinks.facebook),
            x: toStringSafe(body?.socialLinks?.x, DEFAULT_FOOTER_CONFIG.socialLinks.x),
            youtube: toStringSafe(body?.socialLinks?.youtube, DEFAULT_FOOTER_CONFIG.socialLinks.youtube),
            linkedin: toStringSafe(body?.socialLinks?.linkedin, DEFAULT_FOOTER_CONFIG.socialLinks.linkedin)
        },
        trustBadges: trustBadges.length ? trustBadges : DEFAULT_FOOTER_CONFIG.trustBadges,
        userFeatures: userFeatures.length ? userFeatures : DEFAULT_FOOTER_CONFIG.userFeatures
    };
};

app.get('/api/footer-data', async (req, res) => {
    try {
        const [productsCount, categoriesCount, usersCount, subscribersCount, footerConfigDoc] = await Promise.all([
            Product.countDocuments({}),
            Maincategory.countDocuments({}),
            User.countDocuments({}),
            Newslatter.countDocuments({}),
            FooterConfig.findOne({}).lean()
        ]);

        const dbConfig = sanitizeFooterConfigInput(footerConfigDoc || {});

        res.json({
            brand: dbConfig.brand,
            contact: dbConfig.contact,
            socialLinks: dbConfig.socialLinks,
            stats: {
                products: productsCount,
                categories: categoriesCount,
                members: usersCount,
                subscribers: subscribersCount
            },
            trustBadges: dbConfig.trustBadges,
            userFeatures: dbConfig.userFeatures
        });
    } catch (e) {
        console.error('❌ Footer data error:', e.message);
        res.status(500).json({ message: 'Failed to load footer data.' });
    }
});

app.get('/api/admin/footer-config', async (req, res) => {
    try {
        const adminSecret = req.headers['x-admin-secret'] || req.query.adminSecret;
        if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const footerConfigDoc = await FooterConfig.findOne({}).lean();
        return res.json({ success: true, config: sanitizeFooterConfigInput(footerConfigDoc || {}) });
    } catch (e) {
        console.error('❌ Admin footer config fetch error:', e.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch footer config' });
    }
});

app.put('/api/admin/footer-config', async (req, res) => {
    try {
        const adminSecret = req.headers['x-admin-secret'] || req.body?.adminSecret || req.query.adminSecret;
        if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const sanitizedConfig = sanitizeFooterConfigInput(req.body || {});
        const updated = await FooterConfig.findOneAndUpdate(
            {},
            { $set: sanitizedConfig },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean();

        return res.json({ success: true, message: 'Footer config updated', config: sanitizeFooterConfigInput(updated || {}) });
    } catch (e) {
        console.error('❌ Admin footer config update error:', e.message);
        return res.status(500).json({ success: false, message: 'Failed to update footer config' });
    }
});

const generateOrderId = async () => {
    const year = new Date().getFullYear();
    const prefix = `ESHP-${year}-`;
    const latestOrder = await Order.findOne({ orderId: new RegExp(`^${prefix}`) }).sort({ createdAt: -1 });
    const latestNumber = latestOrder?.orderId ? Number(String(latestOrder.orderId).split('-').pop()) || 0 : 0;
    const nextNumber = latestNumber + 1;
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

const ensureOutForDeliveryOtp = async (orderDoc = null) => {
    if (!orderDoc) return null;

    const normalized = normalizeOrderStatus(orderDoc.orderStatus || '');
    if (normalized !== 'Out for Delivery') return orderDoc;

    const existingOtp = String(orderDoc.deliveryOtp || '').trim();
    if (existingOtp) return orderDoc;

    const now = new Date();
    const generatedOtp = generateDeliveryOtpCode();
    const expiresAt = new Date(now.getTime() + DELIVERY_OTP_EXPIRY_MINUTES * 60000);

    await Order.updateOne(
        { _id: orderDoc._id },
        {
            $set: {
                deliveryOtp: generatedOtp,
                deliveryOtpSentAt: now,
                deliveryOtpExpiresAt: expiresAt,
                deliveryOtpVerifiedAt: null
            }
        }
    );

    return {
        ...orderDoc,
        deliveryOtp: generatedOtp,
        deliveryOtpSentAt: now,
        deliveryOtpExpiresAt: expiresAt,
        deliveryOtpVerifiedAt: null
    };
};

const normalizePhoneForWhatsApp = (phone = '') => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `91${digits}`;
    if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
    return digits;
};

const getTrackingLink = (orderId) => {
    const frontend = String(process.env.FRONTEND_URL || 'https://eshopperr.me').replace(/\/$/, '');
    return `${frontend}/order-tracking/${encodeURIComponent(orderId)}`;
};

// 🔴 WHATSAPP MEDIA FUNCTION - FOR SHIPPED STATUS WITH IMAGE
const sendWhatsAppMedia = async (number, mediaUrl, caption) => {
    if (!FEATURE_WHATSAPP_NOTIFICATIONS) {
        return { skipped: true, reason: 'whatsapp-notifications-disabled' };
    }
    const apiUrl = process.env.EVOLUTION_API_URL ? process.env.EVOLUTION_API_URL.trim().replace(/\/$/, '') : '';
    const token = process.env.WHATSAPP_TOKEN ? process.env.WHATSAPP_TOKEN.trim() : '';
    const apiKey = process.env.EVOLUTION_API_KEY ? process.env.EVOLUTION_API_KEY.trim() : '';
    const instance = process.env.WHATSAPP_INSTANCE || 'eshopper_bot';
    const botPhoneNumber = process.env.BOT_PHONE_NUMBER ? String(process.env.BOT_PHONE_NUMBER).trim() : '918447859784';
    const normalizedSender = botPhoneNumber.replace(/\D/g, '');
    if (normalizedSender.length > 12) normalizedSender = normalizedSender.slice(-12);

    const normalizePhoneStrict = (phone = '') => {
        let digits = String(phone || '').replace(/\D/g, '');
        if (!digits) return '';

        if (digits.length === 11 && digits.startsWith('0')) {
            digits = digits.slice(1);
        }

        if (digits.length === 12 && digits.startsWith('91')) {
            return digits;
        }

        if (digits.length > 10 && digits.startsWith('91')) {
            digits = digits.slice(-10);
        }

        if (digits.length === 10) {
            return `91${digits}`;
        }

        if (digits.length > 10) {
            return `91${digits.slice(-10)}`;
        }

        return '';
    };

    const contactNumber = normalizePhoneStrict(number);

    if (!apiUrl) {
        console.error('❌ EVOLUTION_API_URL not configured');
        throw new Error('EVOLUTION_API_URL not configured');
    }

    if (!token && !apiKey) {
        console.error('❌ WHATSAPP_TOKEN or EVOLUTION_API_KEY not configured');
        throw new Error('WHATSAPP credentials not configured');
    }

    if (!contactNumber || contactNumber.length < 12) {
        console.error('❌ Invalid phone:', contactNumber);
        throw new Error('Invalid phone number format');
    }

    if (!mediaUrl || !caption) {
        console.error('❌ Media URL or caption missing');
        throw new Error('Media URL and caption required');
    }

    // 🔴 SELF-LOOP PREVENTION FOR MEDIA
    if (normalizedSender && contactNumber === normalizedSender) {
        console.warn(`⚠️  SELF-LOOP DETECTED in sendWhatsAppMedia! Would send to bot's own number: ${contactNumber}`);
        const selfLoopError = new Error('Cannot send media to bot\'s own number (self-loop prevention)');
        selfLoopError.code = 'WHATSAPP_SELF_LOOP';
        selfLoopError.isExpected = true;
        throw selfLoopError;
    }

    try {
        const endpoint = `${apiUrl}/message/sendMedia/${instance}`;
        const mediaCaption = String(caption).trim();

        // 🔴 VALIDATE MEDIA URL WITH BETTER ERROR HANDLING
        let mediaUrlValid = true;
        try {
            console.log(`🔍 Validating media URL: ${mediaUrl}`);
            const urlCheck = await axios.head(mediaUrl, {
                timeout: 8000,
                maxRedirects: 5,
                headers: { 'User-Agent': 'Eshopper-WhatsApp-Client/1.0' }
            });
            console.log(`✅ Media URL validated (status: ${urlCheck.status})`);
        } catch (urlCheckErr) {
            mediaUrlValid = false;
            console.error(`❌ Media URL inaccessible: ${urlCheckErr.message} (${urlCheckErr.response?.status || 'no status'})`);
            console.warn(`⚠️  Evolution API may fail to fetch this URL. Proceeding with text fallback strategy.`);
        }

        // If media URL is invalid, fail gracefully
        if (!mediaUrlValid) {
            const mediaErr = new Error('Media URL is not accessible');
            mediaErr.code = 'WHATSAPP_MEDIA_UNREACHABLE';
            mediaErr.isExpected = true;
            throw mediaErr;
        }

        // OPTIMIZED payloads - use simplest format that Evolution API accepts
        const payloadFormats = [
            {
                number: contactNumber,
                mediatype: 'image',
                media: mediaUrl,
                caption: mediaCaption
            },
            {
                number: `${contactNumber}@s.whatsapp.net`,
                mediatype: 'image',
                media: mediaUrl,
                caption: mediaCaption
            },
            {
                number: contactNumber,
                mediatype: 'image',
                media: mediaUrl,
                mimetype: 'image/png',
                caption: mediaCaption
            },
            {
                number: `${contactNumber}@s.whatsapp.net`,
                mediatype: 'image',
                media: mediaUrl,
                mimetype: 'image/png',
                caption: mediaCaption
            }
        ];

        console.log(`📸 Sending WhatsApp Media to: ${contactNumber}`);
        console.log(`   Endpoint: ${endpoint}`);
        console.log(`   Media URL Valid: ${mediaUrlValid ? '✅ Yes' : '❌ No'}`);
        console.log(`   Caption: ${mediaCaption.substring(0, 60)}${mediaCaption.length > 60 ? '...' : ''}`);
        console.log(`   Total payload variants to try: ${payloadFormats.length}`);

        let lastError;
        let lastStatus;
        let lastResponseData;

        for (let i = 0; i < payloadFormats.length; i++) {
            const payload = payloadFormats[i];
            try {
                const response = await axios.post(endpoint, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': token || apiKey
                    },
                    timeout: 30000
                });

                console.log(`✅ WhatsApp media sent on attempt ${i + 1} (Status: ${response.status})`);
                return true;
            } catch (err) {
                lastError = err;
                lastStatus = err.response?.status;
                lastResponseData = err.response?.data;
                console.warn(`⚠️ sendMedia attempt ${i + 1} failed:`, lastStatus || err.message);
                if (lastResponseData) {
                    console.warn('⚠️ sendMedia error payload:', typeof lastResponseData === 'string' ? lastResponseData : JSON.stringify(lastResponseData));
                }

                if (err.response?.status === 401 && apiKey) {
                    try {
                        const bearerResponse = await axios.post(endpoint, payload, {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            timeout: 30000
                        });

                        console.log(`✅ WhatsApp media sent with Bearer auth (Status: ${bearerResponse.status})`);
                        return true;
                    } catch (bearerErr) {
                        lastError = bearerErr;
                    }
                }
            }
        }


        // 400-level media validation errors are common with provider payload quirks.
        // Soft-fail here so caller can use text fallback without noisy exception propagation.
        if (lastStatus === 400) {
            const softError = new Error('sendMedia rejected payload with 400; use text fallback');
            softError.code = 'WHATSAPP_MEDIA_BAD_REQUEST';
            softError.isExpected = true;
            softError.details = lastResponseData;
            throw softError;
        }

        throw lastError || new Error('All sendMedia payload attempts failed');
    } catch (error) {
        // Detect URL accessibility issues early
        if (error.code === 'WHATSAPP_MEDIA_UNREACHABLE') {
            console.error('⚠️  Media URL is not accessible - triggering text fallback');
            throw error;
        }

        // Expected errors (don't clutter logs)
        if (error.isExpected) {
            console.error('⚠️  Expected WhatsApp media error:', error.message);
            throw error;
        }

        console.error('❌ WhatsApp media send failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            endpoint: error.config?.url,
            data: error.response?.data || error.details
        });
        throw error;
    }
};
// ============ FIREBASE AUTH SYNC ROUTE ============
app.post('/api/auth-sync', async (req, res) => {
    try {
        if (!firebaseAdminReady) {
            return res.status(503).json({
                message: 'Firebase authentication service is temporarily unavailable. Please try again shortly.'
            });
        }

        const { idToken, uid, email, phone, name, pic, provider } = req.body;
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        const normalizedPhone = phone ? phone.trim() : null;

        // Improved validation with better logging
        if (!idToken || !uid || !provider) {
            console.warn('⚠️ Auth sync called with incomplete data:', { hasToken: !!idToken, hasUid: !!uid, hasProvider: !!provider });
            return res.status(400).json({
                message: "Authentication incomplete. Please try signing in again.",
                missingFields: {
                    idToken: !idToken,
                    uid: !uid,
                    provider: !provider
                }
            });
        }

        // 🔐 VERIFY FIREBASE ID TOKEN
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
            console.log(`✅ Firebase token verified for UID: ${decodedToken.uid}`);
        } catch (err) {
            console.error("❌ Firebase token verification failed:", err.message);
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // Ensure UID matches
        if (decodedToken.uid !== uid) {
            console.warn(`⚠️  UID mismatch: ${decodedToken.uid} !== ${uid}`);
            return res.status(401).json({ message: "UID mismatch" });
        }

        let user = null;

        // 🔍 CHECK IF USER EXISTS BY UID
        user = await User.findOne({ uid: uid });

        if (user) {
            // ✅ USER EXISTS - UPDATE LOGIN TIMESTAMP & PROVIDER INFO
            console.log(`📝 Updating existing user: ${user.email}`);
            user.lastLogin = new Date();

            // Update additional info if provided
            if (name && !user.name) user.name = name;
            if (pic && !user.pic) user.pic = pic;
            if (phone && !user.phone) user.phone = phone;
            if (email && !user.email) user.email = email;

            await user.save();
            console.log(`✅ User updated successfully: ${user.email}`);
        } else {
            // 🔗 LINK EXISTING ACCOUNT BY EMAIL/PHONE (prevents duplicate key errors)
            if (normalizedEmail) {
                user = await User.findOne({ email: normalizedEmail });
            }

            if (!user && normalizedPhone) {
                user = await User.findOne({ phone: normalizedPhone });
            }

            if (user) {
                console.log(`🔗 Linking existing account to Firebase UID: ${user.email || user.phone}`);
                user.uid = uid;
                user.provider = provider;
                user.lastLogin = new Date();
                if (name && !user.name) user.name = name;
                if (pic && !user.pic) user.pic = pic;
                if (normalizedPhone && !user.phone) user.phone = normalizedPhone;
                if (normalizedEmail && !user.email) user.email = normalizedEmail;
                await user.save();
                console.log(`✅ Existing account linked successfully: ${user.email || user.phone}`);
            } else {
                // 🆕 NEW USER - CREATE ACCOUNT
                console.log(`🆕 Creating new user with UID: ${uid}`);

                // Generate unique username from email or name
                let generatedUsername = null;
                if (normalizedEmail) {
                    generatedUsername = normalizedEmail.split('@')[0].toLowerCase();
                } else if (name) {
                    generatedUsername = name.split(' ')[0].toLowerCase();
                }

                // Ensure unique username
                if (generatedUsername) {
                    let counter = 1;
                    let baseUsername = generatedUsername;
                    while (await User.findOne({ username: generatedUsername })) {
                        generatedUsername = `${baseUsername}${counter}`;
                        counter++;
                    }
                }

                user = new User({
                    uid: uid,
                    name: name || "User",
                    email: normalizedEmail || null,
                    phone: normalizedPhone || null,
                    pic: pic || null,
                    provider: provider,
                    username: generatedUsername,
                    role: "User",
                    lastLogin: new Date()
                });

                // For phone auth, generate a random password
                if (provider === 'phone' && !user.password) {
                    const randomPass = Math.random().toString(36).slice(-12);
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(randomPass, salt);
                }

                await user.save();
                console.log(`✅ New user created: ${user.email || user.phone}`);
            }
        }

        // Return user data (without sensitive info)
        const { password, otp, otpExpires, failedAttempts, lockUntil, ...safeUser } = user.toJSON();

        res.json(safeUser);
    } catch (err) {
        console.error("❌ Auth Sync Error:", err.message);
        if (err.code === 11000) {
            return res.status(409).json({ message: "Account already exists. Please login with your existing account." });
        }
        if (process.env.SENTRY_DSN) Sentry.captureException(err);
        res.status(500).json({ message: "Authentication sync failed. Please try again." });
    }
});

app.post('/api/send-otp', authLimiter, async (req, res) => {
    try {
        const { email, type } = req.body;
        if (!email || !type) return res.status(400).json({ message: "Email and type are required." });

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedType = String(type).toLowerCase().trim();
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
        if (!isValidEmail) {
            return res.status(400).json({ message: "Invalid email format." });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Forgot password must validate against registered email only.
        if (normalizedType === 'forget') {
            const forgetUser = await User.findOne({ email: normalizedEmail });
            if (!forgetUser) {
                return res.status(404).json({ message: "Email is not registered." });
            }

            forgetUser.otp = otp;
            forgetUser.otpExpires = new Date(Date.now() + 10 * 60000);
            await forgetUser.save();

            await sendMail(forgetUser.email, otp);
            return res.json({ result: "Done", message: "OTP sent successfully" });
        }

        const user = await User.findOne({ $or: [{ email: normalizedEmail }, { username: normalizedEmail }] });

        if (normalizedType === 'signup' && user) return res.status(400).json({ message: "Email already registered" });

        if (user) {
            user.otp = otp; user.otpExpires = new Date(Date.now() + 10 * 60000); await user.save();
        } else {
            await OTPRecord.findOneAndUpdate({ email: normalizedEmail }, { otp, email: normalizedEmail }, { upsert: true });
        }

        // 📧 CRITICAL FIX: Always send to user's actual email, not the input (which might be username)
        const emailToSend = user ? user.email : normalizedEmail;
        await sendMail(emailToSend, otp);
        res.json({ result: "Done", message: "OTP sent successfully" });
    } catch (e) {
        console.error("❌ Email Error:", e.message);
        console.error("❌ Email Error Stack:", e.stack);
        res.status(500).json({ error: "Failed to send OTP. Please try again." });
    }
});

app.post('/api/reset-password', authLimiter, async (req, res) => {
    try {
        const searchTerm = req.body.username.toLowerCase().trim();
        const newPassword = req.body.password;
        const otp = req.body.otp;

        // 🔒 BACKEND PASSWORD VALIDATION
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long." });
        }

        // Check for uppercase letter
        if (!/[A-Z]/.test(newPassword)) {
            return res.status(400).json({ message: "Password must contain at least one uppercase letter." });
        }

        // Check for special character
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            return res.status(400).json({ message: "Password must contain at least one special character." });
        }

        const user = await User.findOne({ $or: [{ email: searchTerm }, { username: searchTerm }] });

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // ⏰ CHECK OTP VALIDITY (Exactly 10 minutes)
        if (!user.otp || !user.otpExpires) {
            return res.status(400).json({ message: "No OTP found. Please request a new code." });
        }

        if (Date.now() > user.otpExpires) {
            // Clean expired OTP
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();
            return res.status(400).json({ message: "OTP has expired. Please request a new code." });
        }

        // ✅ VERIFY OTP
        if (user.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP code. Please check and try again." });
        }

        // 🔐 HASH NEW PASSWORD
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // 🧹 CLEANUP: Remove OTP and expiration after successful reset
        user.otp = undefined;
        user.otpExpires = undefined;

        await user.save();

        console.log(`✅ Password reset successful for user: ${user.username}`);
        res.json({ result: "Done", message: "Password updated successfully!" });

    } catch (e) {
        console.error("❌ Password Reset Error:", e.message);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
});

// CHECK USERNAME AVAILABILITY - For signup validation
app.post('/api/check-username', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || username.length < 3) {
            return res.status(400).json({ message: "Username must be at least 3 characters" });
        }
        const normalizedUsername = username.toLowerCase().trim();
        const existingUser = await User.findOne({ username: normalizedUsername });
        res.json({ available: !existingUser });
    } catch (e) {
        console.error("❌ Username Check Error:", e.message);
        res.status(500).json({ error: "Failed to check username" });
    }
});

app.post('/login', authLimiter, async (req, res) => {
    try {
        const searchTerm = req.body.username.toLowerCase().trim();
        const user = await User.findOne({ $or: [{ username: searchTerm }, { email: searchTerm }] });

        // 🔒 CHECK IF ACCOUNT IS LOCKED
        if (user && user.lockUntil && Date.now() < user.lockUntil) {
            const minutesRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(403).json({
                message: `Account temporarily locked due to multiple failed login attempts. Try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`,
                remainingMinutes: minutesRemaining
            });
        }

        // 🔐 CHECK IF USER EXISTS AND HAS PASSWORD
        if (user) {
            // ❌ BLOCK LOGIN IF NO PASSWORD (Google/Phone auth user)
            if (!user.password) {
                const authMethod = user.provider === 'google' ? 'Google Login' :
                    user.provider === 'phone' ? 'Phone Login' :
                        'your authentication provider';

                console.warn(`⚠️ Login attempt by ${user.provider} user via manual login: ${user.email || user.username}`);

                return res.status(403).json({
                    message: `This account uses ${authMethod}. Use ${authMethod} to sign in or set a password using Forgot Password.`,
                    provider: user.provider,
                    requiresFirebaseAuth: true
                });
            }

            // ✅ PASSWORD EXISTS - COMPARE PASSWORDS
            if (await bcrypt.compare(req.body.password, user.password)) {
                const twoFactorEnabled = Boolean(user?.settings?.security?.twoFactorEnabled);
                const normalizedEmail = String(user.email || '').trim().toLowerCase();

                if (twoFactorEnabled) {
                    if (!normalizedEmail) {
                        return res.status(400).json({
                            message: '2FA is enabled but no verified email is available for this account.'
                        });
                    }

                    const otp = Math.floor(100000 + Math.random() * 900000).toString();
                    await OTPRecord.findOneAndUpdate(
                        { email: normalizedEmail },
                        { email: normalizedEmail, otp, createdAt: new Date() },
                        { upsert: true, new: true }
                    );

                    await sendMail(normalizedEmail, otp);
                    return res.json({
                        requiresTwoFactor: true,
                        message: `Verification code sent to ${maskEmail(normalizedEmail)}`,
                        maskedEmail: maskEmail(normalizedEmail)
                    });
                }

                // ✅ LOGIN SUCCESS - RESET FAILED ATTEMPTS
                user.failedAttempts = 0;
                user.lockUntil = undefined;
                user.lastLogin = new Date();
                await user.save();

                console.log(`✅ Login successful: ${user.email || user.username}`);
                const { password: _pw, otp: _otp, otpExpires: _exp, failedAttempts: _fa, lockUntil: _lu, ...safeUser } = user.toJSON();
                return res.json(safeUser);
            }
        }

        // ❌ LOGIN FAILED - INCREMENT FAILED ATTEMPTS
        if (user) {
            user.failedAttempts = (user.failedAttempts || 0) + 1;

            // LOCK ACCOUNT AFTER 5 FAILED ATTEMPTS
            if (user.failedAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60000); // 15 minutes
                await user.save();
                console.warn(`🔒 Account locked: ${user.email || user.username} - Too many failed attempts`);
                return res.status(403).json({
                    message: "Too many failed login attempts. Account locked for 15 minutes.",
                    remainingMinutes: 15
                });
            }

            await user.save();
            console.warn(`⚠️ Failed login attempt #${user.failedAttempts}: ${user.email || user.username}`);
        } else {
            console.warn(`⚠️ Login attempt for non-existent user: ${searchTerm}`);
        }

        return res.status(401).json({ message: "Invalid Credentials" });

    } catch (e) {
        console.error("❌ Login Error:", e.message);
        res.status(500).json({ message: "Something went wrong." });
    }
});

app.post('/api/login-2fa', authLimiter, async (req, res) => {
    try {
        const searchTerm = String(req.body.username || '').toLowerCase().trim();
        const plainPassword = String(req.body.password || '');
        const otp = String(req.body.otp || '').trim();

        if (!searchTerm || !plainPassword || !otp) {
            return res.status(400).json({ message: 'Username, password and OTP are required.' });
        }

        const user = await User.findOne({ $or: [{ username: searchTerm }, { email: searchTerm }] });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        if (user.lockUntil && Date.now() < user.lockUntil) {
            const minutesRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(403).json({
                message: `Account temporarily locked. Try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`,
                remainingMinutes: minutesRemaining
            });
        }

        const passwordOk = await bcrypt.compare(plainPassword, user.password || '');
        if (!passwordOk) {
            user.failedAttempts = (user.failedAttempts || 0) + 1;
            if (user.failedAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60000);
            }
            await user.save();
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        if (!Boolean(user?.settings?.security?.twoFactorEnabled)) {
            user.failedAttempts = 0;
            user.lockUntil = undefined;
            user.lastLogin = new Date();
            await user.save();
            const { password: _pw, otp: _otp, otpExpires: _exp, failedAttempts: _fa, lockUntil: _lu, ...safeUser } = user.toJSON();
            return res.json(safeUser);
        }

        const normalizedEmail = String(user.email || '').trim().toLowerCase();
        if (!normalizedEmail) {
            return res.status(400).json({ message: 'No verified email found for this account.' });
        }

        const otpRecord = await OTPRecord.findOne({ email: normalizedEmail, otp });
        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP code.' });
        }

        await OTPRecord.deleteMany({ email: normalizedEmail });

        user.failedAttempts = 0;
        user.lockUntil = undefined;
        user.lastLogin = new Date();
        await user.save();

        const { password: _pw, otp: _otp, otpExpires: _exp, failedAttempts: _fa, lockUntil: _lu, ...safeUser } = user.toJSON();
        return res.json(safeUser);
    } catch (e) {
        console.error('❌ Login 2FA Error:', e.message);
        return res.status(500).json({ message: '2FA verification failed. Please try again.' });
    }
});

const DEFAULT_USER_SETTINGS = {
    notifications: {
        orderUpdates: true,
        deliveryUpdates: true,
        promotionalEmails: true,
        priceAlerts: false,
        wishlistAlerts: true,
        smsAlerts: false
    },
    privacy: {
        profileVisibility: 'Private',
        personalizedRecommendations: true
    },
    security: {
        twoFactorEnabled: false,
        loginAlerts: true
    },
    communication: {
        newsletter: true,
        whatsappUpdates: false,
        pushNotifications: true
    }
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const deepMerge = (baseValue, overrideValue) => {
    if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) {
        return overrideValue === undefined ? baseValue : overrideValue;
    }

    const merged = { ...baseValue };
    Object.keys(overrideValue).forEach((key) => {
        merged[key] = deepMerge(baseValue[key], overrideValue[key]);
    });
    return merged;
};

const normalizeUserSettings = (settings) => deepMerge(DEFAULT_USER_SETTINGS, isPlainObject(settings) ? settings : {});

const normalizeUserDocument = (doc) => {
    if (!doc) return doc;
    const plainDoc = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return {
        ...plainDoc,
        id: String(plainDoc._id || plainDoc.id || ''),
        deliveryInstructions: plainDoc.deliveryNotes || plainDoc.deliveryInstructions || '',
        settings: normalizeUserSettings(plainDoc.settings)
    };
};

const conditionalUpload = (req, res, next) => {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('multipart/form-data')) {
        return upload(req, res, next);
    }
    return next();
};

const handle = (path, Model, useUpload = false) => {
    // GET all or by query
    app.get(path, async (req, res) => {
        try {
            if (req.query.id || req.query._id) {
                const id = req.query.id || req.query._id;
                const doc = await Model.findById(id);
                if (!doc) return res.status(404).json({ message: 'Not found' });
                return res.json(path === '/user' ? normalizeUserDocument(doc) : doc);
            }
            const docs = await Model.find().sort({ createdAt: -1 }).lean(); // ✅ Faster JSON Queries
            res.json(path === '/user' ? docs.map((doc) => normalizeUserDocument(doc)) : docs);
        } catch (e) {
            res.status(500).json({ message: 'Failed to fetch', error: e.message });
        }
    });
    // GET by id (param)
    app.get(`${path}/:id`, async (req, res) => {
        try {
            const doc = await Model.findById(req.params.id);
            if (!doc) return res.status(404).json({ message: 'Not found' });
            res.json(path === '/user' ? normalizeUserDocument(doc) : doc);
        } catch (e) {
            res.status(500).json({ message: 'Failed to fetch', error: e.message });
        }
    });
    // POST (create)
    app.post(path, useUpload ? conditionalUpload : (req, res, next) => next(), async (req, res) => {
        try {
            let data = { ...req.body };
            if (req.files) {
                if (req.files.pic) data.pic = req.files.pic[0].path;
                if (req.files.pic1) data.pic1 = req.files.pic1[0].path;
                if (req.files.pic2) data.pic2 = req.files.pic2[0].path;
                if (req.files.pic3) data.pic3 = req.files.pic3[0].path;
                if (req.files.pic4) data.pic4 = req.files.pic4[0].path;
            }
            if (path === '/user' && typeof data.settings === 'string') {
                try {
                    data.settings = JSON.parse(data.settings);
                } catch (parseError) {
                    console.warn('⚠️ Invalid user settings payload on create, ignoring custom settings:', parseError.message);
                    delete data.settings;
                }
            }
            if (path === '/user' && data.deliveryNotes == null && typeof data.deliveryInstructions === 'string') {
                data.deliveryNotes = data.deliveryInstructions;
            }
            if (path === '/user') {
                data.settings = normalizeUserSettings(data.settings);
            }
            const doc = new Model(data);
            await doc.save();
            res.status(201).json(path === '/user' ? normalizeUserDocument(doc) : doc);
        } catch (e) {
            const mongoDup = e?.code === 11000 || /E11000/i.test(String(e?.message || ''));
            if (mongoDup) {
                const indexFieldFromMessage = String(e?.message || '').match(/index:\s+([a-zA-Z0-9_]+)_1/i)?.[1];
                const duplicateField = Object.keys(e?.keyPattern || {})[0] || indexFieldFromMessage || 'field';
                return res.status(400).json({
                    message: `${duplicateField} already exists. Please use a different ${duplicateField}.`,
                    error: e.message,
                    field: duplicateField
                });
            }
            res.status(400).json({ message: e.message || 'Failed to create', error: e.message });
        }
    });
    app.put(`${path}/:id`, useUpload ? upload : (req, res, next) => next(), async (req, res) => {
        try {
            let upData = { ...req.body };
            if (req.files) {
                if (req.files.pic) upData.pic = req.files.pic[0].path;
                if (req.files.pic1) upData.pic1 = req.files.pic1[0].path;
                if (req.files.pic2) upData.pic2 = req.files.pic2[0].path;
                if (req.files.pic3) upData.pic3 = req.files.pic3[0].path;
                if (req.files.pic4) upData.pic4 = req.files.pic4[0].path;
            }

            if (path === '/user' && typeof upData.settings === 'string') {
                try {
                    upData.settings = JSON.parse(upData.settings);
                } catch (parseError) {
                    console.warn('⚠️ Invalid user settings payload, ignoring custom settings:', parseError.message);
                    delete upData.settings;
                }
            }

            if (path === '/user' && upData.deliveryNotes == null && typeof req.body.deliveryNotes === 'string') {
                upData.deliveryNotes = req.body.deliveryNotes;
            }
            if (path === '/user' && upData.deliveryNotes == null && typeof req.body.deliveryInstructions === 'string') {
                upData.deliveryNotes = req.body.deliveryInstructions;
            }

            if (path === '/user') {
                const existingUser = await Model.findById(req.params.id);
                upData.settings = normalizeUserSettings(deepMerge(existingUser?.settings || {}, upData.settings || {}));
            }

            if (path === '/user' && req.body.password && String(req.body.password).length < 25) {
                const salt = await bcrypt.genSalt(10); upData.password = await bcrypt.hash(upData.password, salt);
            } else if (path === '/user') { delete upData.password; }
            const d = await Model.findByIdAndUpdate(req.params.id, upData, { new: true });
            if (!d) return res.status(404).json({ message: 'Not found' });

            if (path === '/product') {
                const finalPrice = d.finalprice != null ? d.finalprice : (d.baseprice || 0);
                sendAdminAlert({
                    title: `Product Updated • ${d.name || 'Unnamed Product'}`,
                    details: `Catalog product was updated successfully. Product ID: ${d._id}`,
                    category: 'product-updated',
                    data: {
                        productName: d.name,
                        productId: String(d._id || ''),
                        maincategory: d.maincategory,
                        subcategory: d.subcategory,
                        brand: d.brand,
                        stock: d.stock,
                        finalprice: finalPrice,
                        discount: d.discount || 0,
                        description: d.description,
                        imageUrl: d.pic1,
                        updatedAt: new Date().toLocaleString('en-IN'),
                        adminProductUrl: `${FRONTEND_PUBLIC_URL}/admin/product`,
                        storeUrl: FRONTEND_PUBLIC_URL
                    }
                }).catch((alertErr) => {
                    console.warn('⚠️ Product update alert email failed:', alertErr.message);
                });
            }

            res.json(path === '/user' ? normalizeUserDocument(d) : d);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    app.delete(`${path}/:id`, async (req, res) => {
        try {
            await Model.findByIdAndDelete(req.params.id);
            res.json({ result: "Done" });
        } catch (e) {
            console.error(`❌ Error deleting from ${path}:`, e.message);
            res.status(500).json({ error: "Failed to delete." });
        }
    });
};


handle('/user', User, true);
handle('/product', Product, true);
// Compatibility: GET /product returns all products (for frontend)
app.get('/product', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 }).lean();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
handle('/maincategory', Maincategory);
handle('/subcategory', Subcategory);
handle('/brand', Brand);
handle('/cart', Cart);
handle('/coupon', Coupon);
handle('/wishlist', Wishlist);
handle('/api/wishlist', Wishlist);
handle('/checkout', Checkout);
handle('/contact', Contact);
handle('/newslatter', Newslatter);

// 🔴 EXPLICIT /coupon ENDPOINTS (Ensure they always work)
app.get('/coupon', async (req, res) => {
    try {
        const docs = await Coupon.find().sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (e) {
        res.status(500).json({ message: 'Failed to fetch coupons', error: e.message });
    }
});

app.get('/coupon/:id', async (req, res) => {
    try {
        const doc = await Coupon.findById(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Coupon not found' });
        res.json(doc);
    } catch (e) {
        res.status(500).json({ message: 'Failed to fetch', error: e.message });
    }
});

app.post('/coupon', async (req, res) => {
    try {
        const doc = new Coupon(req.body);
        await doc.save();
        try { await clearCache('__express__/coupon'); await clearCache('/api/chatbot/knowledge'); } catch(e){/*ignore*/}
        res.status(201).json(doc);
    } catch (e) {
        res.status(400).json({ message: 'Failed to create coupon', error: e.message });
    }
});

app.put('/coupon/:id', async (req, res) => {
    try {
        const d = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!d) return res.status(404).json({ message: 'Coupon not found' });
        try { await clearCache('__express__/coupon'); await clearCache('/api/chatbot/knowledge'); } catch(e){/*ignore*/}
        res.json(d);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Chatbot knowledge endpoint: returns categories, subcategories, brands, products snapshot, and active coupons
app.get('/api/chatbot/knowledge', async (req, res) => {
    try {
        const maincats = typeof Maincategory !== 'undefined' ? await Maincategory.find().lean() : [];
        const subcats = typeof Subcategory !== 'undefined' ? await Subcategory.find().lean() : [];
        const brands = typeof Brand !== 'undefined' ? await Brand.find().lean() : [];
        const products = typeof Product !== 'undefined' ? await Product.find().sort({ createdAt: -1 }).limit(1000).lean() : [];
        let coupons = typeof Coupon !== 'undefined' ? await Coupon.find().sort({ createdAt: -1 }).lean() : [];

        // Filter active coupons by startsAt/expiresAt similar to cartController
        const now = new Date();
        coupons = (coupons || []).filter((c) => {
            if (c.isActive === false) return false;
            if (c.startsAt && now < new Date(c.startsAt)) return false;
            if (c.expiresAt && now > new Date(c.expiresAt)) return false;
            return true;
        });

        res.json({
            maincategories: maincats,
            subcategories: subcats,
            brands,
            products,
            coupons
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/coupon/:id', async (req, res) => {
    try {
        const d = await Coupon.findByIdAndDelete(req.params.id);
        if (!d) return res.status(404).json({ message: 'Coupon not found' });
        try { await clearCache('__express__/coupon'); await clearCache('/api/chatbot/knowledge'); } catch(e){/*ignore*/}
        res.json({ result: 'Deleted', doc: d });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete', message: e.message });
    }
});

// --- Compatibility REST endpoints for legacy frontend calls (GET, POST, PUT, DELETE) ---
const compatModels = [
    { path: '/user', Model: User },
    { path: '/cart', Model: Cart },
    { path: '/coupon', Model: Coupon },
    { path: '/wishlist', Model: Wishlist },
    { path: '/checkout', Model: Checkout },
    { path: '/contact', Model: Contact },
    { path: '/maincategory', Model: Maincategory },
    { path: '/subcategory', Model: Subcategory },
    { path: '/brand', Model: Brand },
    { path: '/newslatter', Model: Newslatter },
];
compatModels.forEach(({ path, Model }) => {
    // GET all or by id
    app.get(path, async (req, res) => {
        try {
            if (req.query.id || req.query._id) {
                const id = req.query.id || req.query._id;
                const doc = await Model.findById(id);
                if (!doc) return res.status(404).json({ message: 'Not found' });
                return res.json(doc);
            }
            const docs = await Model.find().sort({ createdAt: -1 }).lean();
            res.json(docs);
        } catch (e) {
            res.status(500).json({ message: 'Failed to fetch' });
        }
    });
    app.get(`${path}/:id`, async (req, res) => {
        try {
            const doc = await Model.findById(req.params.id);
            if (!doc) return res.status(404).json({ message: 'Not found' });
            res.json(doc);
        } catch (e) {
            res.status(500).json({ message: 'Failed to fetch' });
        }
    });
    // POST (create)
    app.post(path, async (req, res) => {
        try {
            const doc = new Model(req.body);
            await doc.save();
            // Invalidate caches for brand/category/coupon changes
            try {
                const modelName = (Model && Model.modelName) ? String(Model.modelName).toLowerCase() : String(path).toLowerCase();
                if (['brand', 'maincategory', 'subcategory', 'coupon'].includes(modelName)) {
                    await Promise.allSettled([
                        clearCache('__express__/brand'),
                        clearCache('__express__/maincategory'),
                        clearCache('__express__/subcategory'),
                        clearCache('__express__/coupon'),
                        clearCache('/api/chatbot/knowledge')
                    ]);
                }
            } catch (cacheErr) {
                console.warn('Cache invalidation failed after create:', cacheErr && cacheErr.message);
            }
            res.status(201).json(doc);
        } catch (e) {
            res.status(400).json({ message: 'Failed to create', error: e.message });
        }
    });
    // PUT (update by id)
    app.put(`${path}/:id`, async (req, res) => {
        try {
            const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!doc) return res.status(404).json({ message: 'Not found' });
            try {
                const modelName = (Model && Model.modelName) ? String(Model.modelName).toLowerCase() : String(path).toLowerCase();
                if (['brand', 'maincategory', 'subcategory', 'coupon'].includes(modelName)) {
                    await Promise.allSettled([
                        clearCache('__express__/brand'),
                        clearCache('__express__/maincategory'),
                        clearCache('__express__/subcategory'),
                        clearCache('__express__/coupon'),
                        clearCache('/api/chatbot/knowledge')
                    ]);
                }
            } catch (cacheErr) {
                console.warn('Cache invalidation failed after update:', cacheErr && cacheErr.message);
            }
            res.json(doc);
        } catch (e) {
            res.status(400).json({ message: 'Failed to update', error: e.message });
        }
    });
    // DELETE (by id)
    app.delete(`${path}/:id`, async (req, res) => {
        try {
            const doc = await Model.findByIdAndDelete(req.params.id);
            if (!doc) return res.status(404).json({ message: 'Not found' });
            try {
                const modelName = (Model && Model.modelName) ? String(Model.modelName).toLowerCase() : String(path).toLowerCase();
                if (['brand', 'maincategory', 'subcategory', 'coupon'].includes(modelName)) {
                    await Promise.allSettled([
                        clearCache('__express__/brand'),
                        clearCache('__express__/maincategory'),
                        clearCache('__express__/subcategory'),
                        clearCache('__express__/coupon'),
                        clearCache('/api/chatbot/knowledge')
                    ]);
                }
            } catch (cacheErr) {
                console.warn('Cache invalidation failed after delete:', cacheErr && cacheErr.message);
            }
            res.json({ result: 'Deleted', doc });
        } catch (e) {
            res.status(400).json({ message: 'Failed to delete', error: e.message });
        }
    });
});

app.post('/api/cart/clear/:userid', async (req, res) => {
    try {
        const userid = String(req.params.userid || '').trim();
        if (!userid) return res.status(400).json({ message: 'userid is required' });

        const clearFilters = [{ userid }];
        if (mongoose.Types.ObjectId.isValid(userid)) {
            const userObjectId = new mongoose.Types.ObjectId(userid);
            clearFilters.push({ user: userObjectId });
            clearFilters.push({ user: userid });
        }

        await Cart.deleteMany({ $or: clearFilters });
        return res.json({ result: 'Done' });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to clear cart' });
    }
});

const placeOrderHandler = async (req, res) => {
    try {
        const {
            userId,
            paymentMethod,
            paymentStatus,
            paidAt,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            finalAmount,
            totalAmount,
            shippingAmount,
            gstAmount,
            discountAmount,
            giftWrapCharge,
            protectionCharge,
            ecoCharge,
            paymentFee,
            extraCharges,
            preDiscountTotal,
            shippingAddress,
            products,
                       couponCode,
            couponDiscount,
            deliverySpeed
        } = req.body;

        if (!userId || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'userId and products are required' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const cleanProducts = products.map((item) => {
            const normalizedQty = Number(
                item?.qty ??
                item?.quantity ??
                item?.count ??
                item?.orderedQty ??
                item?.cartQuantity ??
                1
            );
            const safeQty = Number.isFinite(normalizedQty) && normalizedQty > 0 ? normalizedQty : 1;
            const normalizedPrice = Number(item?.price || 0);

            return {
                productid: item.productid || item.id || item._id || '',
                name: item.name || 'Product',
                qty: safeQty,
                quantity: safeQty,
                price: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
                total: Number(item?.total ?? item?.lineTotal ?? (safeQty * (Number.isFinite(normalizedPrice) ? normalizedPrice : 0))),
                size: item.size || '',
                color: item.color || '',
                pic: item.pic || item.pic1 || ''
            };
        });

        const orderId = await generateOrderId();
        const orderDate = new Date();
        const estimatedArrival = new Date(orderDate);
 const deliveryDays = deliverySpeed === 'express' ? 2 : 5;
        estimatedArrival.setDate(orderDate.getDate() + deliveryDays);

        const total = Number(totalAmount ?? cleanProducts.reduce((sum, item) => sum + item.total, 0));
        const shipping = Number(shippingAmount ?? ((total > 0 && total < 1000) ? 150 : 0));
        const gst = Math.max(0, Number(gstAmount || 0));
        const baseDiscount = Math.max(0, Number(discountAmount || 0));
        const safeGiftWrapCharge = Math.max(0, Number(giftWrapCharge || 0));
        const safeProtectionCharge = Math.max(0, Number(protectionCharge || 0));
        const safeEcoCharge = Math.max(0, Number(ecoCharge || 0));
        const safePaymentFee = Math.max(0, Number(paymentFee || 0));
        const computedExtraCharges = safeGiftWrapCharge + safeProtectionCharge + safeEcoCharge + safePaymentFee;
        const safeExtraCharges = Math.max(0, Number(extraCharges ?? computedExtraCharges));
        const safePreDiscountTotal = Math.max(0, Number(preDiscountTotal ?? (total + shipping + gst + safeExtraCharges)));
        let validCouponCode = '';
        let validCouponDiscount = 0;

        if (couponCode) {
            const normalizedCouponCode = String(couponCode).trim().toUpperCase();
            const couponDoc = await Coupon.findOne({ code: normalizedCouponCode, isActive: true });
            if (!couponDoc) {
                return res.status(400).json({ message: 'Invalid coupon code.' });
            }

            const now = new Date();
            if (couponDoc.startsAt && now < couponDoc.startsAt) {
                return res.status(400).json({ message: 'Coupon is not active yet.' });
            }
            if (couponDoc.expiresAt && now > couponDoc.expiresAt) {
                return res.status(400).json({ message: 'Coupon has expired.' });
            }
            if (total < Number(couponDoc.minCartValue || 0)) {
                return res.status(400).json({ message: `Minimum cart value Rs${couponDoc.minCartValue} required for this coupon.` });
            }
            if (Number(couponDoc.totalUsageCap || 0) > 0) {
                const totalUsed = await Order.countDocuments({ couponCode: normalizedCouponCode });
                if (totalUsed >= Number(couponDoc.totalUsageCap)) {
                    return res.status(400).json({ message: 'Coupon usage limit reached.' });
                }
            }
            if (couponDoc.perUserOnce) {
                const userUsed = await Order.countDocuments({ userid: String(userId), couponCode: normalizedCouponCode });
                if (userUsed > 0) {
                    return res.status(400).json({ message: 'You have already used this coupon.' });
                }
            }
            if (couponDoc.firstOrderOnly) {
                const completedOrders = await Order.countDocuments({ userid: String(userId) });
                if (completedOrders > 0) {
                    return res.status(400).json({ message: 'This coupon is valid only on first order.' });
                }
            }

            if (couponDoc.type === 'percent') {
                validCouponDiscount = Math.round((total * Number(couponDoc.value || 0)) / 100);
                if (Number(couponDoc.maxDiscount || 0) > 0) {
                    validCouponDiscount = Math.min(validCouponDiscount, Number(couponDoc.maxDiscount));
                }
            } else {
                validCouponDiscount = Math.round(Number(couponDoc.value || 0));
            }

            validCouponDiscount = Math.max(0, Math.min(validCouponDiscount, total));
            validCouponCode = normalizedCouponCode;
        } else {
            validCouponDiscount = Math.max(0, Number(couponDiscount || 0));
        }

        const payable = Math.max(0, Number(finalAmount ?? (total + shipping - validCouponDiscount)));
        // const payable = Math.max(0, Number(finalAmount ?? (total + shipping + gst + safeExtraCharges - baseDiscount - validCouponDiscount)));

        const addressPayload = shippingAddress || {
            fullName: user.name || '',
            phone: user.phone || '',
            addressline1: user.addressline1 || '',
            city: user.city || '',
            state: user.state || '',
            pin: user.pin || '',
            country: 'India'
        };

        const orderDoc = await Order.create({
            orderId,
            userid: userId,
            userName: user.name || '',
            userEmail: user.email || '',
            paymentMethod: paymentMethod || 'COD',
            paymentStatus: paymentStatus || ((paymentMethod || 'COD') === 'COD' ? 'Pending' : 'Paid'),
            paidAt: paidAt || (((paymentMethod || 'COD') === 'COD') ? null : new Date()),
            razorpayOrderId: razorpayOrderId || '',
            razorpayPaymentId: razorpayPaymentId || '',
            razorpaySignature: razorpaySignature || '',
            orderStatus: 'Order Placed',
            totalAmount: total,
            shippingAmount: shipping,
            finalAmount: payable,
            couponCode: validCouponCode,
            couponDiscount: validCouponDiscount,
            discountAmount: baseDiscount,
            gstAmount: gst,
            giftWrapCharge: safeGiftWrapCharge,
            protectionCharge: safeProtectionCharge,
            ecoCharge: safeEcoCharge,
            paymentFee: safePaymentFee,
            extraCharges: safeExtraCharges,
            preDiscountTotal: safePreDiscountTotal,
            shippingAddress: addressPayload,
            products: cleanProducts,
            estimatedArrival,
            statusHistory: [{
                status: 'Ordered',
                timestamp: orderDate,
                message: 'Order placed successfully'
            }],
            orderDate
        });

        const nextTotalOrders = Number(user.totalOrders || 0) + 1;
        user.totalOrders = nextTotalOrders;
        if (!user.isManualMembership) {
            user.membershipType = getMembershipTypeFromOrders(nextTotalOrders);
        }
        await user.save();

        await Checkout.create({
            userid: userId,
            paymentmode: paymentMethod || 'COD',
            orderstatus: 'Order Placed',
            paymentstatus: paymentStatus || ((paymentMethod || 'COD') === 'COD' ? 'Pending' : 'Paid'),
            razorpayOrderId: razorpayOrderId || '',
            razorpayPaymentId: razorpayPaymentId || '',
            razorpaySignature: razorpaySignature || '',
            paidAt: paidAt || (((paymentMethod || 'COD') === 'COD') ? null : new Date()),
            totalAmount: total,
            shippingAmount: shipping,
            finalAmount: payable,
            couponCode: validCouponCode,
            couponDiscount: validCouponDiscount,
            discountAmount: baseDiscount,
            gstAmount: gst,
            giftWrapCharge: safeGiftWrapCharge,
            protectionCharge: safeProtectionCharge,
            ecoCharge: safeEcoCharge,
            paymentFee: safePaymentFee,
            extraCharges: safeExtraCharges,
            preDiscountTotal: safePreDiscountTotal,
            products: cleanProducts
        });

        const clearFilters = [{ userid: String(userId) }];
        if (mongoose.Types.ObjectId.isValid(String(userId))) {
            const userObjectId = new mongoose.Types.ObjectId(String(userId));
            clearFilters.push({ user: userObjectId });
            clearFilters.push({ user: String(userId) });
        }

        await Cart.deleteMany({ $or: clearFilters });

        let invoiceBuffer = null;
        if (FEATURE_INVOICE_SYSTEM) {
            try {
                invoiceBuffer = await generateInvoicePdfBuffer({
                    orderId,
                    userName: user.name,
                    userEmail: user.email,
                    paymentMethod: paymentMethod || 'COD',
                    paymentStatus: (paymentMethod || 'COD') === 'COD' ? 'Pending' : 'Paid',
                    finalAmount: payable,
                    totalAmount: total,
                    shippingAmount: shipping,
                    couponDiscount: validCouponDiscount,
                    discountAmount: baseDiscount,
                    gstAmount: gst,
                    giftWrapCharge: safeGiftWrapCharge,
                    protectionCharge: safeProtectionCharge,
                    ecoCharge: safeEcoCharge,
                    paymentFee: safePaymentFee,
                    extraCharges: safeExtraCharges,
                    preDiscountTotal: safePreDiscountTotal,
                    shippingAddress: addressPayload,
                    products: cleanProducts,
                    orderDate,
                    orderStatus: 'Order Placed',
                    pdfType: 'placed',
                    isDelivered: false
                });
            } catch (invoiceError) {
                console.error('Invoice PDF generation failed:', invoiceError.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(invoiceError);
            }
        }

        const recipientEmail = String(user.email || addressPayload?.email || '').trim();

        if (FEATURE_EMAIL_NOTIFICATIONS && recipientEmail) {
            try {
                await enqueueEmailJob('order-placed', {
                    toEmail: recipientEmail,
                    userId,
                    userName: user.name,
                    orderId,
                    paymentMethod: paymentMethod || 'COD',
                    paymentStatus: (paymentMethod || 'COD') === 'COD' ? 'Pending' : 'Paid',
                    finalAmount: payable,
                    totalAmount: total,
                    shippingAmount: shipping,
                    shippingAddress: addressPayload,
                    products: cleanProducts,
                    estimatedArrival,
                    orderDate,
                    invoiceBase64: invoiceBuffer ? invoiceBuffer.toString('base64') : null,
                    status: 'Order Placed'
                });
            } catch (emailErr) {
                console.warn(`⚠️ Order placed email queue failed for ${orderId}:`, emailErr.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(emailErr);
            }
        }

        // 📲 SEND WHATSAPP NOTIFICATION (if enabled)
        if (FEATURE_WHATSAPP_NOTIFICATIONS) {
            try {
                const phoneNumber = addressPayload?.phone || user.phone;

                console.log(`\n🔔 WhatsApp Notification Debug for Order ${orderId}:`);
                console.log(`   User: ${user.name} (${userId})`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Phone from profile: "${user.phone || 'NOT SET'}"`);
                console.log(`   Phone from address: "${addressPayload?.phone || 'NOT PROVIDED'}"`);
                console.log(`   Final phone: "${phoneNumber || 'MISSING'}"\n`);

                if (!phoneNumber) {
                    console.log(`ℹ️  WhatsApp SKIPPED - No phone number in profile. User should update profile at: https://eshopperr.me/profile\n`);
                } else {
                    const itemSummary = cleanProducts
                        .slice(0, 5)
                        .map((item, idx) => `   ${idx + 1}. ${item.name}\n      Qty: ${item.qty} | Rate: ₹${Number(item.price || 0).toLocaleString('en-IN')} | Subtotal: ₹${Number(item.total || 0).toLocaleString('en-IN')}`)
                        .join('\n');

                    const savedAmount = total - payable;
                    const discountInfo = savedAmount > 0 ? `\n💰 Total Savings: ₹${Number(savedAmount).toLocaleString('en-IN')}` : '';
                    const estimatedDays = 5; // Default 5 days delivery
                    const deliveryDate = new Date();
                    deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);
                    const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                    const whatsappMsg = `✨ LUXURY EXPERIENCE STARTS NOW! 💎\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nHello ${(user.name || 'Valued Customer').split(' ')[0]} 👋\nThank you for your exquisite order!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ ORDER CONFIRMED\nOrder ID: #${orderId}\nOrder Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n📦 YOUR PREMIUM ITEMS:\n${itemSummary}${cleanProducts.length > 5 ? `\n   + ${cleanProducts.length - 5} more exclusive item(s)` : ''}\n\n💹 ORDER BREAKDOWN:\n   Subtotal: ₹${Number(total || 0).toLocaleString('en-IN')}${discountInfo}\n   Shipping: ₹${Number(shipping || 0).toLocaleString('en-IN')}\n   ─────────────────────────────\n   Final Amount: ₹${Number(payable || 0).toLocaleString('en-IN')} 💳\n\n💳 PAYMENT: ${paymentMethod === 'COD' ? 'Cash on Delivery' : paymentMethod || 'Card'}\n\n📅 ESTIMATED DELIVERY: ${formattedDeliveryDate}\n\n🎯 NEXT STEPS:\n✓ We're preparing your premium selection\n✓ Expert packaging with care\n✓ Fast & secure delivery\n\n🔗 TRACK: https://eshopperr.me/order-tracking/${orderId}\n\n🙏 Thank you for your business!\nEshopper Boutique Luxe`;

                    try {
                        console.log(`📤 Sending WhatsApp to ${phoneNumber} for order ${orderId}`);
                        await sendWhatsApp(phoneNumber, whatsappMsg);
                        console.log(`✅ WhatsApp sent for order ${orderId}`);
                    } catch (waErr) {
                        if (isExpectedWhatsAppError(waErr)) {
                            console.log(`ℹ️  WhatsApp skipped for ${orderId}:`, waErr.message);
                        } else {
                            console.error(`⚠️  WhatsApp failed for ${orderId}:`, waErr.message);
                            if (process.env.SENTRY_DSN) Sentry.captureException(waErr);
                        }
                    }
                }
            } catch (waError) {
                if (isExpectedWhatsAppError(waError)) {
                    console.log(`ℹ️  Order WhatsApp skipped (expected) for ${orderId}:`, waError.message);
                } else {
                    console.error(`⚠️  Order WhatsApp failed for ${orderId}:`, waError.message);
                    if (process.env.SENTRY_DSN) Sentry.captureException(waError);
                }
            }
        }

        // 🔴 EMIT REAL-TIME DASHBOARD UPDATE VIA SOCKET.IO
        const io = req.app.get('io');
        if (io) {
            io.emit('newOrder', {
                orderId: orderDoc.orderId,
                amount: orderDoc.finalAmount,
                timestamp: new Date()
            });
            io.emit('dashboardUpdate', { type: 'newOrder', timestamp: new Date() });
            console.log(`📡 Socket.io: Dashboard update emitted for new order ${orderId}`);
        }
        return res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order: orderDoc
        });
    } catch (e) {
        console.error('❌ Place Order Error:', e.message);
        if (process.env.SENTRY_DSN) Sentry.captureException(e);
        return res.status(500).json({ message: 'Failed to place order' });
    }
};

app.post('/api/place-order', placeOrderHandler);
app.post('/api/orders', placeOrderHandler);

app.get('/api/razorpay/config', (req, res) => {
    return res.json({ success: true, ...getRazorpayConfigPayload() });
});

app.post('/api/razorpay/create-order', async (req, res) => {
    try {

        const amountRaw = req.body?.amount;
        const amount = Number(amountRaw);
        const currency = String(req.body?.currency || 'INR').toUpperCase();
        const paymentMethod = String(req.body?.paymentMethod || 'Razorpay');
        let receipt = String(req.body?.receipt || buildRazorpayReceipt(req.body?.userId || 'payment'));
        // Razorpay receipt max length = 40
        if (receipt.length > 40) {
            receipt = receipt.substring(0, 40);
        }

        // Debug log for incoming amount
        console.log('[Razorpay] Received create-order:', {
            amountRaw,
            amount,
            currency,
            paymentMethod,
            receipt,
            body: req.body
        });

        if (!Number.isFinite(amount) || amount <= 0) {
            console.error('[Razorpay] Invalid payment amount:', amountRaw, amount);
            return res.status(400).json({
                success: false,
                message: 'Invalid payment amount. Please refresh checkout and try again.',
                meta: {
                    receivedAmount: amountRaw
                }
            });
        }

        try {
            const order = await createRazorpayOrder({ amount, currency, receipt, paymentMethod });
            return res.json({ success: true, order, keyId: RAZORPAY_KEY_ID, currency });
        } catch (razorpayError) {
            // Log full Razorpay error response if available
            if (razorpayError.response) {
                console.error('❌ Razorpay API error:', {
                    status: razorpayError.response.status,
                    data: razorpayError.response.data,
                    headers: razorpayError.response.headers
                });
            } else {
                console.error('❌ Razorpay create-order error:', razorpayError.message, razorpayError);
            }
            return res.status(razorpayError.status || razorpayError.response?.status || 500).json({
                success: false,
                message: razorpayError.response?.data?.error?.description || razorpayError.message || 'Failed to create Razorpay order',
                meta: razorpayError.response?.data || {}
            });
        }
    } catch (error) {
        console.error('❌ Razorpay create-order error:', error.message, error);
        return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to create Razorpay order' });
    }
});

app.post('/api/razorpay/verify-payment', (req, res) => {
    try {
        const result = verifyRazorpaySignature(req.body || {});
        if (!result.verified) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.json({ success: true, message: 'Payment verified successfully' });
    } catch (error) {
        console.error('❌ Razorpay verify-payment error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to verify Razorpay payment' });
    }
});

app.get('/api/membership/check', async (req, res) => {
    try {
        const userId = String(req.query.userId || req.query.id || req.query.userid || '').trim();
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID required.' });
        }

        let user = null;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId).select('membershipType totalOrders isManualMembership name email');
        }
        if (!user) {
            user = await User.findOne({ $or: [{ userid: userId }, { id: userId }] }).select('membershipType totalOrders isManualMembership name email');
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Reconcile legacy users by considering both Order and Checkout collections.
        const storedOrders = Number(user.totalOrders || 0);
        const [actualOrders, checkoutOrders] = await Promise.all([
            Order.countDocuments({ userid: String(user._id) }),
            Checkout.countDocuments({ userid: String(user._id) })
        ]);
        const totalOrders = Math.max(
            storedOrders,
            Number(actualOrders || 0),
            Number(checkoutOrders || 0)
        );
        const computedMembershipType = getMembershipTypeFromOrders(totalOrders);

        if (totalOrders !== storedOrders || (!user.isManualMembership && user.membershipType !== computedMembershipType)) {
            user.totalOrders = totalOrders;
            if (!user.isManualMembership) {
                user.membershipType = computedMembershipType;
            }
            await user.save();
        }

        res.json({
            success: true,
            userId: user._id,
            name: user.name,
            email: user.email,
            membershipType: user.isManualMembership ? user.membershipType : computedMembershipType,
            totalOrders
        });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed to fetch membership.' });
    }
});

app.put('/api/admin/users/:id/membership', async (req, res) => {
    try {
        const { id } = req.params;
        const { membershipType } = req.body;
        if (!id || !membershipType) {
            return res.status(400).json({ success: false, message: 'User ID and membershipType required.' });
        }

        const normalizedType = String(membershipType).trim();
        if (!['Silver', 'Gold', 'Elite'].includes(normalizedType)) {
            return res.status(400).json({ success: false, message: 'Invalid membership type.' });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        user.membershipType = normalizedType;
        user.isManualMembership = true;
        if (normalizedType === 'Elite' && Number(user.totalOrders || 0) < 10) {
            user.totalOrders = 10;
        } else if (normalizedType === 'Gold' && Number(user.totalOrders || 0) < 5) {
            user.totalOrders = 5;
        }
        await user.save();

        res.json({
            success: true,
            user: {
                ...user.toJSON(),
                membershipType: user.membershipType,
                totalOrders: user.totalOrders
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed to update membership.' });
    }
});

// ==================== COMPATIBILITY API ALIASES ====================

// --- ADDRESS MANAGEMENT ROUTES ---
app.get('/api/user/:id/addresses', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        
        res.json({ addresses: user.addresses || [] });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

app.post('/api/user/:id/addresses', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        
        if (!user.addresses) user.addresses = [];
        user.addresses.push(req.body);
        await user.save();
        
        res.status(201).json({ message: "Address added successfully", addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

app.put('/api/user/:id/addresses/:addressId', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const address = user.addresses.id(req.params.addressId);
        if (!address) return res.status(404).json({ message: "Address not found" });

        address.set(req.body);
        await user.save();
        res.json({ message: "Address updated successfully", addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

app.delete('/api/user/:id/addresses/:addressId', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.addresses.pull({ _id: req.params.addressId });
        await user.save();
        res.json({ message: "Address deleted successfully", addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// These aliases keep legacy frontend calls working without 404 errors.
app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { password, otp, otpExpires, failedAttempts, lockUntil, ...safeUser } = user.toJSON();
        res.json(safeUser);
    } catch (e) {
        res.status(500).json({ message: 'Failed to fetch user' });
    }
});

app.get('/api/user', async (req, res) => {
    try {
        const userId = req.query.id || req.query.userid;
        if (!userId) return res.status(400).json({ message: 'User id is required in query (?id=...)' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { password, otp, otpExpires, failedAttempts, lockUntil, ...safeUser } = user.toJSON();
        // Add 'id' field for frontend compatibility (frontend expects both id and _id)
        const userWithId = { ...safeUser, id: safeUser._id };
        res.json(userWithId);
    } catch (e) {
        console.error('❌ GetUser error:', e.message);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const query = String(req.query.query || '').toLowerCase().trim();
        const limit = Math.max(1, Math.min(24, Number(req.query.limit) || 6));

        const products = await Product.find().sort({ _id: -1 }).lean();

        const normalized = products.map((p) => {
            const data = typeof p.toObject === 'function' ? p.toObject() : p;
            return {
                ...data,
                pic1: sanitizeCloudinaryUrl(data.pic1),
                pic2: sanitizeCloudinaryUrl(data.pic2),
                pic3: sanitizeCloudinaryUrl(data.pic3),
                pic4: sanitizeCloudinaryUrl(data.pic4),
                image: sanitizeCloudinaryUrl(data.pic1 || data.pic2 || data.pic3 || data.pic4)
            };
        });

        const filtered = query
            ? normalized.filter((item) => {
                const bag = `${item.name || ''} ${item.maincategory || ''} ${item.subcategory || ''} ${item.brand || ''}`.toLowerCase();
                return bag.includes(query);
            })
            : normalized;

        res.json({ products: filtered.slice(0, limit) });
    } catch (e) {
        res.status(500).json({ message: 'Failed to fetch products', products: [] });
    }
});



const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
    try {
        console.log(`🚀 Server boot config -> PORT: ${PORT}`);
        await mongoose.connect(MONGO_URI, {
            dbName: process.env.DB_NAME || 'eshoper',
            autoIndex: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority'
        });

        console.log("✅ MongoDB connected successfully");
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`🔗 State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

        // 🔴 Trimming to ensure no space/newline error
        // --- server.js AI REFACTOR START ---
        const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
        const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
        let cachedChatCatalog = "";
        let cachedChatCatalogAt = 0;
        const CHAT_CATALOG_TTL_MS = 5 * 60 * 1000;
        let cachedGenerateModels = [];
        let cachedAt = 0;
        const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
        const modelCooldownUntil = new Map();

        const isDev = process.env.NODE_ENV === 'development';
        const devLog = (msg) => { if (isDev) console.log(`[DEV] ${msg}`); };
        const devWarn = (msg) => { if (isDev) console.warn(`[DEV] ${msg}`); };

        const getAvailableGeminiModels = async () => {
            const now = Date.now();
            if (cachedGenerateModels.length > 0 && (now - cachedAt) < MODEL_CACHE_TTL_MS) {
                return cachedGenerateModels;
            }

            try {
                const response = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
                    headers: {
                        'x-goog-api-key': geminiApiKey
                    }
                });
                const models = (response.data?.models || [])
                    .filter((model) => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
                    .map((model) => String(model.name || '').replace(/^models\//, '').trim())
                    .filter(Boolean);

                if (models.length > 0) {
                    cachedGenerateModels = models;
                    cachedAt = now;
                    console.log(`✅ Gemini models discovered: ${models.slice(0, 5).join(', ')}${models.length > 5 ? '...' : ''}`);
                }

                return models;
            } catch (modelListError) {
                devWarn(`Could not fetch Gemini model list: ${modelListError.message}`);
                return [];
            }
        };

        const extractGeminiText = (data) => {
            const candidates = data?.candidates || [];
            const first = candidates[0];
            const parts = first?.content?.parts || [];
            const text = parts.map((part) => part?.text || '').join('').trim();
            return text;
        };

        const isQuotaError = (error) => {
            const combined = `${error?.message || ''} ${JSON.stringify(error?.response?.data || {})}`.toLowerCase();
            return error?.response?.status === 429 || combined.includes('quota exceeded') || combined.includes('too many requests');
        };

        const extractRetryDelayMs = (error) => {
            const combined = `${error?.message || ''} ${JSON.stringify(error?.response?.data || {})}`;
            const match = combined.match(/retry in\s+([\d.]+)s/i);
            if (!match) return 60000;
            const sec = Number(match[1]);
            if (!Number.isFinite(sec) || sec <= 0) return 60000;
            return Math.ceil(sec * 1000);
        };

        const isModelCoolingDown = (modelName) => {
            const until = modelCooldownUntil.get(modelName);
            if (!until) return false;
            if (Date.now() >= until) {
                modelCooldownUntil.delete(modelName);
                return false;
            }
            return true;
        };

        const setModelCooldown = (modelName, error) => {
            const retryMs = extractRetryDelayMs(error);
            modelCooldownUntil.set(modelName, Date.now() + retryMs);
            devLog(`Cooling down model ${modelName} for ${Math.ceil(retryMs / 1000)}s due to rate limit`);
        };

        const generateWithRest = async (modelName, fullPrompt) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
            const payload = {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: fullPrompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 300
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiApiKey
                }
            });

            return extractGeminiText(response.data);
        };

        const getChatCatalogSummary = async () => {
            const now = Date.now();
            if (cachedChatCatalog && (now - cachedChatCatalogAt) < CHAT_CATALOG_TTL_MS) {
                return cachedChatCatalog;
            }

            const allProducts = await Product.find({}, 'name baseprice maincategory');
            cachedChatCatalog = allProducts
                .map(p => `- ${p.name} | ${p.maincategory || 'General'} | Rs.${p.baseprice}`)
                .slice(0, 18)
                .join("\n");
            cachedChatCatalogAt = now;
            return cachedChatCatalog;
        };

        // 🔴 REAL-TIME ORDER TRACKING - Get single order
        app.get('/api/orders/:userId', async (req, res) => {
            try {
                const userId = String(req.params.userId || '').trim();

                if (!userId) {
                    return res.status(400).json({ message: 'userId is required' });
                }

                // 🔴 FETCH FROM ORDER COLLECTION (primary source)
                const orders = await Order.find({ userid: userId })
                    .sort({ updatedAt: -1, createdAt: -1 })
                    .select('orderId orderStatus finalAmount paymentStatus paymentMethod updatedAt createdAt products shippingAmount totalAmount estimatedArrival deliverySchedule statusHistory deliveryOtp deliveryOtpSentAt deliveryOtpExpiresAt deliveryOtpVerifiedAt couponCode couponDiscount discountAmount gstAmount giftWrapCharge protectionCharge ecoCharge paymentFee extraCharges preDiscountTotal')
                    .lean();

                const hydratedOrders = await Promise.all(
                    orders.map(async (item) => {
                        try {
                            return await ensureOutForDeliveryOtp(item);
                        } catch {
                            return item;
                        }
                    })
                );

                // 🔴 MERGE WITH CHECKOUT COLLECTION (sync fallback - in case of manual DB updates)
                if (orders.length === 0) {
                    const checkoutOrders = await Checkout.find({ userid: userId })
                        .sort({ updatedAt: -1, createdAt: -1 })
                        .lean();

                    return res.json({
                        success: true,
                        orders: checkoutOrders.map((item) => ({
                            orderId: item.orderId || `CHECKOUT-${item._id}`,
                            orderStatus: item.orderstatus || 'Order Placed',
                            totalAmount: Number(item.totalAmount || 0),
                            shippingAmount: Number(item.shippingAmount || 0),
                            finalAmount: Number(item.finalAmount || 0),
                            couponCode: item.couponCode || '',
                            couponDiscount: Number(item.couponDiscount || 0),
                            discountAmount: Number(item.discountAmount || 0),
                            gstAmount: Number(item.gstAmount || 0),
                            giftWrapCharge: Number(item.giftWrapCharge || 0),
                            protectionCharge: Number(item.protectionCharge || 0),
                            ecoCharge: Number(item.ecoCharge || 0),
                            paymentFee: Number(item.paymentFee || 0),
                            extraCharges: Number(item.extraCharges || 0),
                            preDiscountTotal: Number(item.preDiscountTotal || 0),
                            paymentStatus: item.paymentstatus || 'Pending',
                            paymentMethod: item.paymentmode || 'COD',
                            createdAt: item.createdAt || item.updatedAt || new Date(),
                            updatedAt: item.updatedAt || item.createdAt || new Date(), orderItems: normalizeOrderProducts(item.products),
                            estimatedDelivery: item.estimatedArrival || null,
                            estimatedArrival: item.estimatedArrival || null,
                            deliverySchedule: item.deliverySchedule || null,
                            statusHistory: Array.isArray(item.statusHistory) ? item.statusHistory : [],
                            deliveryOtp: item.deliveryOtp || '',
                            deliveryOtpSentAt: item.deliveryOtpSentAt || null,
                            deliveryOtpExpiresAt: item.deliveryOtpExpiresAt || null,
                            deliveryOtpVerifiedAt: item.deliveryOtpVerifiedAt || null
                        }))
                    });
                }

                return res.json({
                    success: true,
                    orders: hydratedOrders.map((item) => ({
                        orderId: item.orderId,
                        orderStatus: item.orderStatus || 'Order Placed',
                        totalAmount: Number(item.totalAmount || 0),
                        shippingAmount: Number(item.shippingAmount || 0),
                        finalAmount: Number(item.finalAmount || 0),
                        couponCode: item.couponCode || '',
                        couponDiscount: Number(item.couponDiscount || 0),
                        discountAmount: Number(item.discountAmount || 0),
                        gstAmount: Number(item.gstAmount || 0),
                        giftWrapCharge: Number(item.giftWrapCharge || 0),
                        protectionCharge: Number(item.protectionCharge || 0),
                        ecoCharge: Number(item.ecoCharge || 0),
                        paymentFee: Number(item.paymentFee || 0),
                        extraCharges: Number(item.extraCharges || 0),
                        preDiscountTotal: Number(item.preDiscountTotal || 0),
                        paymentStatus: item.paymentStatus || 'Pending',
                        paymentMethod: item.paymentMethod || 'COD',
                        createdAt: item.createdAt || item.updatedAt || new Date(),
                        updatedAt: item.updatedAt || new Date(),
                        orderItems: normalizeOrderProducts(item.products),
                        estimatedDelivery: item.estimatedArrival || null,
                        estimatedArrival: item.estimatedArrival || null,
                        deliverySchedule: item.deliverySchedule || null,
                        statusHistory: Array.isArray(item.statusHistory) ? item.statusHistory : [],
                        deliveryOtp: item.deliveryOtp || '',
                        deliveryOtpSentAt: item.deliveryOtpSentAt || null,
                        deliveryOtpExpiresAt: item.deliveryOtpExpiresAt || null,
                        deliveryOtpVerifiedAt: item.deliveryOtpVerifiedAt || null
                    }))
                });
            } catch (e) {
                console.error('❌ Orders list fetch error:', e.message);
                return res.status(500).json({ message: 'Failed to fetch orders' });
            }
        });

        app.get('/api/orders/recent/:userId', async (req, res) => {
            try {
                const userId = String(req.params.userId || '').trim();
                const limit = Math.max(1, Math.min(10, Number(req.query.limit) || 5));

                if (!userId) {
                    return res.status(400).json({ message: 'userId is required' });
                }

                const orders = await Order.find({ userid: userId })
                    .sort({ updatedAt: -1, createdAt: -1 })
                    .limit(limit)
                    .select('orderId orderStatus finalAmount updatedAt createdAt')
                    .lean();

                return res.json({
                    success: true,
                    orders: orders.map((item) => ({
                        orderId: item.orderId,
                        orderStatus: item.orderStatus || 'Order Placed',
                        finalAmount: Number(item.finalAmount || 0),
                        updatedAt: item.updatedAt || item.createdAt || new Date()
                    }))
                });
            } catch (e) {
                console.error('❌ Recent orders fetch error:', e.message);
                return res.status(500).json({ message: 'Failed to fetch recent orders' });
            }
        });

        app.get('/api/order/:orderId', async (req, res) => {
            try {
                const { orderId } = req.params;
                const userId = req.query.userId;

                if (!orderId || !userId) {
                    return res.status(400).json({ message: 'orderId and userId are required' });
                }

                const order = await Order.findOne({
                    orderId,
                    userid: userId
                }).lean();

                if (!order) return res.status(404).json({ message: 'Order not found' });

                const ensuredOrder = await ensureOutForDeliveryOtp(order).catch(() => order);

                // 📦 Build comprehensive order response
                const statusHistory = Array.isArray(ensuredOrder.statusHistory) ? ensuredOrder.statusHistory : [
                    { status: 'Ordered', timestamp: ensuredOrder.orderDate || ensuredOrder.createdAt || new Date() }
                ];

                const normalizedProducts = normalizeOrderProducts(ensuredOrder.products);

                return res.json({
                    orderId: ensuredOrder.orderId,
                    userid: ensuredOrder.userid,
                    orderStatus: ensuredOrder.orderStatus || 'Ordered',
                    userName: ensuredOrder.userName || '',
                    userEmail: ensuredOrder.userEmail || '',
                    paymentMethod: ensuredOrder.paymentMethod || 'COD',
                    paymentStatus: ensuredOrder.paymentStatus || 'Pending',
                    totalAmount: Number(ensuredOrder.totalAmount || 0),
                    shippingAmount: Number(ensuredOrder.shippingAmount || 0),
                    finalAmount: ensuredOrder.finalAmount || 0,
                    couponCode: ensuredOrder.couponCode || '',
                    couponDiscount: Number(ensuredOrder.couponDiscount || 0),
                    discountAmount: Number(ensuredOrder.discountAmount || 0),
                    gstAmount: Number(ensuredOrder.gstAmount || 0),
                    giftWrapCharge: Number(ensuredOrder.giftWrapCharge || 0),
                    protectionCharge: Number(ensuredOrder.protectionCharge || 0),
                    ecoCharge: Number(ensuredOrder.ecoCharge || 0),
                    paymentFee: Number(ensuredOrder.paymentFee || 0),
                    extraCharges: Number(ensuredOrder.extraCharges || 0),
                    preDiscountTotal: Number(ensuredOrder.preDiscountTotal || 0),
                    shippingAddress: ensuredOrder.shippingAddress || {},
                    products: normalizedProducts,
                    deliverySchedule: ensuredOrder.deliverySchedule || null,
                    deliveryOtp: ensuredOrder.deliveryOtp || '',
                    deliveryOtpSentAt: ensuredOrder.deliveryOtpSentAt || null,
                    deliveryOtpExpiresAt: ensuredOrder.deliveryOtpExpiresAt || null,
                    deliveryOtpVerifiedAt: ensuredOrder.deliveryOtpVerifiedAt || null,
                    estimatedDelivery: ensuredOrder.estimatedArrival || null,
                    estimatedArrival: ensuredOrder.estimatedArrival || null,
                    statusHistory: statusHistory,
                    createdAt: ensuredOrder.orderDate || ensuredOrder.createdAt || new Date(),
                    orderDate: ensuredOrder.orderDate || ensuredOrder.createdAt,
                    updatedAt: ensuredOrder.updatedAt || ensuredOrder.createdAt || new Date()
                });
            } catch (e) {
                console.error('❌ Order fetch error:', e.message);
                return res.status(500).json({ message: 'Failed to fetch order' });
            }
        });

        app.get('/api/order/:orderId/invoice', async (req, res) => {
            try {
                const { orderId } = req.params;
                const userId = String(req.query.userId || '').trim();
                const disposition = String(req.query.disposition || '').toLowerCase() === 'inline' ? 'inline' : 'attachment';
                const requestedType = String(req.query.type || '').trim().toLowerCase();

                if (!orderId) {
                    return res.status(400).json({ success: false, message: 'orderId is required' });
                }

                let order = null;
                if (userId) {
                    order = await Order.findOne({ orderId, userid: userId }).lean();
                }
                if (!order) {
                    // Fallback for legacy invoice links that may not include userId.
                    order = await Order.findOne({ orderId }).lean();
                }
                if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

                const orderStatus = String(order.orderStatus || order.status || 'Ordered').trim().toLowerCase();
                const isDelivered = orderStatus === 'delivered';
                const pdfType = requestedType === 'final'
                    ? 'final'
                    : requestedType === 'confirmation'
                        ? 'confirmation'
                        : requestedType === 'placed'
                            ? 'placed'
                            : (isDelivered ? 'final' : (orderStatus.includes('confirm') ? 'confirmation' : 'placed'));

                const pdfBuffer = await generateInvoicePdfBuffer({
                    orderId: order.orderId,
                    userName: order.userName,
                    userEmail: order.userEmail,
                    paymentMethod: order.paymentMethod,
                    paymentStatus: order.paymentStatus,
                    finalAmount: Number(order.finalAmount || 0),
                    totalAmount: Number(order.totalAmount || 0),
                    shippingAmount: Number(order.shippingAmount || 0),
                    couponDiscount: Number(order.couponDiscount || 0),
                    discountAmount: Number(order.discountAmount || 0),
                    gstAmount: Number(order.gstAmount || 0),
                    giftWrapCharge: Number(order.giftWrapCharge || 0),
                    protectionCharge: Number(order.protectionCharge || 0),
                    ecoCharge: Number(order.ecoCharge || 0),
                    paymentFee: Number(order.paymentFee || 0),
                    extraCharges: Number(order.extraCharges || 0),
                    preDiscountTotal: Number(order.preDiscountTotal || 0),
                    shippingAddress: order.shippingAddress || {},
                    products: normalizeOrderProducts(order.products),
                    orderDate: order.orderDate || order.createdAt,
                    orderStatus: order.orderStatus || order.status || 'Ordered',
                    pdfType,
                    isDelivered
                });

                const fileName = isDelivered ? `TaxInvoice-${order.orderId}.pdf` : `Receipt-${order.orderId}.pdf`;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
                res.setHeader('Content-Length', String(pdfBuffer.length));
                return res.send(pdfBuffer);
            } catch (e) {
                console.error('❌ User invoice download error:', e.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(e);
                return res.status(500).json({ success: false, message: 'Failed to generate invoice' });
            }
        });

        // 🔴 ADMIN ANALYTICS/TESING ROUTES (delegate to unified controller payload)
        app.get('/api/admin/dashboard-analytics', (req, res) => {
            const adminController = require('./controllers/adminController');
            return adminController.getDashboardAnalytics(req, res);
        });

        // 🔴 TEST ENDPOINT FOR DATABASE CONNECTION
        app.get('/api/admin/test-connection', (req, res) => {
            const adminController = require('./controllers/adminController');
            return adminController.testConnection(req, res);
        });

        // 🔴 ADMIN - GET ALL ORDERS (for admin dashboard)
        app.get('/api/admin/orders', async (req, res) => {
            try {
                const page = Math.max(1, Number(req.query.page) || 1);
                const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));

                const search = String(req.query.search || '').trim();
                const statusFilter = String(req.query.status || '').trim();
                const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : null;
                const toDate = req.query.toDate ? new Date(req.query.toDate) : null;
                const customer = String(req.query.customer || '').trim();
                const paymentStatus = String(req.query.paymentStatus || '').trim();

                let query = {};

                // Search by orderId, userName, or userEmail (case-insensitive, partial match, ignore spaces)
                if (search) {
                    const safeSearch = String(search).replace(/\s+/g, ' ').trim();
                    query.$or = [
                        { orderId: { $regex: safeSearch, $options: 'i' } },
                        { userEmail: { $regex: safeSearch, $options: 'i' } },
                        { email: { $regex: safeSearch, $options: 'i' } }
                    ];
                }


                // Filter by status
                if (statusFilter && ALLOWED_ORDER_STATUS.includes(statusFilter)) {
                    query.orderStatus = statusFilter;
                }

                // Filter by payment status (case-insensitive)
                if (paymentStatus) {
                    query.paymentStatus = { $regex: `^${paymentStatus}$`, $options: 'i' };
                }

                // Filter by date range (createdAt)
                if (fromDate || toDate) {
                    query.createdAt = {};
                    if (fromDate) query.createdAt.$gte = fromDate;
                    if (toDate) {
                        toDate.setHours(23, 59, 59, 999);
                        query.createdAt.$lte = toDate;
                    }
                }

                const skip = (page - 1) * limit;
                const totalOrders = await Order.countDocuments(query);
                const orders = await Order.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .select('orderId userid userName userEmail orderStatus paymentStatus finalAmount updatedAt createdAt products deliverySchedule deliveryOtp deliveryOtpSentAt deliveryOtpExpiresAt deliveryOtpVerifiedAt couponCode couponDiscount giftWrapCharge protectionCharge ecoCharge extraCharges deliverySpeed').lean();

                const hydratedOrders = await Promise.all(
                    orders.map(async (item) => {
                        try {
                            return await ensureOutForDeliveryOtp(item);
                        } catch {
                            return item;
                        }
                    })
                );

                return res.json({
                    success: true,
                    total: totalOrders,
                    page,
                    limit,
                    pages: Math.ceil(totalOrders / limit),
                    orders: hydratedOrders.map((item) => ({
                        orderId: item.orderId,
                        userId: item.userid,
                        userName: item.userName || 'N/A',
                        userEmail: item.userEmail || 'N/A',
                        orderStatus: item.orderStatus || 'Order Placed',
                        paymentStatus: item.paymentStatus || 'Pending',
                        finalAmount: Number(item.finalAmount || 0),
                        deliverySchedule: item.deliverySchedule || null,
                        deliveryOtp: item.deliveryOtp || '',
                        deliveryOtpSentAt: item.deliveryOtpSentAt || null,
                        deliveryOtpExpiresAt: item.deliveryOtpExpiresAt || null,
                        deliveryOtpVerifiedAt: item.deliveryOtpVerifiedAt || null,
                        productCount: normalizeOrderProducts(item.products).reduce((sum, product) => sum + Number(product.quantity || 0), 0),
                        updatedAt: item.updatedAt || item.createdAt || new Date(),
                        couponCode: item.couponCode || '',
                        couponDiscount: Number(item.couponDiscount || 0),
                        giftWrapCharge: Number(item.giftWrapCharge || 0),
                        protectionCharge: Number(item.protectionCharge || 0),
                        ecoCharge: Number(item.ecoCharge || 0),
                        extraCharges: Number(item.extraCharges || 0),
                        deliverySpeed: item.deliverySpeed || ''
                    }))
                });
            } catch (e) {
                console.error('❌ Admin orders fetch error:', e.message);
                return res.status(500).json({ message: 'Failed to fetch orders' });
            }
        });

        app.get('/api/admin/invoices', async (req, res) => {
            try {
                const adminSecret = req.headers['x-admin-secret'] || req.query.adminSecret;
                if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
                    return res.status(403).json({ success: false, message: 'Unauthorized' });
                }

                const page = Math.max(1, Number(req.query.page) || 1);
                const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
                const search = String(req.query.search || '').trim();

                const query = {};
                if (search) {
                    query.$or = [
                        { orderId: { $regex: search, $options: 'i' } },
                        { userName: { $regex: search, $options: 'i' } },
                        { userEmail: { $regex: search, $options: 'i' } }
                    ];
                }

                const skip = (page - 1) * limit;
                const total = await Order.countDocuments(query);
                const orders = await Order.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .select('orderId userid userName userEmail orderStatus paymentStatus finalAmount createdAt updatedAt')
                    .lean();

                return res.json({
                    success: true,
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                    invoices: orders.map((o) => ({
                        orderId: o.orderId,
                        userId: o.userid,
                        userName: o.userName || 'N/A',
                        userEmail: o.userEmail || 'N/A',
                        orderStatus: o.orderStatus || 'Ordered',
                        paymentStatus: o.paymentStatus || 'Pending',
                        finalAmount: Number(o.finalAmount || 0),
                        invoiceType: String(o.orderStatus || '').toLowerCase() === 'delivered' ? 'Tax Invoice' : 'Receipt',
                        createdAt: o.createdAt,
                        updatedAt: o.updatedAt || o.createdAt
                    }))
                });
            } catch (e) {
                console.error('❌ Admin invoices fetch error:', e.message);
                return res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
            }
        });

        app.get('/api/admin/invoices/:orderId/download', async (req, res) => {
            try {
                const adminSecret = req.headers['x-admin-secret'] || req.query.adminSecret;
                if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
                    return res.status(403).json({ success: false, message: 'Unauthorized' });
                }

                const { orderId } = req.params;
                if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });

                const order = await Order.findOne({ orderId }).lean();
                if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

                const orderStatus = String(order.orderStatus || order.status || 'Ordered').trim().toLowerCase();
                const isDelivered = orderStatus === 'delivered';
                const pdfType = isDelivered ? 'final' : 'receipt';

                const pdfBuffer = await generateInvoicePdfBuffer({
                    orderId: order.orderId,
                    userName: order.userName,
                    userEmail: order.userEmail,
                    paymentMethod: order.paymentMethod,
                    paymentStatus: order.paymentStatus,
                    finalAmount: Number(order.finalAmount || 0),
                    totalAmount: Number(order.totalAmount || 0),
                    shippingAmount: Number(order.shippingAmount || 0),
                    couponDiscount: Number(order.couponDiscount || 0),
                    discountAmount: Number(order.discountAmount || 0),
                    gstAmount: Number(order.gstAmount || 0),
                    giftWrapCharge: Number(order.giftWrapCharge || 0),
                    protectionCharge: Number(order.protectionCharge || 0),
                    ecoCharge: Number(order.ecoCharge || 0),
                    paymentFee: Number(order.paymentFee || 0),
                    extraCharges: Number(order.extraCharges || 0),
                    preDiscountTotal: Number(order.preDiscountTotal || 0),
                    shippingAddress: order.shippingAddress || {},
                    products: normalizeOrderProducts(order.products),
                    orderDate: order.orderDate || order.createdAt,
                    orderStatus: order.orderStatus || order.status || 'Ordered',
                    pdfType,
                    isDelivered
                });

                const fileName = `TaxInvoice-${order.orderId}.pdf`;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                res.setHeader('Content-Length', String(pdfBuffer.length));
                return res.send(pdfBuffer);
            } catch (e) {
                console.error('❌ Admin invoice download error:', e.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(e);
                return res.status(500).json({ success: false, message: 'Failed to generate invoice' });
            }
        });

        // 🔴 ADMIN - GET DETAILED ORDER
        app.get('/api/admin/order/:orderId', async (req, res) => {
            try {
                const { orderId } = req.params;

                // 🔒 SECURITY: Verify admin role
                const adminSecret = req.headers['x-admin-secret'] || req.body.adminSecret;
                if (adminSecret !== process.env.ADMIN_SECRET && process.env.ADMIN_SECRET) {
                    return res.status(403).json({
                        message: 'Unauthorized - Admin access required',
                        success: false
                    });
                }

                if (!orderId) {
                    return res.status(400).json({ message: 'orderId is required' });
                }

                const order = await Order.findOne({ orderId }).lean();

                if (!order) return res.status(404).json({ message: 'Order not found' });

                const ensuredOrder = await ensureOutForDeliveryOtp(order).catch(() => order);

                return res.json({
                    success: true,
                    orderId: ensuredOrder.orderId,
                    userid: ensuredOrder.userid,
                    userName: ensuredOrder.userName || 'N/A',
                    userEmail: ensuredOrder.userEmail || 'N/A',
                    orderStatus: ensuredOrder.orderStatus || 'Ordered',
                    paymentMethod: ensuredOrder.paymentMethod || 'COD',
                    paymentStatus: ensuredOrder.paymentStatus || 'Pending',
                    totalAmount: Number(ensuredOrder.totalAmount || 0),
                    shippingAmount: Number(ensuredOrder.shippingAmount || 0),
                    preDiscountTotal: Number(ensuredOrder.preDiscountTotal || 0),
                    discountAmount: Number(ensuredOrder.discountAmount || 0),
                    couponCode: String(ensuredOrder.couponCode || ''),
                    couponDiscount: Number(ensuredOrder.couponDiscount || 0),
                    gstAmount: Number(ensuredOrder.gstAmount || 0),
                    giftWrapCharge: Number(ensuredOrder.giftWrapCharge || 0),
                    protectionCharge: Number(ensuredOrder.protectionCharge || 0),
                    ecoCharge: Number(ensuredOrder.ecoCharge || 0),
                    paymentFee: Number(ensuredOrder.paymentFee || 0),
                    extraCharges: Number(ensuredOrder.extraCharges || 0),
                    finalAmount: Number(ensuredOrder.finalAmount || 0),
                    shippingAddress: ensuredOrder.shippingAddress || {},
                    products: normalizeOrderProducts(ensuredOrder.products),
                    deliveryOtp: ensuredOrder.deliveryOtp || '',
                    deliveryOtpSentAt: ensuredOrder.deliveryOtpSentAt || null,
                    deliveryOtpExpiresAt: ensuredOrder.deliveryOtpExpiresAt || null,
                    deliveryOtpVerifiedAt: ensuredOrder.deliveryOtpVerifiedAt || null,
                    estimatedArrival: ensuredOrder.estimatedArrival || null,
                    deliverySpeed: ensuredOrder.deliverySpeed || '',
                    orderDate: ensuredOrder.orderDate || ensuredOrder.createdAt,
                    createdAt: ensuredOrder.createdAt,
                    updatedAt: ensuredOrder.updatedAt
                });
            } catch (e) {
                console.error('❌ Admin order fetch error:', e.message);
                return res.status(500).json({ message: 'Failed to fetch order' });
            }
        });

        // 🔴 REAL-TIME ORDER TRACKING - Admin updates order status + realtime emit
        const handleOrderStatusUpdate = async (req, res) => {
            try {
                const {
                    orderId,
                    status,
                    deliverySchedule,
                    adminNote,
                    deliveryAgent,
                    riderPhone,
                    locationName,
                    latitude,
                    longitude,
                    deliveryOtp
                } = req.body;
                const normalized = normalizeOrderStatus(status);
                const otpInput = String(deliveryOtp || '').trim();
                const latRaw = String(latitude ?? '').trim();
                const lngRaw = String(longitude ?? '').trim();
                const hasLatValue = latRaw.length > 0;
                const hasLngValue = lngRaw.length > 0;
                const latNum = hasLatValue ? Number(latRaw) : NaN;
                const lngNum = hasLngValue ? Number(lngRaw) : NaN;
                const hasCoords = hasLatValue && hasLngValue && Number.isFinite(latNum) && Number.isFinite(lngNum);

                const normalizedDeliverySchedule = deliverySchedule
                    ? {
                        ...deliverySchedule,
                        ...(deliveryAgent ? { deliveryAgent: String(deliveryAgent).trim() } : {}),
                        ...(riderPhone ? { riderPhone: String(riderPhone).trim() } : {}),
                        ...(locationName ? { locationName: String(locationName).trim() } : {}),
                        ...(hasCoords ? { latitude: latNum, longitude: lngNum } : {})
                    }
                    : ((deliveryAgent || riderPhone || locationName || hasCoords)
                        ? {
                            scheduledAt: new Date().toISOString(),
                            ...(deliveryAgent ? { deliveryAgent: String(deliveryAgent).trim() } : {}),
                            ...(riderPhone ? { riderPhone: String(riderPhone).trim() } : {}),
                            ...(locationName ? { locationName: String(locationName).trim() } : {}),
                            ...(hasCoords ? { latitude: latNum, longitude: lngNum } : {})
                        }
                        : null);

                if (!orderId || !normalized) {
                    return res.status(400).json({
                        message: `orderId and valid status are required (${ALLOWED_ORDER_STATUS.join(', ')})`
                    });
                }

                const validateOutForDeliverySchedule = (schedule = null) => {
                    const riderNameValue = String(schedule?.deliveryAgent || '').trim();
                    const riderPhoneValue = String(schedule?.riderPhone || '').trim();
                    const locationNameValue = String(schedule?.locationName || '').trim();
                    const hasCoordsValue = Number.isFinite(Number(schedule?.latitude)) && Number.isFinite(Number(schedule?.longitude));

                    if (!riderNameValue || !riderPhoneValue) {
                        return 'Rider name and rider phone are required for Out for Delivery updates.';
                    }

                    if (!locationNameValue && !hasCoordsValue) {
                        return 'Current location name or valid latitude/longitude is required for Out for Delivery updates.';
                    }

                    return '';
                };

                const now = new Date();
                const shouldGenerateDeliveryOtp = normalized === 'Out for Delivery';
                const generatedDeliveryOtp = shouldGenerateDeliveryOtp ? generateDeliveryOtpCode() : '';
                const generatedDeliveryOtpExpiresAt = shouldGenerateDeliveryOtp
                    ? new Date(now.getTime() + DELIVERY_OTP_EXPIRY_MINUTES * 60000)
                    : null;

                // 🔴 FIRST: Try to find by orderId (from Order collection)
                let order = await Order.findOne({ orderId });

                // 🔴 SECOND: If not found, try by MongoDB _id (from Checkout collection)
                if (!order && orderId.length === 24) {
                    try {
                        order = await Order.findById(orderId);
                    } catch (idErr) {
                        // Not a valid MongoDB ID, continue
                    }
                }

                if (!order) {
                    if (normalized === 'Delivered') {
                        return res.status(400).json({
                            success: false,
                            message: 'Delivery OTP is required. Move order to Out for Delivery first to generate OTP.'
                        });
                    }

                    // Final attempt: Search in Checkout and use userid + order data
                    const checkout = await Checkout.findById(orderId).lean();
                    if (!checkout) {
                        return res.status(404).json({ message: 'Order not found in any collection' });
                    }

                    if (normalized === 'Out for Delivery') {
                        const validationError = validateOutForDeliverySchedule(normalizedDeliverySchedule);
                        if (validationError) {
                            return res.status(400).json({ success: false, message: validationError });
                        }
                    }

                    // Create order record from checkout data
                    const estimatedArrival = normalizedDeliverySchedule?.date
                        ? new Date(normalizedDeliverySchedule.date)
                        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

                    const newOrder = await Order.create({
                        orderId: orderId,
                        userid: checkout.userid,
                        userName: 'Customer',
                        userEmail: '',
                        paymentMethod: checkout.paymentmode || 'COD',
                        paymentStatus: checkout.paymentstatus || 'Pending',
                        orderStatus: normalized,
                        totalAmount: checkout.totalAmount,
                        shippingAmount: checkout.shippingAmount,
                        finalAmount: checkout.finalAmount,
                        products: normalizeOrderProducts(checkout.products),
                        estimatedArrival: estimatedArrival,
                        deliveryOtp: generatedDeliveryOtp || undefined,
                        deliveryOtpSentAt: generatedDeliveryOtp ? now : null,
                        deliveryOtpExpiresAt: generatedDeliveryOtpExpiresAt,
                        deliveryOtpVerifiedAt: null,
                        deliverySchedule: normalizedDeliverySchedule || null,
                        statusHistory: [{
                            status: normalized,
                            timestamp: new Date(),
                            message: `Order status changed to ${normalized}`,
                            deliverySchedule: normalizedDeliverySchedule || null,
                            adminNote: adminNote || null,
                            deliveryAgent: normalizedDeliverySchedule?.deliveryAgent || null,
                            riderPhone: normalizedDeliverySchedule?.riderPhone || null,
                            locationName: normalizedDeliverySchedule?.locationName || null,
                            latitude: normalizedDeliverySchedule?.latitude || null,
                            longitude: normalizedDeliverySchedule?.longitude || null,
                            deliveryOtp: generatedDeliveryOtp || null,
                            deliveryOtpExpiresAt: generatedDeliveryOtpExpiresAt || null,
                            deliveryOtpVerifiedAt: null
                        }]
                    });
                    order = newOrder;
                } else {
                    // Update existing order
                    const previousOrderStatus = String(order.orderStatus || '').trim().toLowerCase();

                    if (normalized === 'Out for Delivery') {
                        const effectiveSchedule = normalizedDeliverySchedule
                            ? { ...(order.deliverySchedule || {}), ...normalizedDeliverySchedule }
                            : (order.deliverySchedule || null);
                        const validationError = validateOutForDeliverySchedule(effectiveSchedule);
                        if (validationError) {
                            return res.status(400).json({ success: false, message: validationError });
                        }
                    }

                    order.orderStatus = normalized;

                    // 🔴 UPDATE DELIVERY SCHEDULE IF PROVIDED
                    if (normalizedDeliverySchedule) {
                        order.deliverySchedule = normalizedDeliverySchedule;
                        // Update estimatedArrival if new delivery date provided
                        if (normalizedDeliverySchedule.date) {
                            order.estimatedArrival = new Date(normalizedDeliverySchedule.date);
                        } else if (normalizedDeliverySchedule.estimatedDelivery) {
                            order.estimatedArrival = new Date(normalizedDeliverySchedule.estimatedDelivery);
                        }
                    }

                    if (normalized === 'Out for Delivery') {
                        order.deliveryOtp = generatedDeliveryOtp;
                        order.deliveryOtpSentAt = now;
                        order.deliveryOtpExpiresAt = generatedDeliveryOtpExpiresAt;
                        order.deliveryOtpVerifiedAt = null;
                    }

                    if (normalized === 'Delivered') {
                        const alreadyVerifiedDelivery = previousOrderStatus === 'delivered' && Boolean(order.deliveryOtpVerifiedAt);
                        if (alreadyVerifiedDelivery) {
                            // Allow non-status metadata updates on already verified delivered orders.
                        } else {
                            const storedDeliveryOtp = String(order.deliveryOtp || '').trim();

                            if (!storedDeliveryOtp) {
                                return res.status(400).json({
                                    success: false,
                                    message: 'Delivery OTP not found for this order. Move to Out for Delivery first.'
                                });
                            }

                            if (!otpInput) {
                                return res.status(400).json({
                                    success: false,
                                    message: 'Delivery OTP is required to mark this order as Delivered.'
                                });
                            }

                            const otpExpiryTime = order.deliveryOtpExpiresAt ? new Date(order.deliveryOtpExpiresAt).getTime() : null;
                            if (otpExpiryTime && otpExpiryTime < Date.now()) {
                                return res.status(400).json({
                                    success: false,
                                    message: 'Delivery OTP has expired. Re-run Out for Delivery to generate a fresh OTP.'
                                });
                            }

                            if (storedDeliveryOtp !== otpInput) {
                                return res.status(400).json({
                                    success: false,
                                    message: 'Invalid delivery OTP. Please verify OTP with customer before marking Delivered.'
                                });
                            }

                            order.deliveryOtpVerifiedAt = now;
                        }
                    }

                    const existingTimeline = Array.isArray(order.statusHistory) ? order.statusHistory : [];
                    order.statusHistory = [
                        ...existingTimeline,
                        {
                            status: normalized,
                            timestamp: new Date(),
                            message: `Order status changed to ${normalized}`,
                            deliverySchedule: normalizedDeliverySchedule || null,
                            adminNote: adminNote || null,
                            deliveryAgent: normalizedDeliverySchedule?.deliveryAgent || null,
                            riderPhone: normalizedDeliverySchedule?.riderPhone || null,
                            locationName: normalizedDeliverySchedule?.locationName || null,
                            latitude: normalizedDeliverySchedule?.latitude || null,
                            longitude: normalizedDeliverySchedule?.longitude || null,
                            deliveryOtp: normalized === 'Out for Delivery' ? order.deliveryOtp || null : null,
                            deliveryOtpExpiresAt: normalized === 'Out for Delivery' ? order.deliveryOtpExpiresAt || null : null,
                            deliveryOtpVerifiedAt: normalized === 'Delivered' ? order.deliveryOtpVerifiedAt || null : null
                        }
                    ];
                    await order.save();
                }

                if (!Array.isArray(order.statusHistory) || order.statusHistory.length === 0) {
                    order.statusHistory = [{
                        status: normalized,
                        timestamp: new Date(),
                        message: `Order status changed to ${normalized}`,
                        deliverySchedule: deliverySchedule || null,
                        adminNote: adminNote || null
                    }];
                    await order.save();
                }

                await Checkout.updateMany(
                    { userid: order.userid, totalAmount: order.totalAmount, finalAmount: order.finalAmount },
                    {
                        orderstatus: normalized,
                        updatedAt: new Date(),
                        ...(normalizedDeliverySchedule
                            ? {
                                deliverySchedule: normalizedDeliverySchedule,
                                estimatedArrival: normalizedDeliverySchedule.date || normalizedDeliverySchedule.estimatedDelivery || order.estimatedArrival || null
                            }
                            : {})
                    }
                ).catch(err => console.warn('⚠️ Checkout sync warning:', err.message));

                const payload = {
                    orderId: order.orderId,
                    userId: order.userid,
                    status: order.orderStatus,
                    updatedAt: new Date().toISOString(),
                    // 🔴 INCLUDE DELIVERY INFORMATION FOR REAL-TIME FRONTEND UPDATES
                    estimatedDelivery: order.estimatedArrival || null,
                    deliverySchedule: order.deliverySchedule || (order.estimatedArrival ? {
                        date: order.estimatedArrival,
                        time: order.deliveryTime || null,
                        scheduledAt: order.estimatedArrival
                    } : null),
                    adminNote: req.body.adminNote || null,
                    deliveryAgent: order.deliverySchedule?.deliveryAgent || null,
                    riderPhone: order.deliverySchedule?.riderPhone || null,
                    locationName: order.deliverySchedule?.locationName || null,
                    latitude: order.deliverySchedule?.latitude || null,
                    longitude: order.deliverySchedule?.longitude || null,
                    deliveryOtp: order.deliveryOtp || null,
                    deliveryOtpSentAt: order.deliveryOtpSentAt || null,
                    deliveryOtpExpiresAt: order.deliveryOtpExpiresAt || null,
                    deliveryOtpVerifiedAt: order.deliveryOtpVerifiedAt || null,
                    deliveryOtpRequired: Boolean(order.deliveryOtp && !order.deliveryOtpVerifiedAt && order.orderStatus === 'Out for Delivery')
                };

                // 🔴 EMIT REAL-TIME STATUS UPDATE VIA SOCKET.IO (instant UI update)
                const ioInstance = req.app.get('io');
                if (ioInstance) {
                    // Emit to individual user room
                    ioInstance.to(`user:${order.userid}`).emit('statusUpdate', payload);
                    // Emit to admin dashboard room
                    ioInstance.to('admin:dashboard').emit('statusUpdate', payload);
                    console.log(`✅ Status updated for order ${order.orderId} to ${normalized}, emitted to user:${order.userid} and admin:dashboard`);
                }

                // 🔴 TRIGGER LUXURY NOTIFICATIONS (WhatsApp - disabled unless explicitly enabled)
                if (FEATURE_WHATSAPP_NOTIFICATIONS) {
                    setImmediate(() => {
                        User.findById(order.userid).lean()
                            .then((userDoc) => {
                                const resolvedPhone = order.shippingAddress?.phone || userDoc?.phone || order.userPhone;
                                const resolvedEmail = order.userEmail || userDoc?.email || '';
                                const resolvedName = order.userName || userDoc?.name || 'Customer';

                                return sendLuxeStatusNotification({
                                    orderId: order.orderId,
                                    status: normalized,
                                    phone: resolvedPhone,
                                    customerName: resolvedName,
                                    email: resolvedEmail,
                                    estimatedDelivery: order.estimatedArrival,
                                    finalAmount: order.finalAmount,
                                    totalAmount: order.totalAmount,
                                    shippingAmount: order.shippingAmount,
                                    paymentMethod: order.paymentMethod,
                                    paymentStatus: order.paymentStatus,
                                    shippingAddress: order.shippingAddress,
                                    products: normalizeOrderProducts(order.products)
                                });
                            })
                            .catch(err => {
                                console.error(`⚠️  Background notification error: ${err.message}`);
                            });
                    });
                }

                // 🔴 TRIGGER STATUS EMAILS (confirmed/packed/shipped/out-for-delivery/delivered)
                if (FEATURE_EMAIL_NOTIFICATIONS) {
                    setImmediate(() => {
                        (async () => {
                            const emailStatuses = new Set(['Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']);
                            if (!emailStatuses.has(normalized)) return;

                            const userDoc = await User.findById(order.userid).lean().catch(() => null);
                            const toEmail = String(order.userEmail || userDoc?.email || '').trim();
                            if (!toEmail) {
                                console.warn(`⚠️ Skipping status email for ${order.orderId}: recipient email not found`);
                                return;
                            }

                            const resolvedUserName = order.userName || userDoc?.name || 'Customer';
                            let invoiceBase64 = null;

                            // Confirmed and Delivered statuses should carry invoice attachments.
                            if (FEATURE_INVOICE_SYSTEM && (normalized === 'Confirmed' || normalized === 'Delivered')) {
                                try {
                                    const invoiceTypeForStatus = normalized === 'Confirmed' ? 'confirmation' : 'final';
                                    const invoiceBuffer = await generateInvoicePdfBuffer({
                                        orderId: order.orderId,
                                        userName: resolvedUserName,
                                        userEmail: toEmail,
                                        paymentMethod: order.paymentMethod || 'COD',
                                        paymentStatus: order.paymentStatus || 'Pending',
                                        finalAmount: Number(order.finalAmount || 0),
                                        totalAmount: Number(order.totalAmount || 0),
                                        shippingAmount: Number(order.shippingAmount || 0),
                                        shippingAddress: order.shippingAddress || {},
                                        products: normalizeOrderProducts(order.products),
                                        orderDate: order.orderDate || order.createdAt,
                                        estimatedArrival: order.estimatedArrival,
                                        orderStatus: normalized,
                                        pdfType: invoiceTypeForStatus,
                                        isDelivered: normalized === 'Delivered'
                                    });

                                    if (invoiceBuffer) {
                                        invoiceBase64 = invoiceBuffer.toString('base64');
                                    }
                                } catch (pdfErr) {
                                    console.warn(`⚠️ Final invoice generation failed for ${order.orderId}: ${pdfErr.message}`);
                                    if (process.env.SENTRY_DSN) Sentry.captureException(pdfErr);
                                }
                            }

                            await enqueueEmailJob('order-status', {
                                toEmail,
                                userId: order.userid,
                                userName: resolvedUserName,
                                orderId: order.orderId,
                                paymentMethod: order.paymentMethod || 'COD',
                                paymentStatus: order.paymentStatus || 'Pending',
                                finalAmount: Number(order.finalAmount || 0),
                                totalAmount: Number(order.totalAmount || 0),
                                shippingAmount: Number(order.shippingAmount || 0),
                                shippingAddress: order.shippingAddress || {},
                                products: normalizeOrderProducts(order.products),
                                orderDate: order.orderDate || order.createdAt,
                                estimatedArrival: order.estimatedArrival,
                                status: normalized,
                                orderStatus: normalized,
                                deliveryOtp: order.deliveryOtp || null,
                                deliverySchedule: order.deliverySchedule || null,
                                deliveryAgent: order.deliverySchedule?.deliveryAgent || null,
                                agentContact: order.deliverySchedule?.riderPhone || null,
                                deliverySlot: order.deliverySchedule?.time || null,
                                statusUpdatedAt: new Date(),
                                invoiceBase64
                            });
                        })().catch((emailErr) => {
                            console.error(`⚠️ Status email queue failed for ${order.orderId}:`, emailErr.message);
                            if (process.env.SENTRY_DSN) Sentry.captureException(emailErr);
                        });
                    });
                }

                // 🔴 EMIT REAL-TIME DASHBOARD UPDATE VIA SOCKET.IO
                if (ioInstance) {
                    ioInstance.emit('dashboardUpdate', {
                        type: 'orderStatusUpdate',
                        orderId: order.orderId,
                        newStatus: normalized,
                        timestamp: new Date()
                    });
                    // Also emit to specific user room
                    ioInstance.to(`user:${order.userid}`).emit('orderUpdate', {
                        orderId: order.orderId,
                        status: normalized,
                        timestamp: new Date()
                    });
                }

                return res.json({
                    success: true,
                    message: `Order status updated to ${normalized}`,
                    order: payload
                });
            } catch (e) {
                console.error('❌ Order update error:', e.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(e);
                return res.status(500).json({ message: 'Failed to update order status' });
            }
        };

        app.post('/api/update-order-status', handleOrderStatusUpdate);
        app.post('/update-order-status', handleOrderStatusUpdate);
        // ==================== ADMIN: CONFIRM ORDER (Send Email #2) ====================
        app.post('/api/admin/confirm-order', async (req, res) => {
            try {
                const { orderId } = req.body;

                // 🔒 SECURITY: Verify admin role
                const adminSecret = req.headers['x-admin-secret'] || req.body.adminSecret;
                if (adminSecret !== process.env.ADMIN_SECRET && process.env.ADMIN_SECRET) {
                    return res.status(403).json({
                        message: 'Unauthorized - Admin access required',
                        success: false
                    });
                }

                if (!orderId) {
                    return res.status(400).json({ message: 'orderId is required' });
                }

                // Find order
                let order = await Order.findOne({ orderId });
                if (!order) {
                    try {
                        order = await Order.findById(orderId);
                    } catch (err) {
                        // Try checkout collection
                        const checkout = await Checkout.findById(orderId).lean();
                        if (checkout) {
                            order = await Order.findOne({ userid: checkout.userid, finalAmount: checkout.finalAmount }).lean();
                        }
                    }
                }

                if (!order) {
                    return res.status(404).json({ message: 'Order not found' });
                }

                const userDoc = await User.findById(order.userid).lean().catch(() => null);
                const recipientEmail = String(order.userEmail || userDoc?.email || '').trim();
                const recipientName = order.userName || userDoc?.name || 'Customer';

                // Generate Proforma PDF for Email #2 (Confirmed)
                let invoiceBase64 = null;
                if (FEATURE_INVOICE_SYSTEM) {
                    try {
                        const invoiceBuffer = await generateInvoicePdfBuffer({
                            orderId: order.orderId,
                            userName: order.userName,
                            userEmail: order.userEmail,
                            paymentMethod: order.paymentMethod || 'COD',
                            paymentStatus: 'Verified',
                            finalAmount: order.finalAmount,
                            totalAmount: order.totalAmount,
                            shippingAmount: order.shippingAmount,
                            shippingAddress: order.shippingAddress,
                            products: normalizeOrderProducts(order.products),
                            orderDate: order.orderDate || new Date(),
                            estimatedArrival: order.estimatedArrival,
                            deliveryPartner: order.deliveryPartner,
                            orderStatus: 'Confirmed',
                            pdfType: 'confirmation'
                        });
                        if (invoiceBuffer) {
                            invoiceBase64 = invoiceBuffer.toString('base64');
                        }
                    } catch (pdfError) {
                        console.error('❌ PDF generation for Email #2 failed:', pdfError.message);
                    }
                }

                // Send Email #2: Order Confirmed (Ultra-Premium) via queue with Proforma attachment
                let emailSent = true;
                if (FEATURE_EMAIL_NOTIFICATIONS && recipientEmail) {
                    try {
                        await enqueueEmailJob('order-confirmed', {
                            toEmail: recipientEmail,
                            userId: order.userid,
                            userName: recipientName,
                            orderId: order.orderId,
                            paymentMethod: order.paymentMethod || 'COD',
                            paymentStatus: order.paymentStatus || 'Pending',
                            finalAmount: order.finalAmount,
                            totalAmount: order.totalAmount,
                            shippingAmount: order.shippingAmount,
                            shippingAddress: order.shippingAddress,
                            products: normalizeOrderProducts(order.products),
                            orderDate: order.orderDate || order.createdAt,
                            estimatedArrival: order.estimatedArrival,
                            invoiceBase64: invoiceBase64,
                            orderStatus: 'Confirmed'
                        });
                    } catch (confirmQueueErr) {
                        emailSent = false;
                        console.warn(`⚠️ Email #2 queue failed for ${orderId}:`, confirmQueueErr.message);
                        if (process.env.SENTRY_DSN) Sentry.captureException(confirmQueueErr);
                    }
                }

                if (!emailSent) {
                    console.warn(`⚠️ Email #2 (Confirmation) failed for ${orderId}, but updating status anyway`);
                }

                // Update order status to "Confirmed"
                order.orderStatus = 'Confirmed';
                order.confirmationEmailSent = true;
                order.confirmationEmailSentAt = new Date();
                const existingTimeline = Array.isArray(order.statusHistory) ? order.statusHistory : [];
                order.statusHistory = [
                    ...existingTimeline,
                    {
                        status: 'Confirmed',
                        timestamp: new Date(),
                        message: 'Order confirmed by admin - Confirmation email sent'
                    }
                ];
                await order.save();

                // Sync to checkout collection
                await Checkout.updateMany(
                    { userid: order.userid, finalAmount: order.finalAmount },
                    { orderstatus: 'Confirmed', updatedAt: new Date() }
                ).catch(err => console.warn('⚠️ Checkout sync warning:', err.message));

                // Real-time update via Socket.IO
                io.to(`user:${order.userid}`).emit('statusUpdate', {
                    orderId: order.orderId,
                    status: 'Confirmed',
                    message: 'Your order has been confirmed! Check your email for full details.',
                    emailSent: emailSent
                });
                // Also emit to admin dashboard
                io.to('admin:dashboard').emit('statusUpdate', {
                    orderId: order.orderId,
                    status: 'Confirmed',
                    message: 'Your order has been confirmed! Check your email for full details.',
                    emailSent: emailSent
                });

                res.json({
                    success: true,
                    message: 'Order confirmed successfully',
                    orderId: order.orderId,
                    emailSent: emailSent,
                    order: {
                        orderId: order.orderId,
                        status: order.orderStatus,
                        userEmail: order.userEmail,
                        confirmationEmailSentAt: order.confirmationEmailSentAt
                    }
                });
            } catch (error) {
                console.error('❌ Admin Confirm Order Error:', error.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to confirm order',
                    error: error.message
                });
            }
        });

        app.post('/api/admin/update-order-status', handleOrderStatusUpdate);

        app.post('/api/chat', async (req, res) => {
            try {
                const prompt = (req.body?.prompt || req.body?.message || '').trim();
                const history = req.body?.history || req.body?.conversationHistory || [];

                if (!prompt) {
                    console.error("⚠️ No prompt received from frontend");
                    return res.status(400).json({ error: "Prompt is required" });
                }

                if (!genAI) {
                    console.error("⚠️ GEMINI_API_KEY missing or invalid");
                    return res.json({
                        text: "I’m here to help with fashion recommendations. Our AI service is refreshing right now—please try again in a moment.",
                        fallback: true
                    });
                }

                console.log(`💬 AI Context check for: ${prompt.substring(0, 30)}...`);

                // 📊 DATABASE SYNC: Products की लिस्ट निकाल रहे हैं
                const productDataSummary = await getChatCatalogSummary();

                const systemInstruction = `You are Eshopper's AI Fashion Consultant.
Catalog (use only these items):\n${productDataSummary}\n
Guidelines:
- Reply in the user's language (English/Hinglish).
- Be professional, warm, and concise (3-6 short lines).
- Ask one clarifying question if the request is unclear.
- Do not invent product names or prices.`;

                // 🛠️ ROLE FIX: Roles normalized for stable prompt composition
                let cleanHistory = (history || []).map(m => ({
                    role: (m.role === 'ai' || m.role === 'model' || m.role === 'bot' || m.sender === 'ai' || m.sender === 'model' || m.sender === 'bot') ? 'model' : 'user',
                    parts: [{ text: m.text || m.parts?.[0]?.text || "" }]
                }));

                const discoveredModels = await getAvailableGeminiModels();
                const preferredOrder = [
                    "gemini-2.5-flash",
                    "gemini-2.0-flash",
                    "gemini-2.0-flash-lite",
                    "gemini-1.5-flash",
                    "gemini-1.5-pro",
                    "gemini-pro"
                ];

                let candidateModels = [];
                if (discoveredModels.length > 0) {
                    const preferredAvailable = preferredOrder.filter((name) => discoveredModels.includes(name));
                    const remaining = discoveredModels.filter((name) => !preferredAvailable.includes(name));
                    candidateModels = [...preferredAvailable, ...remaining];
                } else {
                    candidateModels = preferredOrder;
                }

                const historyText = cleanHistory
                    .map((item) => {
                        const roleLabel = item.role === 'model' ? 'Assistant' : 'User';
                        const text = String(item.parts?.[0]?.text || '').trim();
                        return text ? `${roleLabel}: ${text}` : '';
                    })
                    .filter(Boolean)
                    .slice(-12)
                    .join('\n');

                const fullPrompt = `${systemInstruction}\n\nConversation So Far:\n${historyText || 'No previous conversation.'}\n\nCurrent User Query: ${prompt}`;

                let textResponse = "";
                let lastModelError = null;

                for (const modelName of candidateModels) {
                    if (isModelCoolingDown(modelName)) {
                        continue;
                    }

                    try {
                        const model = genAI.getGenerativeModel({
                            model: modelName,
                            systemInstruction
                        });

                        const result = await model.generateContent(fullPrompt);
                        const response = await result.response;
                        textResponse = response.text();

                        if (textResponse && textResponse.trim()) {
                            console.log(`✅ AI responded successfully using model: ${modelName}`);
                            break;
                        }

                        throw new Error(`Empty response from model: ${modelName}`);
                    } catch (modelError) {
                        if (isQuotaError(modelError)) {
                            setModelCooldown(modelName, modelError);
                            lastModelError = modelError;
                            devWarn(`Quota hit for ${modelName}, cooling down`);
                            continue;
                        }

                        devWarn(`Gemini SDK failed (${modelName}): ${modelError.message}`);

                        try {
                            const restText = await generateWithRest(modelName, fullPrompt);
                            if (restText && restText.trim()) {
                                textResponse = restText;
                                devLog(`AI responded via REST fallback using model: ${modelName}`);
                                break;
                            }
                            throw new Error(`Empty REST response from model: ${modelName}`);
                        } catch (restError) {
                            if (isQuotaError(restError)) {
                                setModelCooldown(modelName, restError);
                            }
                            lastModelError = restError;
                            devWarn(`Gemini REST failed (${modelName}): ${restError.message}`);
                        }
                    }
                }

                if (!textResponse || !textResponse.trim()) {
                    throw lastModelError || new Error("No Gemini model returned a valid response");
                }

                res.json({ text: textResponse });

            } catch (error) {
                console.error("❌ Chat API Error:", error.message);
                res.json({
                    text: "I’m having trouble syncing live AI right now. Please try again in 30 seconds for fresh styling suggestions.",
                    fallback: true
                });
            }
        });
        // --- server.js AI REFACTOR END ---

        const server = httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Master Server Live on ${PORT}`);
            console.log('✅ Server ready and connected successfully');
        });

        try {
            const { initializeQueues } = require('./utils/queues');
            const { initializeCronJobs } = require('./utils/cronJobs');
            const { processRefundJobData } = require('./utils/refundWorker');
            const { getRefundReport } = require('./utils/autoRefundScheduler');

            const bullmqState = initializeQueues({
                refund: async (job) => processRefundJobData(job.data || job),
                report: async (job) => getRefundReport(Number(job.data?.days || 7))
            });

            if (bullmqState) {
                const { usingRedisBackend } = require('./utils/queues');
                console.log(usingRedisBackend() ? '✅ BullMQ queues connected and working from server bootstrap' : '✅ BullMQ local fallback queues connected and working from server bootstrap');
            } else {
                console.log('ℹ️ BullMQ fallback unavailable; queue system disabled');
            }

            initializeCronJobs(app.get('io'));
        } catch (bootstrapErr) {
            console.warn('⚠️ Queue/cron bootstrap skipped:', bootstrapErr.message);
        }

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`\n❌ Port ${PORT} already in use!`);
                console.error(`   Run this command to fix it:`);
                console.error(`   Windows: netstat -ano | findstr :${PORT}  →  taskkill /PID <number> /F`);
                process.exit(1);
            }
            throw err;
        });
    } catch (e) {
        console.error("❌ MongoDB Connection Failed:", e.message);
        console.error("   Details:", e.code || e.codeName);
        console.error("   URI (masked):", MONGO_URI.replace(/mongodb\+srv:\/\/(.+)@/, 'mongodb+srv://***@'));
        process.exit(1);
    }
}

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err?.message || err);
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    process.exit(1);
});

process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down gracefully...");
    try {
        await mongoose.connection.close(false);
        console.log("✅ MongoDB connection closed");
    } catch (e) {
        console.error("❌ Error closing MongoDB:", e?.message || e);
    }
    process.exit(0);
});

// 📡 MONITOR MONGOOSE CONNECTION EVENTS
mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  Mongoose disconnected. Attempting reconnect in 5s...');
    setTimeout(async () => {
        try {
            await mongoose.connect(MONGO_URI, {
                dbName: process.env.DB_NAME || 'eshoper',
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                retryWrites: true,
                w: 'majority'
            });
            console.log('✅ MongoDB reconnected successfully');
        } catch (e) {
            console.error('❌ MongoDB reconnect failed:', e.message);
        }
    }, 5000);
});

// 📡 MONITOR MONGOOSE CONNECTION EVENTS
mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  Mongoose disconnected. Attempting reconnect in 5s...');
    setTimeout(async () => {
        try {
            await mongoose.connect(MONGO_URI, {
                dbName: process.env.DB_NAME || 'eshoper',
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                retryWrites: true,
                w: 'majority'
            });
            console.log('✅ MongoDB reconnected successfully');
        } catch (e) {
            console.error('❌ MongoDB reconnect failed:', e.message);
        }
    }, 5000);
});

startServer();
