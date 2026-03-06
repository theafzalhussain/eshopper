// === COMPLETE LUXURY EMAIL & PDF SYSTEM ===
// 🎯 All 6 Functions Ready for Replacement in server.js
// Key Features: 💎 emoji logos, Dark emails (#0A0A0A), White PDFs, GST breakdown

// === FUNCTION 1: buildOrderReceiptHtml (Line 628) ===
// Purpose: Order Placement Receipt PDF - NO estimated delivery date
// Design: White PDF with gold border, 💎 emoji logo
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

// === FUNCTION 2: buildOrderConfirmationProformaHtml (Line 873) ===
// Purpose: Proforma Invoice PDF with QR code and verification badge
// Design: White PDF with gold border, watermark, 💎 emoji logo
const buildOrderConfirmationProformaHtml = ({
    orderId,
    userName,
    userEmail,
    paymentMethod,
    finalAmount,
    totalAmount,
    shippingAmount,
    shippingAddress,
    products,
    orderDate,
    estimatedArrival,
    deliveryPartner
}) => {
    const displayName = userName || 'Valued Customer';
    const safeProducts = Array.isArray(products) ? products : [];
    const orderDateObj = new Date(orderDate || Date.now());
    const orderDateText = orderDateObj.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const expectedDate = new Date(estimatedArrival || (Date.now() + 6 * 24 * 60 * 60 * 1000));
    const expectedDateText = expectedDate.toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const subtotal = Number(totalAmount || safeProducts.reduce((sum, item) => sum + Number(item.total || (item.price * item.qty) || 0), 0));
    const shipping = Number(shippingAmount ?? Math.max(0, Number(finalAmount || 0) - subtotal));
    const payable = Number(finalAmount || (subtotal + shipping));

    const partner = deliveryPartner || 'Delhivery';
    const trackingLink = `${BRAND_SITE_URL}/order-tracking/${encodeURIComponent(orderId || '')}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(trackingLink)}`;

    const rows = safeProducts.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const line = Number(item.total || (qty * price));
        const itemDesc = item.name ? `${item.name}${item.size ? ` • Size: ${item.size}` : ''}${item.color ? ` • ${item.color}` : ''}` : 'Product';
        return `
            <tr>
                <td style="width:8%; text-align:center; padding:10px 8px;">${String(idx + 1).padStart(2, '0')}</td>
                <td style="width:52%; padding:10px 8px;"><strong>${itemDesc}</strong><br/><span style="font-size:10px;color:#16a34a;">✓ Quality Inspected</span></td>
                <td style="width:10%; text-align:center; font-weight:700; padding:10px 8px;">${qty}</td>
                <td style="width:15%; text-align:right; font-weight:700; padding:10px 8px;">₹${price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style="width:15%; text-align:right; font-weight:800; color:#d4af37; padding:10px 8px;">₹${line.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
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
                body { background:#ffffff; color:#1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
                .wrap { max-width: 900px; margin: 0 auto; padding: 0; position: relative; }
                .card { background:#fff; border:3px solid #d4af37; border-radius:0; overflow:hidden; position:relative; }
                .watermark { position:absolute; top:150px; left:50%; transform:translateX(-50%) rotate(-18deg); color:rgba(212,175,55,0.08); font-size:56px; font-weight:900; letter-spacing:3px; white-space:nowrap; z-index:0; }
                .head { padding:24px 20px; background:#ffffff; border-bottom:2px solid #d4af37; position:relative; z-index:1; }
                .brand-table { width:100%; border-collapse:collapse; table-layout:fixed; }
                .brand-left { width:70px; text-align:left; vertical-align:middle; }
                .brand-center { text-align:center; vertical-align:middle; }
                .brand-spacer { width:70px; }
                .logo-emoji { font-size:48px; line-height:1; }
                .brand-title { font-size:26px; font-weight:900; color:#d4af37; letter-spacing:2px; }
                .tagline { font-size:11px; color:#8b7521; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; margin-top:6px; }
                .badge { display:inline-block; margin-top:12px; background:linear-gradient(135deg,#16a34a,#22c55e); color:#fff; font-size:11px; font-weight:900; padding:8px 14px; border-radius:16px; letter-spacing:1px; }
                .body { padding:28px 24px; position:relative; z-index:1; }
                .delivery-highlight { border:2px solid #d4af37; border-radius:0; padding:18px; background:#fffef8; margin-bottom:20px; }
                .delivery-label { font-size:11px; letter-spacing:1.5px; color:#8b7521; font-weight:800; text-transform:uppercase; margin-bottom:10px; }
                .delivery-value { font-size:20px; color:#0f0f0f; font-weight:900; margin-bottom:6px; }
                .delivery-sub { font-size:13px; color:#555; }
                .meta-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:20px; }
                .meta-box { border:2px solid #d4af37; border-radius:0; padding:12px; background:#fffef8; }
                .meta-label { font-size:10px; color:#8b7521; text-transform:uppercase; letter-spacing:1.5px; font-weight:800; margin-bottom:8px; }
                .meta-value { font-size:13px; font-weight:900; color:#0f0f0f; }
                table { width:100%; border-collapse:collapse; border:2px solid #d4af37; }
                th { background:#d4af37; color:#0f0f0f; text-transform:uppercase; font-size:11px; letter-spacing:1px; font-weight:900; padding:12px 8px; text-align:left; }
                td { border:1px solid #e8dcc8; padding:10px 8px; font-size:12px; }
                tbody tr:nth-child(odd) { background:#ffffff; }
                tbody tr:nth-child(even) { background:#f9f7f4; }
                .summary { margin-top:16px; margin-left:auto; width:350px; border:2px solid #d4af37; border-radius:0; padding:14px 16px; background:#fffef8; }
                .summary-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e8dcc8; font-size:13px; }
                .summary-row:last-child { border-bottom:none; }
                .summary-row.grand { font-weight:900; font-size:16px; color:#d4af37; padding-top:12px; border-top:3px solid #d4af37; }
                .footer-section { display:flex; justify-content:space-between; gap:16px; margin-top:24px; }
                .terms { flex:1; border-left:4px solid #d4af37; background:#fffef8; padding:12px 14px; font-size:11px; color:#555; line-height:1.7; }
                .qr-box { width:130px; text-align:center; }
                .qr-box img { width:110px; height:110px; border:2px solid #d4af37; border-radius:0; background:#fff; }
                .qr-label { font-size:10px; color:#666; margin-top:8px; font-weight:700; }
            </style>
        </head>
        <body>
            <div class="wrap">
                <div class="card">
                    <div class="watermark">VERIFIED & CONFIRMED</div>
                    <div class="head">
                        <table class="brand-table" role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td class="brand-left">
                                    <div class="logo-emoji">💎</div>
                                </td>
                                <td class="brand-center">
                                    <p class="brand-title">PROFORMA INVOICE</p>
                                    <p class="tagline">eShopper Boutique Luxe</p>
                                </td>
                                <td class="brand-spacer"></td>
                            </tr>
                        </table>
                        <div style="text-align:center;">
                            <span class="badge">✓ VERIFIED & CONFIRMED</span>
                        </div>
                    </div>

                    <div class="body">
                        <div class="delivery-highlight">
                            <div class="delivery-label">📅 Expected Delivery</div>
                            <div class="delivery-value">${expectedDateText}</div>
                            <div class="delivery-sub">Delivery Partner: ${partner}</div>
                        </div>

                        <div class="meta-grid">
                            <div class="meta-box">
                                <div class="meta-label">🆔 Order ID</div>
                                <div class="meta-value">${orderId || '-'}</div>
                            </div>
                            <div class="meta-box">
                                <div class="meta-label">📅 Confirmed On</div>
                                <div class="meta-value">${orderDateText}</div>
                            </div>
                            <div class="meta-box">
                                <div class="meta-label">💳 Payment</div>
                                <div class="meta-value">${paymentMethod || 'COD'}</div>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="width:8%">#</th>
                                    <th style="width:52%">Itemized Detail</th>
                                    <th style="width:10%">Qty</th>
                                    <th style="width:15%">Unit Price</th>
                                    <th style="width:15%">Total</th>
                                </tr>
                            </thead>
                            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:16px;">No items found</td></tr>'}</tbody>
                        </table>

                        <div class="summary">
                            <div class="summary-row"><span>Subtotal:</span><span>₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                            <div class="summary-row"><span>Shipping:</span><span>${shipping <= 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</span></div>
                            <div class="summary-row grand"><span>GRAND TOTAL:</span><span>₹${payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                        </div>

                        <div class="footer-section">
                            <div class="terms">
                                <strong>Cancellation & Return Policy:</strong><br/>
                                Orders can be cancelled before dispatch. Returns accepted within policy window for eligible items in original condition with tags and packaging intact. This is a proforma invoice for your records.
                            </div>
                            <div class="qr-box">
                                <img src="${qrSrc}" alt="Track Order" onerror="this.style.display='none'"/>
                                <div class="qr-label">Scan to Track Order</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

// === FUNCTION 3: buildTaxInvoiceHtml (Line 1036) ===
// Purpose: Final Tax Invoice PDF with FULL GST Breakdown (CGST 9% + SGST 9%)
// Design: White PDF with gold border, PAID watermark, 💎 emoji logo, HSN codes
const buildTaxInvoiceHtml = ({
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
    const orderDateText = new Date(orderDate || Date.now()).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const subtotal = Number(totalAmount || safeProducts.reduce((sum, item) => sum + Number(item.total || (item.price * item.qty) || 0), 0));
    const shipping = Number(shippingAmount ?? Math.max(0, Number(finalAmount || 0) - subtotal));
    const payable = Number(finalAmount || (subtotal + shipping));

    const rows = safeProducts.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const line = Number(item.total || (qty * price));
        const itemDesc = item.name ? `${item.name}${item.size ? ` • Size: ${item.size}` : ''}${item.color ? ` • ${item.color}` : ''}` : 'Product';
        const hsn = item.hsn || '6204';
        const unitPrice = price;
        const discountPct = item.discountPercent || 0;
        
        // GST Breakdown: Total 18% = CGST 9% + SGST 9%
        const cgstRate = 9;
        const sgstRate = 9;
        const cgstAmount = Math.round((line * cgstRate) / 100);
        const sgstAmount = Math.round((line * sgstRate) / 100);
        const totalTax = cgstAmount + sgstAmount;

        return `
            <tr>
                <td style="width:5%; text-align:center; padding:10px 6px;">${String(idx + 1).padStart(2, '0')}</td>
                <td style="width:5%; text-align:center; padding:10px 6px; font-weight:600; font-size:11px;">${hsn}</td>
                <td style="width:32%; padding:10px 8px;"><strong>${itemDesc}</strong></td>
                <td style="width:7%; text-align:center; padding:10px 6px;">${qty}</td>
                <td style="width:11%; text-align:right; padding:10px 6px; font-weight:600;">₹${unitPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style="width:8%; text-align:center; padding:10px 6px;">${discountPct}%</td>
                <td style="width:11%; text-align:right; padding:10px 6px; font-weight:600;">₹${line.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style="width:10%; text-align:right; padding:10px 6px; font-weight:700; color:#16a34a; font-size:11px;">
                    CGST: ₹${cgstAmount.toLocaleString('en-IN')}<br/>
                    SGST: ₹${sgstAmount.toLocaleString('en-IN')}
                </td>
                <td style="width:11%; text-align:right; padding:10px 6px; font-weight:700; color:#d4af37;">₹${(line + totalTax).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
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
                @page { size: A4 landscape; margin: 10mm; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { background: #f5f5f3; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.5; }
                .wrap { max-width: 1200px; margin: 0 auto; padding: 12px; position: relative; }
                
                .paid-stamp {
                    position: fixed;
                    top: 35%;
                    right: 12%;
                    transform: rotate(25deg);
                    font-size: 72px;
                    font-weight: 900;
                    color: rgba(22, 163, 74, 0.12);
                    white-space: nowrap;
                    pointer-events: none;
                    z-index: 0;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                    border: 4px solid rgba(22, 163, 74, 0.12);
                    padding: 14px 32px;
                    border-radius: 8px;
                }
                
                .card { background: #fff; border: 3px solid #d4af37; border-radius: 0; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); position: relative; z-index: 1; }
                .head { padding: 20px 20px; background: #ffffff; border-bottom: 2px solid #d4af37; position: relative; }
                .tax-label { position: absolute; top: 18px; right: 20px; font-size: 16px; font-weight: 900; color: #d4af37; letter-spacing: 2px; text-transform: uppercase; }
                .brand-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .brand-left { width: 60px; text-align: left; vertical-align: middle; }
                .brand-center { text-align: center; vertical-align: middle; }
                .brand-spacer { width: 60px; }
                .logo-emoji { font-size: 40px; line-height: 1; }
                .brand-title { font-size: 28px; font-weight: 900; color: #d4af37; letter-spacing: 2px; margin: 0; }
                .tagline { font-size: 10px; color: #8b7521; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 4px 0 0 0; }
                .body { padding: 24px; }
                .seller-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 11px; line-height: 1.7; }
                .seller-box { border: 2px solid #d4af37; padding: 12px; background: #fffef8; border-radius: 0; }
                .seller-title { font-weight: 800; color: #0f0f0f; margin-bottom: 8px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; }
                .seller-text { color: #333; font-size: 11px; }
                .order-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
                .order-box { border: 2px solid #d4af37; padding: 10px; background: #fffef8; border-radius: 0; text-align: center; }
                .order-label { font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b7521; font-weight: 800; margin-bottom: 6px; }
                .order-value { font-size: 12px; font-weight: 900; color: #0f0f0f; }
                .items-section { margin: 20px 0; }
                .section-title { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #0f0f0f; font-weight: 800; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; background: #fff; border: 2px solid #d4af37; }
                th { background: linear-gradient(135deg, #0f0f0f, #1a1a1a); color: #d4af37; font-size: 9px; letter-spacing: 1px; padding: 10px 6px; text-transform: uppercase; font-weight: 900; text-align: left; border: 1px solid #333; white-space: nowrap; }
                td { border: 1px solid #e8dcc8; padding: 10px 6px; font-size: 11px; color: #1a1a1a; }
                tr:nth-child(even) { background: #f9f7f4; }
                tr:nth-child(odd) { background: #fff; }
                tr:hover { background: #fffef8; }
                .summary-section { margin: 18px 0; display: flex; justify-content: flex-end; gap: 16px; }
                .totals { width: 350px; border: 2px solid #d4af37; padding: 12px 14px; background: #fffef8; }
                .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8dcc8; font-size: 12px; }
                .totals-row:last-child { border-bottom: none; }
                .totals-label { color: #666; font-weight: 600; }
                .totals-value { color: #0f0f0f; font-weight: 700; }
                .totals-row.grand { border-top: 3px solid #d4af37; padding-top: 10px; margin-top: 6px; }
                .grand .totals-label { color: #d4af37; font-size: 14px; font-weight: 900; text-transform: uppercase; }
                .grand .totals-value { color: #d4af37; font-size: 16px; font-weight: 900; }
                .payment-info { border: 2px solid #16a34a; padding: 14px; background: rgba(22, 163, 74, 0.05); border-radius: 0; margin: 16px 0; }
                .payment-badge { display: inline-block; background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; padding: 7px 14px; border-radius: 14px; font-weight: 900; font-size: 10px; letter-spacing: 1px; margin-bottom: 8px; }
                .payment-detail { font-size: 11px; color: #333; margin: 5px 0; }
                .footer-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-top: 20px; padding-top: 14px; border-top: 2px solid #e8dcc8; }
                .return-box { border-left: 4px solid #d4af37; padding: 10px 12px; background: #fffef8; font-size: 10px; color: #555; border-radius: 0; }
                .return-title { font-weight: 800; color: #0f0f0f; margin-bottom: 6px; font-size: 10px; }
                .signature-box { text-align: center; }
                .sig-line { border-top: 2px solid #000; margin-bottom: 6px; height: 35px; }
                .sig-label { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: #333; font-weight: 700; }
                .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #e8dcc8; }
                .foot { font-size: 10px; color: #666; text-align: center; line-height: 1.6; }
                .foot-brand { color: #d4af37; font-weight: 900; margin-top: 6px; font-size: 11px; letter-spacing: 1px; }
            </style>
        </head>
        <body>
            <div class="paid-stamp">PAID</div>
            <div class="wrap">
                <div class="card">
                    <div class="head">
                        <div class="tax-label">TAX INVOICE</div>
                        <table class="brand-table" role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td class="brand-left">
                                    <div class="logo-emoji">💎</div>
                                </td>
                                <td class="brand-center">
                                    <p class="brand-title">GSTIN TAX INVOICE</p>
                                    <p class="tagline">eShopper Boutique Luxe</p>
                                </td>
                                <td class="brand-spacer"></td>
                            </tr>
                        </table>
                    </div>

                    <div class="body">
                        <div class="seller-section">
                            <div class="seller-box">
                                <div class="seller-title">📋 Seller Details</div>
                                <div class="seller-text">
                                    <strong>eShopper Boutique Luxe</strong><br/>
                                    Premium Fashion Destination<br/><br/>
                                    <strong>GSTIN:</strong> 07AADCR5055K1Z1<br/>
                                    <strong>PAN:</strong> AADCR5055K<br/>
                                    <strong>Registered Office:</strong><br/>
                                    Plot No. 101, Tech Park,<br/>
                                    New Delhi - 110001, India
                                </div>
                            </div>
                            <div class="seller-box">
                                <div class="seller-title">🛍️ Bill To / Ship To</div>
                                <div class="seller-text">
                                    <strong>${shippingAddress?.fullName || displayName}</strong><br/>
                                    ${shippingAddress?.addressline1 || 'Address Line'}<br/>
                                    ${shippingAddress?.city || 'City'}, ${shippingAddress?.state || 'State'} - ${shippingAddress?.pin || 'PIN'}<br/>
                                    ${shippingAddress?.country || 'India'}<br/>
                                    <strong>Phone:</strong> ${shippingAddress?.phone || 'N/A'}<br/>
                                    <strong>Email:</strong> ${userEmail || 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div class="order-meta">
                            <div class="order-box">
                                <div class="order-label">🆔 Invoice #</div>
                                <div class="order-value">${orderId}</div>
                            </div>
                            <div class="order-box">
                                <div class="order-label">📅 Invoice Date</div>
                                <div class="order-value">Today</div>
                            </div>
                            <div class="order-box">
                                <div class="order-label">📦 Order Date</div>
                                <div class="order-value">${orderDateText}</div>
                            </div>
                        </div>

                        <div class="items-section">
                            <div class="section-title">📦 ITEMIZED BREAKDOWN WITH GST</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width:5%">#</th>
                                        <th style="width:5%">HSN</th>
                                        <th style="width:32%">Description</th>
                                        <th style="width:7%">Qty</th>
                                        <th style="width:11%">Unit Price</th>
                                        <th style="width:8%">Disc %</th>
                                        <th style="width:11%">Taxable Value</th>
                                        <th style="width:10%">GST (18%)<br/><small>CGST 9% + SGST 9%</small></th>
                                        <th style="width:11%">Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:16px;">No items found</td></tr>'}</tbody>
                            </table>
                        </div>

                        <div class="summary-section">
                            <div class="totals">
                                <div class="totals-row"><span class="totals-label">Subtotal (Before Tax):</span><span class="totals-value">₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                                <div class="totals-row"><span class="totals-label">CGST @ 9%:</span><span class="totals-value">₹${Math.round((subtotal * 9) / 100).toLocaleString('en-IN')}</span></div>
                                <div class="totals-row"><span class="totals-label">SGST @ 9%:</span><span class="totals-value">₹${Math.round((subtotal * 9) / 100).toLocaleString('en-IN')}</span></div>
                                <div class="totals-row"><span class="totals-label">Total GST (18%):</span><span class="totals-value">₹${Math.round((subtotal * 18) / 100).toLocaleString('en-IN')}</span></div>
                                <div class="totals-row"><span class="totals-label">Shipping:</span><span class="totals-value">${shipping <= 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</span></div>
                                <div class="totals-row grand"><span class="totals-label">INVOICE TOTAL:</span><span class="totals-value">₹${payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                            </div>
                        </div>

                        <div class="payment-info">
                            <div class="payment-badge">✓ PAYMENT RECEIVED</div>
                            <div class="payment-detail"><strong>Status:</strong> ${paymentStatus === 'Paid' ? 'Paid Successfully' : 'Payment Pending'}</div>
                            <div class="payment-detail"><strong>Payment ID:</strong> PAY-${orderId.substring(0, 8)}</div>
                            <div class="payment-detail"><strong>Mode:</strong> ${paymentMethod || 'Cash on Delivery'}</div>
                        </div>

                        <div class="footer-grid">
                            <div class="return-box">
                                <div class="return-title">📱 RETURN & EXCHANGE POLICY</div>
                                Returns accepted within 7 days of delivery for eligible items in original condition with tags and packaging intact. This invoice provides proof of purchase for GST compliance.
                            </div>
                            <div class="signature-box">
                                <div class="sig-line"></div>
                                <div class="sig-label">Authorized Signatory</div>
                                <div style="font-size:18px; margin-top:8px;">🔒</div>
                            </div>
                        </div>

                        <div class="footer">
                            <div class="foot">
                                This is a computer-generated GST Tax Invoice and does not require a physical signature per GST Rules.<br/>
                                <strong>Support:</strong> support@eshopperr.me | <strong>Website:</strong> eshopperr.me
                            </div>
                            <div class="foot-brand">💎 eShopper Boutique Luxe • TAX INVOICE • GST Compliant • Certified Authentic 💎</div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

// NOTE: The remaining 3 functions (sendOrderStatusEmail, sendOrderPlacedEmail, sendOrderConfirmationEmail)
// are email functions, not PDF functions. They require dark theme (#0A0A0A) with gold accents (#d4af37).
// These will be added in the next section.

// [CONTINUED IN NEXT PART DUE TO LENGTH...]
