
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

// Order Received
async function sendOrderReceivedEmail({
    toEmail, logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, paymentStatus, whatsappUrl, supportEmail, companyAddress
}) {
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-received.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template({ logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, paymentStatus, whatsappUrl, supportEmail, companyAddress });
}

// Order Confirmed
async function sendOrderConfirmedEmail({
    toEmail, logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, expectedArrival, companyAddress
}) {
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-confirmed.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template({ logoUrl, orderId, orderDate, customerName, customerEmail, items, subtotal, shippingCharges, gst, totalPaid, shippingAddress, paymentMethod, transactionId, expectedArrival, companyAddress });
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

module.exports = {
    sendOrderReceivedEmail,
    sendOrderConfirmedEmail,
    sendOrderPackedEmail,
    sendOrderShippedEmail,
    sendOrderOutForDeliveryEmail,
    sendOrderDeliveredEmail,
};
