# 🧪 API Testing Guide - eshopper

## **Base URL**
```
Production: https://eshopper-ukgu.onrender.com
Local: http://localhost:10000
```

---

## **1️⃣ OTP Send Test**

### **Request:**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "type": "signup"
  }'
```

### **Expected Response (Success):**
```json
{
  "result": "Done",
  "message": "OTP sent successfully"
}
```

### **Error Cases:**
```json
// Email already registered
{
  "message": "Email already registered"
}

// Failed to send OTP
{
  "error": "Failed to send OTP. Please try again.",
  "details": "..."
}
```

---

## **2️⃣ User Signup Test**

### **Request:**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/user \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "username": "johndoe123",
    "email": "john@gmail.com",
    "phone": "9876543210",
    "password": "SecurePass123",
    "otp": "123456"
  }'
```

### **Expected Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "username": "johndoe123",
  "email": "john@gmail.com",
  "phone": "9876543210",
  "role": "User",
  "createdAt": "2026-02-25T...",
  "updatedAt": "2026-02-25T..."
}
```

---

## **3️⃣ Login Test**

### **Request:**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe123",
    "password": "SecurePass123"
  }'
```

### **Expected Response (Success):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "username": "johndoe123",
  "email": "john@gmail.com",
  "phone": "9876543210",
  "role": "User"
}
```

### **Error Response:**
```json
{
  "message": "Invalid Credentials"
}
```

---

## **4️⃣ Reset Password Test**

### **Step 1: Send OTP**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@gmail.com",
    "type": "forget"
  }'
```

### **Step 2: Reset Password**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/api/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john@gmail.com",
    "password": "NewPassword456",
    "otp": "123456"
  }'
```

### **Expected Response:**
```json
{
  "result": "Done"
}
```

---

## **5️⃣ Get All Users**

### **Request:**
```bash
curl -X GET https://eshopper-ukgu.onrender.com/user
```

### **Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@gmail.com",
    "username": "johndoe123",
    ...
  }
]
```

---

## **🛒 Product Management**

### **Create Product (with images):**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/product \
  -H "Content-Type: multipart/form-data" \
  -F "name=Nike Shoe" \
  -F "brand=Nike" \
  -F "price=5000" \
  -F "pic1=@/path/to/image1.jpg" \
  -F "pic2=@/path/to/image2.jpg"
```

### **Get All Products:**
```bash
curl -X GET https://eshopper-ukgu.onrender.com/product
```

### **Get Single Product:**
```bash
curl -X GET https://eshopper-ukgu.onrender.com/product/PRODUCT_ID
```

### **Update Product:**
```bash
curl -X PUT https://eshopper-ukgu.onrender.com/product/PRODUCT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "price": 6000
  }'
```

### **Delete Product:**
```bash
curl -X DELETE https://eshopper-ukgu.onrender.com/product/PRODUCT_ID
```

---

## **🛍️ Shopping Cart**

### **Add to Cart:**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/cart \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "USER_ID",
    "productid": "PRODUCT_ID",
    "name": "Nike Shoe",
    "color": "Black",
    "size": "42",
    "price": 5000,
    "qty": 1,
    "pic": "image_url"
  }'
```

### **Get Cart:**
```bash
curl -X GET https://eshopper-ukgu.onrender.com/cart
```

### **Update Cart:**
```bash
curl -X PUT https://eshopper-ukgu.onrender.com/cart/CART_ID \
  -H "Content-Type: application/json" \
  -d '{
    "qty": 2
  }'
```

### **Delete from Cart:**
```bash
curl -X DELETE https://eshopper-ukgu.onrender.com/cart/CART_ID
```

---

## **❤️ Wishlist**

### **Add to Wishlist:**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/wishlist \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "USER_ID",
    "productid": "PRODUCT_ID",
    "name": "Nike Shoe",
    "color": "Black",
    "price": 5000,
    "pic": "image_url"
  }'
```

### **Get Wishlist:**
```bash
curl -X GET https://eshopper-ukgu.onrender.com/wishlist
```

---

## **📦 Checkout**

### **Create Order:**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "USER_ID",
    "paymentmode": "COD",
    "totalAmount": 5000,
    "shippingAmount": 100,
    "finalAmount": 5100,
    "products": [
      {
        "productid": "PRODUCT_ID",
        "qty": 1,
        "price": 5000
      }
    ]
  }'
```

### **Get All Orders:**
```bash
curl -X GET https://eshopper-ukgu.onrender.com/checkout
```

---

## **📋 Categories & Brands**

### **Get All Categories:**
```bash
curl -X GET https://eshopper-ukgu.onrender.com/maincategory
curl -X GET https://eshopper-ukgu.onrender.com/subcategory
curl -X GET https://eshopper-ukgu.onrender.com/brand
```

### **Create Category:**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/maincategory \
  -H "Content-Type: application/json" \
  -d '{"name": "Electronics"}'
```

---

## **📧 Newsletter**

### **Subscribe:**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/newslatter \
  -H "Content-Type: application/json" \
  -d '{"email": "subscriber@gmail.com"}'
```

---

## **💬 Contact Submission**

### **Send Message:**
```bash
curl -X POST https://eshopper-ukgu.onrender.com/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "email": "john@gmail.com",
    "phone": "9876543210",
    "subject": "Product Inquiry",
    "message": "I want to know about..."
  }'
```

---

## **✅ Quick Test Checklist**

- [ ] OTP sends successfully
- [ ] User can sign up with OTP
- [ ] User can login with correct credentials
- [ ] Login fails with wrong credentials
- [ ] Password reset works
- [ ] Products can be created (with images)
- [ ] Products display correctly
- [ ] Cart operations work
- [ ] Wishlist operations work
- [ ] Orders can be placed
- [ ] Categories/Brands are available

---

## **🔧 Debugging Tips**

1. **Check Render Logs:**
   - Go to Render Dashboard → Logs
   - Look for error messages

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Check Network tab for failed requests
   - Check Console for JavaScript errors

3. **Test Locally First:**
   - Start server: `node server.js`
   - Use http://localhost:10000 instead of Render URL

4. **Common Issues:**
   - **CORS Error:** ❌ Frontend domain not in allowedOrigins
   - **OTP not received:** ❌ Check BREVO_API_KEY in Render env
   - **Login fails:** ❌ Check MongoDB connection
   - **Images not uploading:** ❌ Check Cloudinary config

---

**Ready to test? Use Postman or curl commands above! 🚀**
