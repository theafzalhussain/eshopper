# 🎨 eShopper Luxe Email Templates

Premium, responsive, and fully automated email notification system for the complete order lifecycle.

---

## 📧 Template Overview

| # | Template File | Status | Theme Color | Purpose |
|---|--------------|--------|-------------|---------|
| 1 | `01-order-placed.html` | Order Placed | Gold (#D4AF37) | Instant confirmation when order is placed |
| 2 | `02-order-confirmed.html` | Order Confirmed | Green (#4CAF50) | Master confirmation with full transparency |
| 3 | `03-order-packed.html` | Order Packed | Purple (#8A5AD0) | Premium packaging experience highlight |
| 4 | `04-order-shipped.html` | Order Shipped | Blue (#2196F3) | Live tracking with courier details |
| 5 | `05-out-for-delivery.html` | Out for Delivery | Orange (#FF9800) | Real-time delivery alert with OTP security |
| 6 | `06-order-delivered.html` | Order Delivered | Green (#4CAF50) | Celebration, invoice download, rating & referral |

---

## 🎯 Design Philosophy

### Core Principles
- **Premium Boutique Aesthetic**: Dark theme (#0A0A0A) with luxury accents
- **Mobile-First Responsive**: Table-based layout (600px max-width) with percentage widths
- **Email Client Compatible**: Inline CSS, no external stylesheets, tested for Gmail/Outlook/Apple Mail
- **Progressive Disclosure**: Each email reveals only relevant information for that stage
- **Trust Building**: Security badges, delivery guarantees, social proof elements

### Color Psychology
- **Gold (#D4AF37)**: Premium, trust, initial confirmation
- **Green (#4CAF50)**: Success, progress, safety
- **Purple (#8A5AD0)**: Luxury, quality, craftsmanship  
- **Blue (#2196F3)**: Tracking, information, reliability
- **Orange (#FF9800)**: Urgency, attention, time-sensitive alerts

---

## 🔧 Template Variables Reference

### Global Variables (Used in All Templates)

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `{{BRAND_LOGO_URL}}` | URL | Company logo image URL | `https://example.com/logo.png` |
| `{{ORDER_ID}}` | String | Unique order identifier | `ORD-123456789` |
| `{{CUSTOMER_NAME}}` | String | Customer first name or full name | `Rahul` |
| `{{ORDER_DATE}}` | Date | Order placement date | `March 15, 2026` |
| `{{TOTAL_AMOUNT}}` | Number | Total order amount (₹) | `2499` |
| `{{SHIPPING_NAME}}` | String | Delivery recipient name | `Rahul Kumar` |
| `{{SHIPPING_ADDRESS}}` | String | Street address | `123 Gomti Nagar` |
| `{{SHIPPING_CITY}}` | String | City name | `Lucknow` |
| `{{SHIPPING_STATE}}` | String | State name | `Uttar Pradesh` |
| `{{SHIPPING_PIN}}` | String | PIN code | `226010` |
| `{{SHIPPING_PHONE}}` | String | Contact number | `+91 98765 43210` |
| `{{PRODUCTS}}` | Array | List of order items (see Product Schema) | - |
| `{{TRACKING_URL}}` | URL | Order tracking page link | `https://yoursite.com/tracking/ORD-123` |
| `{{WHATSAPP_SUPPORT_URL}}` | URL | WhatsApp support chat link | `https://wa.me/919876543210` |
| `{{INSTAGRAM_URL}}` | URL | Instagram profile link | `https://instagram.com/eshopperluxe` |
| `{{SUPPORT_EMAIL}}` | Email | Customer support email | `support@eshopperluxe.com` |
| `{{SUPPORT_PHONE}}` | Phone | Support phone number | `+91 98765 43210` |
| `{{PRIVACY_POLICY_URL}}` | URL | Privacy policy page | `https://yoursite.com/privacy` |
| `{{TERMS_URL}}` | URL | Terms of service page | `https://yoursite.com/terms` |

### Product Object Schema

Each item in the `{{PRODUCTS}}` array should have:

```javascript
{
  name: "Premium Cotton T-Shirt",        // Product name
  image: "https://example.com/img.jpg",  // Product image URL (80x80px recommended)
  category: "Men's Fashion",             // Product category
  quantity: 2,                           // Quantity ordered
  price: 999                             // Per-item price (₹)
}
```

### Template-Specific Variables

#### 02-order-confirmed.html
| Variable | Description | Example |
|----------|-------------|---------|
| `{{ESTIMATED_DELIVERY_DATE}}` | Expected delivery date | `March 20, 2026` |
| `{{GST_AMOUNT}}` | GST/tax amount | `150` |
| `{{TRANSACTION_ID}}` | Payment transaction ID | `TXN202603151234` |
| `{{BILLING_NAME}}` | Billing name (if different) | `Rahul Kumar` |
| `{{CUSTOMER_EMAIL}}` | Customer email address | `rahul@example.com` |
| `{{INVOICE_URL}}` | Proforma invoice link | `https://yoursite.com/invoice/123` |

#### 03-order-packed.html
| Variable | Description | Example |
|----------|-------------|---------|
| `{{PACKED_DATE}}` | Date package was packed | `March 16, 2026` |
| `{{ITEMS_COUNT}}` | Total items in package | `3` |
| `{{PACKAGE_WEIGHT}}` | Package weight | `1.2 kg` |

#### 04-order-shipped.html & 05-out-for-delivery.html
| Variable | Description | Example |
|----------|-------------|---------|
| `{{COURIER_NAME}}` | Courier service name | `Delhivery` |
| `{{AWB_NUMBER}}` | Tracking/AWB number | `DELHIV123456789` |
| `{{SHIPPED_DATE}}` | Shipment dispatch date | `March 17, 2026` |
| `{{CARRIER_WEBSITE}}` | Courier tracking website | `https://www.delhivery.com/track` |

#### 05-out-for-delivery.html (Additional)
| Variable | Description | Example |
|----------|-------------|---------|
| `{{DELIVERY_TIME_SLOT}}` | Expected delivery time | `4:00 PM - 6:00 PM` |
| `{{AGENT_NAME}}` | Delivery agent name | `Rajesh` |
| `{{AGENT_PHONE}}` | Delivery agent contact | `+91 98765 00000` |
| `{{LIVE_MAP_URL}}` | Live tracking map link | `https://yoursite.com/live-map/ORD-123` |

#### 06-order-delivered.html
| Variable | Description | Example |
|----------|-------------|---------|
| `{{DELIVERED_DATE}}` | Actual delivery date | `March 18, 2026` |
| `{{RECEIVED_BY}}` | Person who received package | `Self / Rahul` |
| `{{TAX_INVOICE_URL}}` | Tax invoice PDF download link | `https://yoursite.com/invoice/tax/123.pdf` |
| `{{RATING_URL}}` | Rating submission page | `https://yoursite.com/rate/ORD-123` |
| `{{REVIEW_URL}}` | Full review form page | `https://yoursite.com/review/ORD-123` |
| `{{REFERRAL_URL}}` | Referral program page | `https://yoursite.com/refer` |
| `{{REFERRAL_CODE}}` | User's unique referral code | `LUXE2026RAHUL` |
| `{{RETURN_POLICY_URL}}` | Return policy page | `https://yoursite.com/returns` |

---

## 🚀 Integration Guide

### Step 1: Install Template Engine

```bash
npm install handlebars
```

### Step 2: Load Template Function (server.js)

```javascript
const fs = require('fs').promises;
const Handlebars = require('handlebars');
const path = require('path');

// Load and compile email template
async function loadEmailTemplate(templateName, data) {
  try {
    const templatePath = path.join(__dirname, 'email-templates', templateName);
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);
    return template(data);
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw error;
  }
}
```

### Step 3: Map Order Status to Templates

```javascript
const ORDER_STATUS_TEMPLATES = {
  'placed': '01-order-placed.html',
  'confirmed': '02-order-confirmed.html',
  'packed': '03-order-packed.html',
  'shipped': '04-order-shipped.html',
  'out_for_delivery': '05-out-for-delivery.html',
  'delivered': '06-order-delivered.html'
};
```

### Step 4: Send Email Function

```javascript
const nodemailer = require('nodemailer');

async function sendOrderEmail(order, status) {
  // Prepare template data
  const templateData = {
    BRAND_LOGO_URL: 'https://yoursite.com/logo.png',
    ORDER_ID: order.orderId,
    CUSTOMER_NAME: order.shipping.name.split(' ')[0],
    ORDER_DATE: new Date(order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    TOTAL_AMOUNT: order.totalAmount,
    SHIPPING_NAME: order.shipping.name,
    SHIPPING_ADDRESS: order.shipping.address,
    SHIPPING_CITY: order.shipping.city,
    SHIPPING_STATE: order.shipping.state,
    SHIPPING_PIN: order.shipping.pin,
    SHIPPING_PHONE: order.shipping.phone,
    PRODUCTS: order.products.map(p => ({
      name: p.name,
      image: p.image,
      category: p.category,
      quantity: p.quantity,
      price: p.price
    })),
    TRACKING_URL: `https://yoursite.com/tracking/${order.orderId}`,
    WHATSAPP_SUPPORT_URL: 'https://wa.me/919876543210',
    INSTAGRAM_URL: 'https://instagram.com/eshopperluxe',
    SUPPORT_EMAIL: 'support@eshopperluxe.com',
    SUPPORT_PHONE: '+91 98765 43210',
    PRIVACY_POLICY_URL: 'https://yoursite.com/privacy',
    TERMS_URL: 'https://yoursite.com/terms',
    
    // Add status-specific fields here
    ...(status === 'confirmed' && {
      ESTIMATED_DELIVERY_DATE: order.estimatedDelivery,
      GST_AMOUNT: order.gstAmount,
      TRANSACTION_ID: order.transactionId,
      BILLING_NAME: order.billing?.name || order.shipping.name,
      CUSTOMER_EMAIL: order.email,
      INVOICE_URL: `https://yoursite.com/invoice/${order.orderId}`
    }),
    
    ...(status === 'shipped' && {
      COURIER_NAME: order.courier?.name,
      AWB_NUMBER: order.courier?.awb,
      SHIPPED_DATE: new Date(order.shippedAt).toLocaleDateString('en-IN'),
      CARRIER_WEBSITE: order.courier?.trackingUrl
    })
    // Add more status-specific fields as needed
  };

  // Load template
  const templateFile = ORDER_STATUS_TEMPLATES[status];
  const htmlContent = await loadEmailTemplate(templateFile, templateData);

  // Send email (using Nodemailer or your email service)
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: '"eShopper Luxe" <noreply@eshopperluxe.com>',
    to: order.email,
    subject: getEmailSubject(status, order.orderId),
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
  console.log(`✓ Email sent for ${status}: ${order.orderId}`);
}

function getEmailSubject(status, orderId) {
  const subjects = {
    'placed': `✓ Order Received - ${orderId} | eShopper Luxe`,
    'confirmed': `🎉 Order Confirmed - ${orderId} | eShopper Luxe`,
    'packed': `📦 Order Packed with Care - ${orderId} | eShopper Luxe`,
    'shipped': `🚚 Order Shipped - Track Your Package | ${orderId}`,
    'out_for_delivery': `⏰ Arriving Today! - ${orderId} | eShopper Luxe`,
    'delivered': `🎉 Delivered Successfully - ${orderId} | Rate Your Experience`
  };
  return subjects[status] || `Order Update - ${orderId}`;
}
```

### Step 5: Trigger Emails on Order Status Change

```javascript
// When order is placed
router.post('/api/orders', async (req, res) => {
  const order = await Order.create(req.body);
  await sendOrderEmail(order, 'placed');
  res.json(order);
});

// When admin confirms order
router.patch('/api/orders/:id/confirm', async (req, res) => {
  const order = await Order.findById(req.params.id);
  order.status = 'confirmed';
  order.estimatedDelivery = req.body.estimatedDelivery;
  await order.save();
  await sendOrderEmail(order, 'confirmed');
  res.json(order);
});

// Similar for other status updates
```

---

## 📱 Responsive Design Notes

### Mobile Optimization
- Max-width: 600px (scales down to 320px)
- Font sizes: Minimum 13px for readability
- Touch targets: Buttons min 44x44px
- Images: Responsive with percentage widths

### Email Client Compatibility
✅ **Tested and Working:**
- Gmail (Web, iOS, Android)
- Apple Mail (macOS, iOS)
- Outlook (Web, Desktop)
- Yahoo Mail
- ProtonMail

⚠️ **Known Limitations:**
- Background images not supported in some clients (using gradients instead)
- CSS animations may not work (fallback: static states)
- Web fonts require fallbacks (using system fonts)

---

## 🎨 Customization Tips

### Change Brand Colors

Search and replace hex codes:
- Gold: `#D4AF37` → Your primary color
- Dark BG: `#0A0A0A` → Your background color
- Text: `#B8B8B8` → Your secondary text color

### Add Your Logo

Replace `{{BRAND_LOGO_URL}}` with your hosted logo:
- Recommended size: 180x50px
- Format: PNG with transparent background
- Host on CDN for fast loading

### Modify Content

All text content is directly in HTML - no external files needed. Edit directly in template files.

---

## 🧪 Testing Guide

### 1. Test with Sample Data

```javascript
const sampleOrder = {
  orderId: 'TEST-123456',
  email: 'your-email@example.com',
  shipping: {
    name: 'Test User',
    address: '123 Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin: '400001',
    phone: '+91 98765 43210'
  },
  products: [
    {
      name: 'Sample Product',
      image: 'https://via.placeholder.com/80',
      category: 'Test Category',
      quantity: 1,
      price: 999
    }
  ],
  totalAmount: 999,
  createdAt: new Date()
};

await sendOrderEmail(sampleOrder, 'placed');
```

### 2. Preview in Browser

Open template files directly in browser with mock data using:
```bash
# Install http-server globally
npm install -g http-server

# Serve templates
http-server email-templates -p 8080
```

### 3. Send Test Emails

Use [Litmus](https://www.litmus.com/) or [Email on Acid](https://www.emailonacid.com/) for professional testing across 90+ email clients.

---

## 🔒 Security Best Practices

1. **Sanitize User Input**: Always escape user-generated content
2. **Use HTTPS URLs**: All links and images must use HTTPS
3. **No JavaScript**: Email clients block JS - use server-side logic
4. **Anti-Phishing**: Include unsubscribe link and company address
5. **SPF/DKIM**: Configure email authentication to avoid spam folders

---

## 📊 Analytics Integration

### Track Email Opens

Add tracking pixel at bottom of template:

```html
<img src="{{ANALYTICS_URL}}/pixel?orderId={{ORDER_ID}}&email=opened" 
     width="1" height="1" style="display:none;" />
```

### Track Button Clicks

Wrap links with UTM parameters:

```handlebars
{{TRACKING_URL}}?utm_source=email&utm_medium=notification&utm_campaign=order_{{STATUS}}
```

---

## 📝 Changelog

### Version 1.0.0 (March 2026)
- ✅ Initial release with 6 premium templates
- ✅ Complete order lifecycle coverage
- ✅ Mobile-responsive design
- ✅ Handlebars template engine support
- ✅ 40+ dynamic variables

---

## 💡 FAQ

**Q: Can I use a different template engine?**  
A: Yes! Templates use simple `{{VARIABLE}}` syntax. Compatible with Mustache, Pug, EJS with minor adjustments.

**Q: How do I add more product details?**  
A: Extend the Product Schema in Step 4. Add fields like size, color, SKU to the products array mapping.

**Q: Can I add attachments (PDF invoices)?**  
A: Yes! Use `attachments` option in Nodemailer:
```javascript
mailOptions.attachments = [{
  filename: `invoice-${order.orderId}.pdf`,
  path: `/path/to/invoice.pdf`
}];
```

**Q: How do I handle failed emails?**  
A: Implement retry logic with exponential backoff or use a job queue like BullMQ:
```javascript
emailQueue.add('sendEmail', { order, status }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});
```

---

## 📞 Support

For technical issues or customization help:
- 📧 Email: dev@eshopperluxe.com
- 💬 Discord: [Join Server](https://discord.gg/eshopperluxe)
- 📚 Docs: [Full Documentation](https://docs.eshopperluxe.com)

---

## 📜 License

© 2026 eShopper Luxe. All rights reserved.  
These templates are proprietary and licensed for use with eShopper Luxe platform only.

---

**Built with ❤️ by the eShopper Luxe Team**
