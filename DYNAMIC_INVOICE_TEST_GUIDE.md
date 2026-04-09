# 🎯 Dynamic Invoice Download System - Test Guide

## ✅ Implementation Complete

### **System Overview**
Single endpoint `/api/orders/:id/download-invoice` automatically serves the correct PDF based on order status.

---

## 📋 Testing Checklist

### **Test Case 1: Order Placed / Pending Status**
- **Order Status**: `Ordered` / `Order Placed`
- **Expected Button Text**: `📄 Download Receipt`
- **Expected PDF**: Order Receipt (basic acknowledgment)
- **Filename Pattern**: `Receipt-<orderId>.pdf`

**Steps to Test:**
1. Place a new order from the frontend
2. Navigate to "My Orders" page
3. Click on the order card
4. Verify button shows "📄 Download Receipt"
5. Click download button
6. Verify PDF filename starts with "Receipt-"
7. Open PDF and confirm it's a receipt (no detailed breakdown)

---

### **Test Case 2: Confirmed/Shipped Status**
- **Order Status**: `Confirmed`, `Packed`, `Shipped`, `Out for Delivery`
- **Expected Button Text**: `📄 Download Proforma`
- **Expected PDF**: Proforma Confirmation Invoice (detailed pre-delivery document)
- **Filename Pattern**: `Confirmation-<orderId>.pdf`

**Steps to Test:**
1. Have admin confirm an order via `/api/admin/confirm-order`
2. Navigate to "My Orders" page
3. Click on the confirmed order
4. Verify button shows "📄 Download Proforma"
5. Click download button
6. Verify PDF filename starts with "Confirmation-"
7. Open PDF and confirm it shows:
   - Full product breakdown
   - Estimated delivery date
   - Shipping details
   - Proforma/Confirmation branding

---

### **Test Case 3: Delivered Status**
- **Order Status**: `Delivered`
- **Expected Button Text**: `📄 Download Tax Invoice`
- **Expected PDF**: Final Tax Invoice (legal document with GST breakdown)
- **Filename Pattern**: `TaxInvoice-<orderId>.pdf`

**Steps to Test:**
1. Have admin mark order as "Delivered" via status update API
2. Navigate to "My Orders" page
3. Click on the delivered order
4. Verify button shows "📄 Download Tax Invoice"
5. Click download button
6. Verify PDF filename starts with "TaxInvoice-"
7. Open PDF and confirm it shows:
   - Complete itemized breakdown
   - GST/Tax calculations
   - Legal invoice number
   - Payment confirmation
   - Company registration details
   - Final tax invoice branding

---

## 🔧 Backend Implementation Details

### **Endpoint:**
```
GET /api/orders/:id/download-invoice?userId=<userId>
```

### **Status Detection Logic:**
```javascript
const orderStatus = order.orderStatus.toLowerCase()

if (orderStatus === 'delivered') {
    pdfType = 'final'
    fileName = 'TaxInvoice-...'
} else if (['confirmed', 'packed', 'shipped', 'out for delivery'].includes(orderStatus)) {
    pdfType = 'confirmation'
    fileName = 'Confirmation-...'
} else {
    pdfType = 'receipt'
    fileName = 'Receipt-...'
}
```

### **Security:**
- ✅ User authentication via `userId` query parameter
- ✅ Order ownership verification (`orderId + userid` match)
- ✅ PDF buffer streaming (no server storage)
- ✅ Timeout protection (120s max generation time)
- ✅ Buffer validation (min 500 bytes)

---

## 🎨 Frontend Components

### **MyOrders.jsx**
- Dynamic button label via `getDocumentLabel(status)`
- Loading state: "Preparing PDF..."
- Download function: `downloadOrderDocument(orderId)`
- Endpoint: `/api/orders/${orderId}/download-invoice?userId=${userId}`

### **OrderTracking.jsx**
- Dynamic button label via `getDocumentLabel(status)`
- Loading state: "Preparing PDF..."
- Download function: `downloadOrderDocument()`
- Endpoint: `/api/orders/${orderId}/download-invoice?userId=${userId}`

---

## 🚀 Quick Manual Test Commands

### **Test Receipt Download (Order Placed):**
```bash
curl -X GET "http://localhost:8000/api/orders/ESHP-2026-0001/download-invoice?userId=USER_ID_HERE" \
  -H "Accept: application/pdf" \
  --output test-receipt.pdf
```

### **Test Proforma Download (Confirmed):**
```bash
# First confirm the order via admin API
curl -X POST "http://localhost:8000/api/admin/confirm-order" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ESHP-2026-0001", "adminSecret": "YOUR_ADMIN_SECRET"}'

# Then download proforma
curl -X GET "http://localhost:8000/api/orders/ESHP-2026-0001/download-invoice?userId=USER_ID_HERE" \
  -H "Accept: application/pdf" \
  --output test-proforma.pdf
```

### **Test Tax Invoice Download (Delivered):**
```bash
# First mark as delivered
curl -X POST "http://localhost:8000/api/update-order-status" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ESHP-2026-0001", "status": "Delivered"}'

# Then download final invoice
curl -X GET "http://localhost:8000/api/orders/ESHP-2026-0001/download-invoice?userId=USER_ID_HERE" \
  -H "Accept: application/pdf" \
  --output test-tax-invoice.pdf
```

---

## ⚠️ Common Issues & Fixes

### **Issue: 404 Order Not Found**
- **Cause**: Wrong `orderId` or `userId` mismatch
- **Fix**: Verify both parameters match the actual order

### **Issue: PDF generation timeout**
- **Cause**: Puppeteer taking too long
- **Fix**: Check server resources, consider increasing timeout

### **Issue: Blank/corrupt PDF**
- **Cause**: Buffer size < 500 bytes
- **Fix**: Check `generateInvoicePdfBuffer` function logs and HTML template rendering

### **Issue: Wrong PDF type served**
- **Cause**: Status normalization issue
- **Fix**: Verify `order.orderStatus` is properly normalized

---

## 📊 Expected Log Output

```
📥 Dynamic Invoice Download: ESHP-2026-0001 | Status: ordered → PDF Type: receipt
✅ Dynamic invoice generated: Receipt-ESHP-2026-0001.pdf (34567 bytes)

📥 Dynamic Invoice Download: ESHP-2026-0002 | Status: confirmed → PDF Type: confirmation
✅ Dynamic invoice generated: Confirmation-ESHP-2026-0002.pdf (45678 bytes)

📥 Dynamic Invoice Download: ESHP-2026-0003 | Status: delivered → PDF Type: final
✅ Dynamic invoice generated: TaxInvoice-ESHP-2026-0003.pdf (56789 bytes)
```

---

## ✨ Features Highlights

1. **Single Button, Three PDFs**: No need for multiple buttons or confusion
2. **Auto-Update**: Button text changes as order progresses
3. **Secure**: User can only download their own orders
4. **Fast**: Direct buffer streaming (no disk writes)
5. **Error-Resilient**: Graceful fallbacks and user-friendly messages
6. **Production-Ready**: Sentry integration, timeout protection, logging

---

## 🎉 Success Criteria

- ✅ User can download receipt immediately after order placement
- ✅ User can download proforma after admin confirmation
- ✅ User can download final tax invoice after delivery
- ✅ Button label updates automatically based on status
- ✅ No manual PDF type selection required
- ✅ All PDFs render correctly with branding
- ✅ Filename convention is consistent
- ✅ Security checks prevent unauthorized access

---

**Last Updated**: March 7, 2026  
**Status**: ✅ Implementation Complete & Tested
