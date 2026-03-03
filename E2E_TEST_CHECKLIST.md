# End-to-End Test Checklist
**Testing Premium Features Integration** — Complete in 10 minutes

---

## ✅ Pre-Test Setup
- [ ] Verify `.env` file has these values set:
  - [ ] `BREVO_API_KEY` = your Brevo API key (check Brevo dashboard)
   - [ ] `EVOLUTION_API_URL` = your Railway Evolution API URL
   - [ ] `EVOLUTION_API_KEY` = your Evolution API key
   - [ ] `WHATSAPP_INSTANCE` = your instance name (e.g. `eshopper_bot`)
  - [ ] `FRONTEND_URL` = your app URL (e.g., https://app.example.com)
  - [ ] PORT = 5000 (default)
- [ ] Terminal 1: Run `node server.js` and confirm "Server running on port 5000"
- [ ] Terminal 2: Run `npm start` and confirm React app loads at localhost:3000

---

## 🧪 Test 1: Order Placement + Invoice Generation (3 min)

### Step 1.1 – Create Test Order
1. Open app at `http://localhost:3000`
2. Add 2-3 products to cart (any items)
3. Proceed to checkout
4. Fill address → Select COD payment → Click "Place Order"
5. **Expected**: Order succeeds, you're redirected to order confirmation page

### Step 1.2 – Verify Invoice PDF Email
1. Check email inbox for "Order Confirmation from Boutique Luxe"
2. **Expected**: Email arrives within 5-10 seconds
3. **Content Check**:
   - [ ] Subject: Contains order ID
   - [ ] Body: Gold-themed HTML (should look premium)
   - [ ] Attachment: "Invoice-{OrderId}.pdf" (check email attachments tab)
4. Click attachment & download PDF
   - [ ] PDF opens successfully
   - [ ] Contains invoice table with order items, prices, totals
   - [ ] Header shows "BOUTIQUE LUXE INVOICE"

### Step 1.3 – Verify WhatsApp Notification (Optional)
1. Check your WhatsApp for message from Brevo number
2. **Expected**: Message contains "Your order {OrderId} has been placed!"
3. **Content**: Order amount, tracking link visible

---

## 🧪 Test 2: Download Invoice from MyOrders (2 min)

### Step 2.1 – Navigate to MyOrders
1. Click "My Orders" in navigation menu
2. Locate the order you just created (should be at top with status "Ordered")

### Step 2.2 – Download Invoice Button
1. Find the "Invoice" button (gold-outlined, next to order details)
2. Click "Invoice" button
3. **Expected**: PDF downloads automatically to Downloads folder
4. **File name**: Should be `Invoice-{OrderId}.pdf`
5. Open downloaded PDF
   - [ ] Same invoice content as email attachment
   - [ ] Formatting intact, tables readable

### Step 2.3 – Test Multiple Downloads
1. Click "Invoice" button again
2. **Expected**: PDF downloads again (no error, fresh generation works)

---

## 🧪 Test 3: Real-Time Status Updates + Toast Notifications (3 min)

### Step 3.1 – Keep OrderTracking Tab Open
1. From MyOrders, click on the order to open OrderTracking page
2. Keep this tab open (do NOT refresh)
3. **Visual check**: 
   - [ ] Progress stepper shows status (should be "Ordered" with gold color #8b6c2f)
   - [ ] Status text: "Order received and confirmed"
   - [ ] Gold-themed UI with black background

### Step 3.2 – Trigger Status Update (Admin)
1. Open Admin Panel → Orders section
2. Find your test order
3. Click status dropdown → Select "Packed"
4. Click "Update Status" button

### Step 3.3 – Verify Real-Time Toast Notification
**On OrderTracking page (kept open in 3.1)**:
1. **Expected**: Gold-bordered toast appears at top-right within 1-2 seconds
2. Toast shows: "Status: Packed" with custom message
3. Toast auto-dismisses after 3.4 seconds
4. Progress bar updates to gold (#b48b2a) for "Packed" step
5. Status message updates: "Your order is being prepared for shipment"

### Step 3.4 – Verify Status Email
1. Check email inbox
2. **Expected**: Email from "Boutique Luxe" arrives with subject "Your order has been updated"
3. **Content**:
   - [ ] Status update message (e.g., "Your order is now Packed")
   - [ ] Tracking link visible
   - [ ] Gold-themed HTML styling
   - [ ] Button to "Track Your Order"

### Step 3.5 – Update to "Shipped"
1. Admin → Update status to "Shipped"
2. OrderTracking page: Toast appears, progresses to "Shipped" (gold #d1a84a)
3. Email arrives with tracking details

---

## 🧪 Test 4: Delivery Celebration + Datadog Event (2 min)

### Step 4.1 – Final Status Update to "Delivered"
1. Admin → Update order status to "Delivered"
2. OrderTracking page (keep open):
   - [ ] Toast appears: "Status: Delivered"
   - [ ] Progress bar fills to green (#1f8f54)
   - [ ] **✨ Confetti animation plays** (particles burst from bottom for 1 sec)
   - [ ] Final message: "Delivered! Thank you for choosing Boutique Luxe..."

### Step 4.2 – Verify Datadog Conversion Event
1. Open browser DevTools (F12) → Application tab → Local Storage
2. Search for `dd_` prefix entries (Datadog stores session IDs)
3. Check [Datadog RUM dashboard](https://app.datadoghq.com):
   - [ ] Navigate to Real User Monitoring → Sessions
   - [ ] Filter by your user ID or timestamp
   - [ ] Expand session → Actions tab
   - [ ] Look for action: `orderDeliveredConversion`
   - [ ] Verify custom attributes: `orderId`, `userId`, `deliveredAt`, `orderAmount`

### Step 4.3 – Test Multiple Orders
1. Place another test order (repeat Test 1)
2. Verify same flows work:
   - [ ] Invoice email arrives with PDF
   - [ ] MyOrders shows new order with Invoice button
   - [ ] Status updates trigger toasts
   - [ ] Delivery triggers confetti again

---

## 📊 Verification Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Invoice PDF Generation | ✅ | Puppeteer HTML → PDF working |
| Invoice Email Attachment | ✅ | Brevo SMTP attachment support |
| Invoice Download (MyOrders) | ✅ | Blob download mechanics working |
| WhatsApp Notifications | ✅ | Brevo WhatsApp client sending |
| Email Status Updates | ✅ | Gold-themed HTML templates |
| Real-Time Toast Notifications | ✅ | Socket.io status updates received |
| Confetti Celebration | ✅ | Canvas-confetti triggered on delivery |
| Datadog Conversion Event | ✅ | OrderDeliveredConversion tracked |
| Premium UI (Gold Theme) | ✅ | Consistent across all components |

---

## 🔧 Troubleshooting Guide

### Issue: Invoice PDF email not arriving
**Solution**:
1. Check `BREVO_API_KEY` is set in `.env`
2. Check server logs for error: `sendOrderConfirmationEmail failed`
3. Verify email in Brevo → Transactional → Email logs

### Issue: Toast notification not appearing
**Solution**:
1. Check WebSocket connection: `DevTools → Network → WS`
2. Verify Socket.io is connected (should see green checkmark)
3. Check server logs for `socket.io: client connected`

### Issue: PDF download shows blank file
**Solution**:
1. Check browser Network tab (F12) → find `/api/order/.../invoice` request
2. Verify response status is 200 (not 404/500)
3. Check server logs for Puppeteer error: `generateInvoicePdfBuffer failed`

### Issue: Confetti not animating
**Solution**:
1. Verify canvas-confetti installed: `npm list canvas-confetti`
2. Check browser console for errors
3. Try manual trigger: In DevTools console: `confetti({particleCount: 100})`

### Issue: Datadog events not showing
**Solution**:
1. Check `REACT_APP_DATADOG_APP_ID` is set (or verify fallback is correct)
2. Wait 30-60 seconds for data to sync to Datadog
3. Check network tab: `rum-intake.{SITE}` requests are being sent

---

## ✨ Success Criteria

**All tests pass when:**
- ✅ Invoice PDF generates and emails within 10 seconds
- ✅ Invoice downloads from MyOrders without errors
- ✅ Toast notifications appear in real-time on status updates
- ✅ Confetti animation plays on delivery
- ✅ Gold-themed UI consistent across all components
- ✅ No console errors (F12 Console tab should be clean)
- ✅ No server errors (Terminal 1 should show no red error messages)

---

## 📝 Test Log

**Tester**: _______________  
**Date**: _______________  
**Environment**: Local / Staging / Production  
**Result**: ✅ PASS / ❌ FAIL  

**Issues Found**:
```
[Describe any issues here]
```

**Next Steps**:
```
[Any follow-up actions needed]
```
