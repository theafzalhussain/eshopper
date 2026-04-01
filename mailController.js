
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
}

body {
    font-family: var(--font-premium);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
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
    const templatePath = path.join(__dirname, 'views', 'emails', fileName);
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template(payload || {});
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
