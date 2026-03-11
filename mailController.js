// sendOrderDeliveredEmail: Sends the 'Delivered Successfully' email using the Luxe template
async function sendOrderDeliveredEmail({
    to,
    logoUrl,
    customerName,
    orderId,
    deliveredOn,
    receivedBy,
    taxInvoiceUrl,
    reviewUrl,
    referralCode,
    referralShareUrl,
    instagramUrl,
    whatsappUrl,
    companyAddress
}) {
    // Read and compile the .hbs template
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-delivered.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    const html = template({
        logoUrl,
        customerName,
        orderId,
        deliveredOn,
        receivedBy,
        taxInvoiceUrl,
        reviewUrl,
        referralCode,
        referralShareUrl,
        instagramUrl,
        whatsappUrl,
        companyAddress
    });

    // TODO: Replace with your email sending logic (e.g., nodemailer, Brevo, etc.)
    // Example:
    // await sendEmail({ to, subject: `Delivered Successfully - ${orderId}`, html });
    return html;
}

// sendOrderOutForDeliveryEmail: Sends the 'Arriving Today / Out for Delivery' email using the Luxe template
async function sendOrderOutForDeliveryEmail({
    to,
    logoUrl,
    orderId,
    orderDate,
    customerName,
    deliveryDate,
    deliveryTimeSlot,
    otp,
    courierPartner,
    trackingNumber,
    deliveryAgent,
    agentContact,
    deliveryLocation,
    liveTrackingUrl,
    companyAddress
}) {
    // Read and compile the .hbs template
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-out-for-delivery.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    const html = template({
        logoUrl,
        orderId,
        orderDate,
        customerName,
        deliveryDate,
        deliveryTimeSlot,
        otp,
        courierPartner,
        trackingNumber,
        deliveryAgent,
        agentContact,
        deliveryLocation,
        liveTrackingUrl,
        companyAddress
    });

    // TODO: Replace with your email sending logic (e.g., nodemailer, Brevo, etc.)
    // Example:
    // await sendEmail({ to, subject: `Out for Delivery - ${orderId}`, html });
    return html;
}

// sendOrderShippedEmail: Sends the 'Order Shipped' email using the Luxe template
async function sendOrderShippedEmail({
    to,
    logoUrl,
    orderId,
    orderDate,
    customerName,
    courierPartner,
    trackingNumber,
    shippedOn,
    expectedDelivery,
    liveTrackingUrl,
    carrierWebsiteUrl,
    companyAddress
}) {
    // Read and compile the .hbs template
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-shipped.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    const html = template({
        logoUrl,
        orderId,
        orderDate,
        customerName,
        courierPartner,
        trackingNumber,
        shippedOn,
        expectedDelivery,
        liveTrackingUrl,
        carrierWebsiteUrl,
        companyAddress
    });

    // TODO: Replace with your email sending logic (e.g., nodemailer, Brevo, etc.)
    // Example:
    // await sendEmail({ to, subject: `Order Shipped - ${orderId}`, html });
    return html;
}

// sendOrderPackedEmail: Sends the 'Order Packed' email using the Luxe template
async function sendOrderPackedEmail({
    to,
    logoUrl,
    orderId,
    orderDate,
    customerName,
    totalItems,
    packedOn,
    packageWeight,
    trackingUrl,
    companyAddress
}) {
    // Read and compile the .hbs template
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-packed.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    const html = template({
        logoUrl,
        orderId,
        orderDate,
        customerName,
        totalItems,
        packedOn,
        packageWeight,
        trackingUrl,
        companyAddress
    });

    // TODO: Replace with your email sending logic (e.g., nodemailer, Brevo, etc.)
    // Example:
    // await sendEmail({ to, subject: `Order Packed - ${orderId}`, html });
    return html;
}

// sendOrderConfirmedEmail: Sends the 'Order Confirmed' email using the Luxe template
async function sendOrderConfirmedEmail({
    to,
    logoUrl,
    orderId,
    orderDate,
    customerName,
    expectedArrival,
    items,
    totalPaid,
    shippingAddress,
    companyAddress
}) {
    // Read and compile the .hbs template
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-confirmed.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    const html = template({
        logoUrl,
        orderId,
        orderDate,
        customerName,
        expectedArrival,
        items,
        totalPaid,
        shippingAddress,
        companyAddress
    });

    // TODO: Replace with your email sending logic (e.g., nodemailer, Brevo, etc.)
    // Example:
    // await sendEmail({ to, subject: `Order Confirmed - ${orderId}`, html });
    return html;
}

// mailController.js (Base Structure)
// Ultra-Premium Luxe Email Suite - Boutique Edition
// All transactional email logic will be implemented here using dynamic data from MongoDB.

const path = require('path');
// const nodemailer = require('nodemailer'); // Uncomment and configure as needed
// const hbs = require('handlebars'); // For .hbs template rendering

// Example: sendOrderPlacedEmail(user, orderData)
const fs = require('fs');
const handlebars = require('handlebars');

// sendOrderReceivedEmail: Sends the 'Order Received' email using the Luxe template
async function sendOrderReceivedEmail({
    to,
    logoUrl,
    orderId,
    orderDate,
    customerName,
    items,
    totalAmount,
    shippingName,
    shippingAddress,
    shippingPhone,
    paymentMethod,
    paymentStatus,
    whatsappUrl,
    supportEmail,
    companyAddress
}) {
    // Read and compile the .hbs template
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-received.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    const html = template({
        logoUrl,
        orderId,
        orderDate,
        customerName,
        items,
        totalAmount,
        shippingName,
        shippingAddress,
        shippingPhone,
        paymentMethod,
        paymentStatus,
        whatsappUrl,
        supportEmail,
        companyAddress
    });

    // TODO: Replace with your email sending logic (e.g., nodemailer, Brevo, etc.)
    // Example:
    // await sendEmail({ to, subject: `Order Received - ${orderId}`, html });
    return html;
}

module.exports = {
    sendOrderReceivedEmail,
    sendOrderConfirmedEmail,
    sendOrderPackedEmail,
    sendOrderShippedEmail,
    sendOrderOutForDeliveryEmail,
    sendOrderDeliveredEmail,
};
