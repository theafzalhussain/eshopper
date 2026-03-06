# 📧 Boutique Luxe - Premium Email Templates

## Overview
Complete email template suite for eCommerce order lifecycle. All templates are premium-themed, dark mode optimized (#0A0A0A background, #D4AF37 gold accents), and fully responsive.

---

## 📋 Email Templates

### 1️⃣ Order Placed Email
**File:** `01-order-placed.html`
**Trigger:** Immediately after order placement
**Purpose:** Instant confirmation that payment & order received
**Key Features:**
- Order ID (#ESHP-2026-{{ORDER_ID}})
- Order date display
- Hero message: "Your luxury selection is now in our queue"
- Item table with images (80px), names, sizes, quantities, subtotals
- Shipping address & payment method (side-by-side)
- "View Complete Order" CTA button
- Disclaimer: "This is a receipt, not a Tax Invoice"
- WhatsApp support link + Instagram icon + Privacy links
- Inline CSS, table-based layout, 600px max-width

---

### 2️⃣ Order Confirmed Email
**File:** `02-order-confirmed.html`
**Trigger:** After order verification/confirmation
**Purpose:** The master detail email with Amazon-style full breakdown
**Key Features:**
- CONFIRMED status badge with green checkmark ✓
- Estimated delivery date in GOLD hero banner
- "Our Luxe Promise" section: 10-point quality check message
- Full order breakdown:
  - Item price × Qty
  - Shipping charges (marked FREE)
  - GST & Taxes
  - Total Amount Paid
- Detailed items with images (85px), size, SKU, pricing
- Delivery address & payment method sections
- Social proof: "Join 50k+ Luxe community on Instagram"
- Responsive: 100% width on mobile, 600px on desktop
- FAQ, Returns & Privacy links in footer
- WhatsApp & Email support options

---

### 3️⃣ Order Packed Email
**File:** `03-order-packed.html`
**Trigger:** When order is packed and ready for dispatch
**Purpose:** Tell user about premium packaging experience
**Key Features:**
- "WRAPPED WITH CARE" header with 📦 emoji
- Hero: "PERFECTLY PACKED" with golden gradient
- Quality Checked badge with checkmark
- The Unboxing Experience section highlighting:
  - ✓ Sanitized & Cleaned
  - ✓ Eco-Friendly Packaging
  - ✓ Personalized Touch
  - ✓ Secure Sealing (gold hologram sticker)
- Clean order summary (Order ID, items count, packed date)
- Items list (brief format for cleanliness)
- "What's Next?" section: Tracking link coming soon
- WhatsApp support ready
- Professional, elegant tone

---

### 4️⃣ Order Shipped Email
**File:** `04-order-shipped.html`
**Trigger:** When package leaves warehouse
**Purpose:** Live tracking details (Amazon style)
**Key Features:**
- Tracking Hero: Big "Track Your Package" section
- Courier Info:
  - Courier Name (BlueDart, Delhivery, etc.)
  - Service Type (Express)
  - Tracking Number (AWB)
- Horizontal progress bar showing:
  - Placed ✓
  - Confirmed ✓
  - Shipped (HIGHLIGHTED in gold)
  - Delivered (pending)
- Item recap with images & details
- Detailed tracking info:
  - Estimated delivery date
  - Current location
  - Shipping address
- "Live Track Package" button (links to tracking URL)
- "View Order Details" secondary button
- Courier site link for external tracking
- 24/7 WhatsApp & Email support

---

### 5️⃣ Out for Delivery Email
**File:** `05-out-for-delivery.html`
**Trigger:** Day of delivery / Package out for delivery
**Purpose:** Final alert for user to be ready
**Key Features:**
- Header: "IT'S ARRIVING TODAY!" (26px gold text)
- Alert banner with 🚚 emoji
- Delivery window: "Between {{DELIVERY_WINDOW}}"
- Tracking info block:
  - Tracking number
  - Courier name
  - Full delivery address
- ⚠️ Safety First section:
  - "Share OTP only when you receive package"
  - Package seal verification reminder
- Change delivery options:
  - WhatsApp: Change Address/Time
  - Live Tracking Map button
- Delivery Partner Contact Info:
  - Partner phone number
  - Partner name
- 🛡️ Trust banner: "100% Authentic & Insured Delivery"
- 4-step Delivery Instructions:
  1. Be ready during delivery window
  2. Verify package seal
  3. Share OTP only on receipt
  4. Keep package for returns
- 24/7 support available

---

### 6️⃣ Order Delivered Email
**File:** `06-order-delivered.html`
**Trigger:** Package delivered successfully
**Purpose:** Review request + tax invoice + referral program
**Key Features:**
- Success banner: Green checkmark ✓ "ORDER DELIVERED"
- Delivery timestamp
- Order details with total amount
- **DOWNLOAD TAX INVOICE button** (prominent CTA)
  - Links to PDF attachment
- Detailed item listing with images, SKUs, pricing
- Rating system:
  - 1-5 star icons (clickable links)
  - Links to `/rate/{{ORDER_ID}}/rating`
  - "Write Detailed Review" button
- **Referral Program Section** (Golden background):
  - "Refer & Earn 10% Off"
  - Share link to `/referral/{{CUSTOMER_ID}}`
  - Both get 10% discount on next purchase
- Delivery & Billing Summary:
  - Delivered to address
  - Payment method + status
- Easy Returns & Exchanges info:
  - 30-day easy returns policy
  - Link to returns page
- Community section:
  - Instagram CTA (@boutique.luxe)
  - WhatsApp community link
- Full footer with FAQ, Returns, Privacy, Terms

---

## 🔧 Template Variables (Dynamic Content)

Replace these placeholders with actual data from your database:

### Customer Info
- `{{CUSTOMER_NAME}}` - Full name
- `{{PHONE}}` - Contact number

### Order Info
- `{{ORDER_ID}}` - Order identification number
- `{{ORDER_DATE}}` - When order was placed
- `{{CONFIRMATION_DATE}}` - When order was confirmed
- `{{PACKED_DATE}}` - When order was packed
- `{{DELIVERY_DATE}}` - Expected delivery date (formatted)
- `{{DELIVERY_TIME}}` - Actual delivery time
- `{{DELIVERY_WINDOW}}` - Timeframe (e.g., "10:00 AM - 2:00 PM")

### Pricing
- `{{SUBTOTAL}}` - Sum before taxes/shipping
- `{{SHIPPING_CHARGES}}` - Shipping cost (set to FREE or amount)
- `{{TAX}}` - GST/Tax amount
- `{{TOTAL_AMOUNT}}` - Final amount paid
- `{{ITEM_COUNT}}` - Number of items

### Items (Repeat for each item)
- `{{ITEM_1_NAME}}` - Product name
- `{{ITEM_1_IMAGE}}` - Product image URL
- `{{ITEM_1_SIZE}}` - Size/variant
- `{{ITEM_1_SKU}}` - Stock keeping unit
- `{{ITEM_1_PRICE}}` - Unit price
- `{{ITEM_1_QTY}}` - Quantity ordered
- `{{ITEM_1_SUBTOTAL}}` - Price × Qty

### Address
- `{{ADDRESS_LINE_1}}` - Street address
- `{{CITY}}` - City name
- `{{STATE}}` - State/Province
- `{{PINCODE}}` - Postal code

### Payment
- `{{PAYMENT_METHOD}}` - e.g., "Razorpay", "COD"
- `{{PAYMENT_ID}}` - Transaction reference

### Shipping/Tracking
- `{{COURIER_NAME}}` - e.g., "BlueDart", "Delhivery"
- `{{TRACKING_ID}}` - AWB number
- `{{TRACKING_URL}}` - Link to courier tracking page
- `{{COURIER_TRACKING_LINK}}` - Courier base URL
- `{{CURRENT_LOCATION}}` - Package current location
- `{{DELIVERY_PARTNER_NAME}}` - Delivery person name
- `{{DELIVERY_PARTNER_PHONE}}` - Delivery person contact
- `{{DELIVERY_ADDRESS}}` - Full delivery address

### URLs (Must be configured)
- `{{BASE_URL}}` - Your website base URL (e.g., https://boutique-luxe.com)
- `{{INVOICE_PDF_LINK}}` - Direct link to PDF invoice download
- `{{LOGO_URL}}` - Company logo image URL
- `{{WATERMARK_LOGO_URL}}` - Watermark image URL (use the same approved ESHOPPER logo image)

---

## 🎨 Styling Specifications

### Colors
- **Background:** `#0A0A0A` (Deep Black)
- **Accent/Gold:** `#D4AF37` (Premium Gold)
- **Secondary Background:** `#1a1a1a` (Dark Gray)
- **Text:** `#FFFFFF` (White)
- **Secondary Text:** `#999999` (Gray)
- **Success:** `#4CAF50` (Green)
- **Alerts:** `#FF9800` (Orange)

### Typography
- **Font Family:** 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Headings:** Bold, 24-26px, letter-spacing: 2px
- **Body Text:** 13px regular, line-height: 1.8
- **Buttons:** 14px, uppercase, letter-spacing: 1px

### Layout
- **Max-width:** 600px (for content, 100% for container)
- **Table-based:** No flexbox, all CSS inline
- **Padding:** 20-30px sides, 15-20px vertical
- **Borders:** 1px solid #333, rounded 4px
- **Responsive:** Mobile-first, 100% table widths

---

## 📱 Implementation Guide

### Option 1: Using Email Service Provider (ESP)
1. Copy template HTML into your ESP (SendGrid, Mailgun, SES, etc.)
2. Replace `{{VARIABLE}}` with their template syntax:
   - **SendGrid:** `-{{variable}}`
   - **Mailgun:** `%muse:variable%`
   - **Handlebars:** `{{variable}}`
3. Upload your final ESHOPPER logo and map it to `{{LOGO_URL}}` in template variables
4. If any template/design needs watermark graphics, always map `{{WATERMARK_LOGO_URL}}` to the same approved ESHOPPER logo image
5. Create email trigger rules based on order status

### Option 2: Node.js Backend
```javascript
const nodemailer = require('nodemailer');
const fs = require('fs');

const templates = {
  orderPlaced: fs.readFileSync('./email-templates/01-order-placed.html', 'utf8'),
  orderConfirmed: fs.readFileSync('./email-templates/02-order-confirmed.html', 'utf8'),
  orderPacked: fs.readFileSync('./email-templates/03-order-packed.html', 'utf8'),
  orderShipped: fs.readFileSync('./email-templates/04-order-shipped.html', 'utf8'),
  outForDelivery: fs.readFileSync('./email-templates/05-out-for-delivery.html', 'utf8'),
  orderDelivered: fs.readFileSync('./email-templates/06-order-delivered.html', 'utf8'),
};

function replaceVariables(template, data) {
  let html = template;
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key]);
  });
  return html;
}

async function sendOrderPlacedEmail(order) {
  const html = replaceVariables(templates.orderPlaced, {
    ORDER_ID: order.id,
    CUSTOMER_NAME: order.customerName,
    ORDER_DATE: new Date(order.createdAt).toLocaleDateString(),
    ITEM_1_NAME: order.items[0].name,
    ITEM_1_IMAGE: order.items[0].image,
    ITEM_1_SIZE: order.items[0].size,
    ITEM_1_QTY: order.items[0].quantity,
    ITEM_1_SUBTOTAL: order.items[0].price * order.items[0].quantity,
    // ... add more variables
  });

  await transporter.sendMail({
    to: order.email,
    subject: 'Order Received - Boutique Luxe #ESHP-2026-' + order.id,
    html: html,
  });
}
```

### Option 3: React/Next.js
```jsx
// Create Email Service
import OrderPlacedEmail from './emails/OrderPlaced';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderPlaced(order) {
  return resend.emails.send({
    from: 'noreply@boutique-luxe.com',
    to: order.email,
    subject: `Order Received - #ESHP-2026-${order.id}`,
    react: <OrderPlacedEmail order={order} />,
  });
}
```

---

## 🚀 Integration Checklist

- [ ] Update all placeholder URLs (BASE_URL, logo, Invoice PDF link, etc.)
- [ ] Configure WhatsApp number (replace 919999999999)
- [ ] Add Instagram/Social handles
- [ ] Set up email sending service (SendGrid/Mailgun/SES)
- [ ] Create template variables mapping for your database
- [ ] Test all 6 emails on Gmail, Outlook, Apple Mail
- [ ] Verify mobile responsiveness (test on iPhone/Android)
- [ ] Add email triggers in order management system
- [ ] Set up invoice PDF generation for "Download Tax Invoice"
- [ ] Configure tracking page URLs
- [ ] Test WhatsApp integration links
- [ ] Create referral program backend (if using referral feature)
- [ ] Set up rating/review system for delivered orders
- [ ] Create PDF attachments system for invoices

---

## 📊 Email Sequence Timeline

| Time | Email | Status |
|------|-------|--------|
| 0 min | Order Placed | User confirms payment |
| 5-10 min | Order Confirmed | Order verified |
| 2-4 hours | Order Packed | Items packed & ready |
| Next day | Order Shipped | Package leaves warehouse |
| Last update | Out for Delivery | Day of delivery |
| After delivery | Order Delivered | Prompt for review & referral |

---

## 🎯 Best Practices

1. **Testing:** Always test with real data before sending
2. **Branding:** Keep gold (#D4AF37) accent consistent across all emails
3. **Links:** Ensure all links work (test in staging first)
4. **Mobile:** Test on multiple devices (Gmail often renders differently)
5. **Performance:** Keep images under 100KB each, use optimized formats
6. **Personalization:** Replace `{{CUSTOMER_NAME}}` with actual names for higher engagement
7. **Unsubscribe:** Add unsubscribe links in footer (legal requirement)
8. **SPF/DKIM:** Configure email authentication for deliverability
9. **Frequency:** Don't overwhelm users with too many emails
10. **Analytics:** Track open rates, click-through rates, conversions

---

## 📞 Support Links Configuration

Update these in all templates:
- WhatsApp: `https://wa.me/919999999999`
- Email: `support@boutique-luxe.com`
- Instagram: `https://instagram.com/boutique.luxe`
- FAQ Page: `{{BASE_URL}}/faq`
- Returns Page: `{{BASE_URL}}/returns`
- Privacy Policy: `{{BASE_URL}}/privacy`
- Terms & Conditions: `{{BASE_URL}}/terms`

---

## 🔐 Security Notes

- Never expose sensitive data (full card numbers, passwords)
- Always use HTTPS for all links
- Sanitize user input in template variables
- Use secure token for tracking links
- Implement expiry for sensitive links
- Store invoice links securely (requires authentication)

---

## 📈 Future Enhancements

- [ ] Add SMS templates for status updates
- [ ] Create WhatsApp catalog template integration
- [ ] Build push notification variants
- [ ] Add AR try-on preview in emails (if applicable)
- [ ] Create personalized product recommendations
- [ ] Build loyalty points display/tracking
- [ ] Add subscription/repeat order options
- [ ] Create wishlist reminders

---

**Created:** March 6, 2026
**Version:** 1.0
**Brand:** Boutique Luxe
**Status:** ✅ Ready for Implementation
