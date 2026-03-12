
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

// Order Received (updated for new .hbs design)
async function sendOrderReceivedEmail({
    toEmail,
    userName,
    orderId,
    orderDate,
    items,
    subtotal,
    shippingCharges,
    totalPaid,
    shippingAddress,
    paymentMethod,
    paymentStatus
}) {
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-received.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template({
        orderId,
        orderDate,
        customerName: userName,
        items,
        subtotal,
        shippingCharges,
        totalPaid,
        shippingAddress,
        paymentMethod,
        paymentStatus
    });
}

// Order Confirmed (updated for new .hbs design)
async function sendOrderConfirmedEmail({
    toEmail,
    userName,
    orderId,
    orderDate,
    expectedArrival,
    items,
    subtotal,
    shippingCharges,
    gst,
    totalPaid,
    shippingAddress,
    billingInfo,
    trackingUrl,
    receiptUrl
}) {
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-confirmed.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template({
        orderId,
        orderDate,
        customerName: userName,
        expectedArrival,
        items,
        subtotal,
        shippingCharges,
        gst,
        totalPaid,
        shippingAddress,
        billingInfo,
        trackingUrl,
        receiptUrl
    });
}

// Order Packed
async function sendOrderPackedEmail({
    toEmail, logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, totalItems, packedOn, packageWeight, trackingUrl, companyAddress
}) {
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-packed.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template({ logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, totalItems, packedOn, packageWeight, trackingUrl, companyAddress });
}

// Order Shipped
async function sendOrderShippedEmail({
    toEmail, logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, expectedDate, courierPartner, trackingNumber, shippedOn, expectedDelivery, liveTrackingUrl, carrierWebsiteUrl, companyAddress
}) {
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-shipped.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template({ logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, expectedDate, courierPartner, trackingNumber, shippedOn, expectedDelivery, liveTrackingUrl, carrierWebsiteUrl, companyAddress });
}

// Out for Delivery
async function sendOrderOutForDeliveryEmail({
    toEmail, logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, expectedDate, courierPartner, trackingNumber, otp, deliveryAgent, agentContact, deliveryLocation, liveTrackingUrl, companyAddress
}) {
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-out-for-delivery.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template({ logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, expectedDate, courierPartner, trackingNumber, otp, deliveryAgent, agentContact, deliveryLocation, liveTrackingUrl, companyAddress });
}

// Delivered
async function sendOrderDeliveredEmail({
    toEmail, logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, deliveredOn, receivedBy, invoiceUrl, reviewUrl, referralCode, referralShareUrl, instagramUrl, whatsappUrl, companyAddress
}) {
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-delivered.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template({ logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, deliveredOn, receivedBy, invoiceUrl, reviewUrl, referralCode, referralShareUrl, instagramUrl, whatsappUrl, companyAddress });
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
