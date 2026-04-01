
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

const registerTemplatePartials = () => {
    const partialsDir = path.join(__dirname, 'views', 'emails', 'partials');
    if (!fs.existsSync(partialsDir)) return;

    const partialFiles = fs.readdirSync(partialsDir).filter((file) => file.endsWith('.hbs'));
    for (const fileName of partialFiles) {
        const partialName = path.basename(fileName, '.hbs');
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
    sendOrderReceivedEmail,
    sendOrderConfirmedEmail,
    sendOrderPackedEmail,
    sendOrderShippedEmail,
    sendOrderOutForDeliveryEmail,
    sendOrderDeliveredEmail,
    sendOrderStatus,
};
