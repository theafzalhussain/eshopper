// === COMPLETE LUXURY EMAIL & INVOICE SYSTEM ===
// 🎯 6 Functions Ready to Copy-Paste into server.js

// === REPLACEMENT 1: buildOrderReceiptHtml (Line 628-877) ===

const buildOrderReceiptHtml = ({
    orderId,
    userName,
    userEmail,
    paymentMethod,
    paymentStatus,
    finalAmount,
    totalAmount,
    shippingAmount,
    shippingAddress,
    products,
    orderDate
}) => {
    const displayName = userName || 'Valued Customer';
    const safeProducts = Array.isArray(products) ? products : [];
    const orderDateObj = new Date(orderDate || Date.now());
    const orderDateText = orderDateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const subtotal = Number(totalAmount || safeProducts.reduce((sum, item) => sum + Number(item.total || (item.price * item.qty) || 0), 0));
    const shipping = Number(shippingAmount ?? Math.max(0, Number(finalAmount || 0) - subtotal));
    const payable = Number(finalAmount || (subtotal + shipping));

    const rows = safeProducts.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const line = Number(item.total || (qty * price));
        const sizeText = item.size ? ` (Size: ${item.size})` : '';
        const colorText = item.color ? `, ${item.color}` : '';
        const itemDesc = `${item.name || 'Product'}${sizeText}${colorText}`;
        return `
            <tr>
                <td style="padding:12px 10px; text-align:center; font-size:12px; color:#666; border:1px solid #e8dcc8;">${idx + 1}</td>
                <td style="padding:12px 10px; font-size:13px; color:#111; font-weight:600; border:1px solid #e8dcc8;">${itemDesc}</td>
                <td style="padding:12px 10px; text-align:center; font-size:13px; color:#111; border:1px solid #e8dcc8;">${qty}</td>
                <td style="padding:12px 10px; text-align:right; font-size:13px; color:#666; border:1px solid #e8dcc8;">₹${price.toLocaleString('en-IN')}</td>
                <td style="padding:12px 10px; text-align:right; font-size:14px; color:#d4af37; font-weight:700; border:1px solid #e8dcc8;">₹${line.toLocaleString('en-IN')}</td>
            </tr>
        `;
    }).join('');

    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { background: #ffffff; color: #2c2c2c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; }
                .wrap { max-width: 900px; margin: 0 auto; padding: 0; }
                .card { background: #ffffff; border: 3px solid #d4af37; border-radius: 0; overflow: hidden; }
                
                .head { padding: 24px 20px; background: #ffffff; border-bottom: 2px solid #d4af37; }
                .brand-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .brand-left { width: 70px; text-align: left; vertical-align: middle; }
                .brand-center { text-align: center; vertical-align: middle; }
                .brand-spacer { width: 70px; }
                .logo-emoji { font-size: 48px; line-height: 1; }
                .brand-title { font-size: 28px; font-weight: 900; color: #d4af37; letter-spacing: 2px; margin: 0; line-height: 1.2; text-transform: uppercase; }
                .tagline { font-size: 11px; color: #8b7521; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 6px 0 0 0; }
                
                .body { padding: 32px 24px; }
                .doc-title { font-size: 32px; font-weight: 900; margin: 0 0 8px; color: #d4af37; letter-spacing: 2px; text-align: center; text-transform: uppercase; }
                .subtitle { font-size: 12px; color: #8b7521; text-align: center; font-weight: 700; letter-spacing: 1px; margin-bottom: 32px; }
                
                .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 28px; }
                .meta-box { border: 2px solid #d4af37; padding: 16px; background: #fffef8; border-radius: 0; }
                .meta-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b7521; font-weight: 800; margin-bottom: 8px; }
                .meta-value { font-size: 14px; font-weight: 900; color: #0f0f0f; }
                
                .address-section { margin: 28px 0; border: 2px solid #d4af37; padding: 20px; background: #fffef8; }
                .address-title { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #0f0f0f; font-weight: 900; margin-bottom: 12px; }
                .address-text { font-size: 13px; color: #333; line-height: 1.8; }
                
                .items-section { margin: 28px 0; }
                .section-title { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #0f0f0f; font-weight: 900; margin-bottom: 12px; }
                
                table.items { width: 100%; border-collapse: collapse; background: #fff; border: 2px solid #d4af37; }
                table.items th { background: #d4af37; color: #0f0f0f; font-size: 11px; letter-spacing: 1px; padding: 12px 10px; text-transform: uppercase; font-weight: 900; text-align: left; border: 1px solid #c09d2f; }
                table.items td { padding: 12px 10px; font-size: 13px; color: #2c2c2c; }
                
                .totals-section { margin: 28px 0; }
                .totals-table { width: 100%; max-width: 400px; margin-left: auto; border-collapse: collapse; }
                .totals-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e8dcc8; font-size: 14px; }
                .totals-row.grand { border-top: 3px solid #d4af37; border-bottom: none; padding-top: 14px; margin-top: 8px; }
                .totals-label { color: #666; font-weight: 600; }
                .totals-value { color: #0f0f0f; font-weight: 700; }
                .grand .totals-label { color: #d4af37; font-size: 16px; font-weight: 900; text-transform: uppercase; }
                .grand .totals-value { color: #d4af37; font-size: 20px; font-weight: 900; }
                
                .footer-note { margin: 32px 0 0 0; padding: 16px; border-left: 4px solid #d4af37; background: #fffef8; font-size: 11px; color: #555; line-height: 1.8; }
                .footer-note strong { color: #0f0f0f; }
                
                .footer { margin-top: 28px; padding-top: 16px; border-top: 2px solid #e8dcc8; text-align: center; }
                .foot-text { font-size: 11px; color: #666; line-height: 1.8; }
                .foot-brand { font-size: 12px; color: #d4af37; font-weight: 900; margin-top: 12px; letter-spacing: 1px; }
                
                @media print {
                    body { background: white; }
                    .card { border: 3px solid #d4af37; }
                }
            </style>
        </head>
        <body>
            <div class="wrap">
                <div class="card">
                    <div class="head">
                        <table class="brand-table" role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td class="brand-left">
                                    <div class="logo-emoji">💎</div>
                                </td>
                                <td class="brand-center">
                                    <p class="brand-title">ORDER RECEIPT</p>
                                    <p class="tagline">eShopper Boutique Luxe</p>
                                </td>
                                <td class="brand-spacer"></td>
                            </tr>
                        </table>
                    </div>

                    <div class="body">
                        <h1 class="doc-title">ORDER RECEIPT</h1>
                        <p class="subtitle">Thank you for your selection</p>
                        
                        <div class="meta-grid">
                            <div class="meta-box">
                                <div class="meta-label">🆔 Order ID</div>
                                <div class="meta-value">${orderId}</div>
                            </div>
                            <div class="meta-box">
                                <div class="meta-label">📅 Order Date</div>
                                <div class="meta-value">${orderDateText}</div>
                            </div>
                            <div class="meta-box">
                                <div class="meta-label">💳 Payment Mode</div>
                                <div class="meta-value">${paymentMethod || 'Cash on Delivery'}</div>
                            </div>
                            <div class="meta-box">
                                <div class="meta-label">📊 Payment Status</div>
                                <div class="meta-value">${paymentStatus || 'Pending'}</div>
                            </div>
                        </div>

                        <div class="address-section">
                            <div class="address-title">📍 SHIPPING TO</div>
                            <div class="address-text">
                                <strong>${shippingAddress?.fullName || displayName}</strong><br/>
                                ${shippingAddress?.addressline1 || 'Address Line 1'}<br/>
                                ${shippingAddress?.city || 'City'}, ${shippingAddress?.state || 'State'} - ${shippingAddress?.pin || 'PIN'}<br/>
                                ${shippingAddress?.country || 'India'}<br/>
                                <strong>Phone:</strong> ${shippingAddress?.phone || 'N/A'}<br/>
                                <strong>Email:</strong> ${userEmail || 'N/A'}
                            </div>
                        </div>

                        <div class="items-section">
                            <div class="section-title">📦 ORDER DETAILS</div>
                            <table class="items">
                                <thead>
                                    <tr>
                                        <th style="width:8%; text-align:center;">S.No</th>
                                        <th style="width:45%;">Item Description</th>
                                        <th style="width:12%; text-align:center;">Quantity</th>
                                        <th style="width:18%; text-align:right;">Unit Price</th>
                                        <th style="width:17%; text-align:right;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rows || '<tr><td colspan="5" style="text-align:center;padding:20px;">No items found</td></tr>'}
                                </tbody>
                            </table>
                        </div>

                        <div class="totals-section">
                            <div style="width: 100%; max-width: 400px; margin-left: auto; border: 2px solid #d4af37; padding: 16px; background: #fffef8;">
                                <div class="totals-row">
                                    <span class="totals-label">Subtotal:</span>
                                    <span class="totals-value">₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div class="totals-row">
                                    <span class="totals-label">Shipping:</span>
                                    <span class="totals-value">${shipping <= 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</span>
                                </div>
                                <div class="totals-row grand">
                                    <span class="totals-label">GRAND TOTAL:</span>
                                    <span class="totals-value">₹${payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                            </div>
                        </div>

                        <div class="footer-note">
                            <strong>Thank you for your selection.</strong> Your items are being prepared by our artisans. This is a computer-generated receipt and does not require a signature.
                        </div>

                        <div class="footer">
                            <div class="foot-text">
                                For support: <strong>support@eshopperr.me</strong><br/>
                                Website: <strong>eshopperr.me</strong>
                            </div>
                            <div class="foot-brand">💎 eShopper Boutique Luxe • Premium Fashion Destination 💎</div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};
