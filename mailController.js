
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

const DEFAULT_THEME_TOKENS_PARTIAL = `:root {
    --font-premium: 'Trebuchet MS', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    --font-luxury: Georgia, 'Times New Roman', serif;
    --text-primary: #f5f7fb;
    --text-muted: #bac3d4;
    --gold-accent: #f8d98a;
    --panel-bg-a: #0f131a;
    --panel-bg-b: #182033;
    --panel-bg-c: #111827;
    --progress-a: #34d399;
    --progress-b: #60a5fa;
    --progress-c: #a78bfa;
    --btn-size: 14px;
    --btn-radius: 9px;
    --btn-py: 10px;
    --btn-px: 14px;
}

body {
    font-family: var(--font-premium);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
}

.hero .t,
.hero h1,
.hero h2 {
    font-size: 34px !important;
    line-height: 1.12 !important;
}

.title {
    font-size: 30px !important;
    line-height: 1.15 !important;
}

.heading {
    font-size: 22px !important;
}

.progress-head {
    font-size: 16px !important;
}

.btn,
.btn-sm,
.smallbtn,
.btn-inst,
.btn-ref,
.btn-review,
.line,
.chat,
.call,
.contact a,
.support a,
.cta a {
    font-size: var(--btn-size) !important;
    line-height: 1.3 !important;
    border-radius: var(--btn-radius) !important;
    padding: var(--btn-py) var(--btn-px) !important;
    min-width: 0 !important;
}

.hero .icon,
.hero .ok,
.crown,
.pgrid .i,
.egrid .i,
.stars {
    font-size: 24px !important;
    line-height: 1 !important;
}

.status {
    letter-spacing: 0.3px;
    font-size: 11px !important;
    padding: 6px 10px !important;
}

@media only screen and (max-width: 620px) {
    .hero .t,
    .hero h1,
    .hero h2 {
        font-size: 27px !important;
    }

    .title {
        font-size: 24px !important;
    }

    .heading {
        font-size: 19px !important;
    }

    .progress-head {
        font-size: 14px !important;
    }

    .btn,
    .btn-sm,
    .smallbtn,
    .btn-inst,
    .btn-ref,
    .btn-review,
    .line,
    .chat,
    .call,
    .contact a,
    .support a,
    .cta a {
        font-size: 13px !important;
        padding: 9px 12px !important;
    }
}`;

const registerTemplatePartials = () => {
        // Keep core tokens available even if file-based partial loading fails.
        handlebars.registerPartial('theme_tokens', DEFAULT_THEME_TOKENS_PARTIAL);

    const partialsDir = path.join(__dirname, 'views', 'emails', 'partials');
    if (!fs.existsSync(partialsDir)) return;

        const partialFiles = fs
                .readdirSync(partialsDir)
                .filter((file) => file.endsWith('.hbs') || file.endsWith('.handlebars'));

    for (const fileName of partialFiles) {
                const partialName = path.basename(fileName, path.extname(fileName));
        const partialPath = path.join(partialsDir, fileName);
        const source = fs.readFileSync(partialPath, 'utf8');
        handlebars.registerPartial(partialName, source);
    }
};

const renderTemplate = (fileName, payload = {}) => {
    registerTemplatePartials();
    // Enrich payload with sensible defaults so email CTAs work reliably
    const enriched = enrichPayload(payload || {});
    const templatePath = path.join(__dirname, 'views', 'emails', fileName);
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template(enriched);
};

const enrichPayload = (p = {}) => {
    const out = Object.assign({}, p);
    const FRONTEND = process.env.FRONTEND_BASE_URL || 'https://eshopperr.me';
    // basic site links
    out.shopUrl = out.shopUrl || FRONTEND + '/';
    out.websiteUrl = out.websiteUrl || FRONTEND;
    out.privacyPolicyUrl = out.privacyPolicyUrl || FRONTEND + '/privacy';
    out.termsUrl = out.termsUrl || FRONTEND + '/terms';
    out.helpCenterUrl = out.helpCenterUrl || FRONTEND + '/help';
    out.companyAddress = out.companyAddress || process.env.COMPANY_ADDRESS || '';
    out.supportEmail = out.supportEmail || process.env.SUPPORT_EMAIL || 'support@eshopperr.me';
    out.supportPhone = out.supportPhone || process.env.SUPPORT_PHONE || '';
    out.instagramUrl = out.instagramUrl || process.env.INSTAGRAM_URL || 'https://instagram.com/eshopperr';
    out.whatsappUrl = out.whatsappUrl || process.env.WHATSAPP_URL || '';

    // Order-specific links
    if (out.orderId) {
        out.trackingUrl = out.trackingUrl || `${FRONTEND}/order/${encodeURIComponent(out.orderId)}/track`;
        out.liveTrackingUrl = out.liveTrackingUrl || `${FRONTEND}/order/${encodeURIComponent(out.orderId)}/live`;
        out.placedInvoiceUrl = out.placedInvoiceUrl || `${FRONTEND}/order/${encodeURIComponent(out.orderId)}/receipt`;
        out.confirmationInvoiceUrl = out.confirmationInvoiceUrl || `${FRONTEND}/order/${encodeURIComponent(out.orderId)}/receipt`;
        out.finalInvoiceUrl = out.finalInvoiceUrl || `${FRONTEND}/order/${encodeURIComponent(out.orderId)}/invoice`;
        out.reviewUrl = out.reviewUrl || `${FRONTEND}/order/${encodeURIComponent(out.orderId)}/review`;
    }

    // Tracking via carrier
    if (out.trackingNumber && !out.carrierWebsiteUrl) {
        out.carrierWebsiteUrl = `https://www.google.com/search?q=${encodeURIComponent(out.trackingNumber)}`;
    }

    return out;
};

// Order Received
async function sendOrderReceivedEmail(payload = {}) {
    return renderTemplate('order-received.hbs', payload);
}

// Order Confirmed
async function sendOrderConfirmedEmail(payload = {}) {
    return renderTemplate('order-confirmed.hbs', payload);
}

// Order Packed
async function sendOrderPackedEmail(payload = {}) {
    return renderTemplate('order-packed.hbs', payload);
}

// Order Shipped
async function sendOrderShippedEmail(payload = {}) {
    return renderTemplate('order-shipped.hbs', payload);
}

// Out for Delivery
async function sendOrderOutForDeliveryEmail(payload = {}) {
    return renderTemplate('order-out-for-delivery.hbs', payload);
}

// Delivered
async function sendOrderDeliveredEmail(payload = {}) {
    return renderTemplate('order-delivered.hbs', payload);
}


// Generic status router
async function sendOrderStatus({ status, ...rest }) {
    const s = String(status || '').toLowerCase();
    if (s === 'ordered' || s === 'order placed' || s === 'order received') {
        return sendOrderReceivedEmail(rest);
    }
    if (s === 'confirmed' || s === 'order confirmed') {
        return sendOrderConfirmedEmail(rest);
    }
    if (s === 'packed' || s === 'order packed') {
        return sendOrderPackedEmail(rest);
    }
    if (s === 'shipped' || s === 'order shipped') {
        return sendOrderShippedEmail(rest);
    }
    if (s === 'out for delivery') {
        return sendOrderOutForDeliveryEmail(rest);
    }
    if (s === 'delivered' || s === 'order delivered') {
        return sendOrderDeliveredEmail(rest);
    }
    throw new Error('Unknown order status: ' + status);
}

module.exports = {
    registerTemplatePartials,
    sendOrderReceivedEmail,
    sendOrderConfirmedEmail,
    sendOrderPackedEmail,
    sendOrderShippedEmail,
    sendOrderOutForDeliveryEmail,
    sendOrderDeliveredEmail,
    sendOrderStatus,
};
