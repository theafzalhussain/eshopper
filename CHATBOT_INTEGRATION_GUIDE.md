# 🚀 ChatBot Integration & Deployment Guide

## Quick Start

Your ChatBot.jsx is **fully functional and ready to use**! Just import it in your main App.jsx:

```jsx
import ChatBot from './Component/ChatBot'

export default function App() {
  return (
    <div>
      {/* Your existing app content */}
      <ChatBot />
    </div>
  )
}
```

---

## ✅ What's Already Configured

| Item | Status | Details |
|------|--------|---------|
| **API Endpoint** | ✅ Ready | `https://api.eshopperr.me/api/chat` |
| **Animations** | ✅ Ready | All framer-motion effects included |
| **Responsive** | ✅ Ready | Mobile, tablet, desktop optimized |
| **Draggable Icon** | ✅ Ready | Works out of the box |
| **Product Grid** | ✅ Ready | Awaiting product data from backend |
| **User Profiles** | ✅ Ready | Default avatars (👤 🤖) |
| **Error Handling** | ✅ Ready | Fallback messages configured |

---

## 📡 Backend API Requirements

Your backend `/api/chat` endpoint needs to:

### 1. Accept POST Request
```json
{
  "prompt": "User's message",
  "history": [
    { "role": "user", "parts": [{ "text": "..." }] },
    { "role": "model", "parts": [{ "text": "..." }] }
  ],
  "context": "You are an AI Fashion Consultant..."
}
```

### 2. Call Gemini API (or your chosen AI)
```javascript
// Example with Gemini
const response = await model.generateContent({
  contents: history,
  systemInstruction: context
})
```

### 3. Return Response Format
```json
{
  "text": "AI response with optional [PRODUCT:{...}] markers",
  "success": true
}
```

### 4. Optional: Include Product Data
To show products in the chat, embed them in the AI response:
```json
{
  "text": "I recommend this beautiful dress: [PRODUCT:{\"name\":\"Summer Dress\",\"image\":\"https://cdn.../dress.jpg\",\"price\":\"129.99\",\"link\":\"https://shop/dress\"}] Perfect for summer!"
}
```

---

## 🔧 Backend Implementation Example (Node.js/Express)

```javascript
const express = require('express')
const { GoogleGenerativeAI } = require("@google/generative-ai")
const router = express.Router()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

router.post('/api/chat', async (req, res) => {
  try {
    const { prompt, history, context } = req.body

    // Initialize model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    // Format conversation history
    const conversationHistory = history.map(msg => ({
      role: msg.role,
      parts: msg.parts
    }))

    // Add current message
    conversationHistory.push({
      role: 'user',
      parts: [{ text: prompt }]
    })

    // Generate response
    const chat = model.startChat({
      history: conversationHistory.slice(-10), // Keep last 10 messages
      systemInstruction: context || "You are a premium fashion consultant."
    })

    const result = await chat.sendMessage(prompt)
    const responseText = result.response.text()

    // Add product recommendations if needed
    let enhancedResponse = responseText

    // TODO: Query your product database and add product cards
    // Example:
    // const products = await Product.find({ trending: true }).limit(2)
    // products.forEach(p => {
    //   enhancedResponse += `\n[PRODUCT:${JSON.stringify({
    //     name: p.name,
    //     image: p.imageUrl,
    //     price: p.price,
    //     link: `/product/${p.id}`
    //   })}]`
    // })

    res.json({
      text: enhancedResponse,
      success: true
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({
      text: "I'm temporarily adjusting to better serve you. Please try again.",
      error: error.message,
      success: false
    })
  }
})

module.exports = router
```

---

## 🗄️ Database Integration for Products

### 1. Product Schema (MongoDB)
```javascript
const productSchema = new Schema({
  _id: ObjectId,
  name: { type: String, required: true },
  imageUrl: { type: String, required: true },
  price: { type: Number, required: true },
  category: String,
  trending: Boolean,
  tags: [String],
  // ... other fields
})
```

### 2. Query Products in Chat Response
```javascript
// Find relevant products
const relevantProducts = await Product.find({
  tags: { $in: userInterests }
}).limit(3)

// Format for ChatBot
const productCards = relevantProducts.map(p => `
[PRODUCT:{
  "name": "${p.name}",
  "image": "${p.imageUrl}",
  "price": "${p.price}",
  "link": "/product/${p._id}"
}]
`)

response += productCards.join('\n')
```

---

## 🎨 Customizing Colors/Styling

All styles are **inline CSS** in the component. To change:

### Change Gold (#FFD700) to Another Color:
1. Open `ChatBot.jsx`
2. Find `#FFD700` (appears ~50 times)
3. Replace with your color (e.g., `#FF6B35`)
4. Also update `rgba(255, 215, 0, ...)` calculations

**Color Calculator for RGBA:**
```
Hex: #FF6B35 → RGB: 255, 107, 53
Use: rgba(255, 107, 53, 0.5) // 50% opacity
```

### Change Chat Window Width/Height:
```jsx
// Line: .chatbot-card { ... width: 380px; height: 540px; }
width: 400px;  // Change to your width
height: 600px; // Change to your height
```

### Change Animation Speed:
```jsx
// Find @keyframes animations
duration: 2 // seconds
// Change all instances to slower/faster
```

---

## 📦 Environment Variables

Set these in your `.env` file:

```env
REACT_APP_API_URL=https://api.eshopperr.me
REACT_APP_GEMINI_API_KEY=your_key_here
REACT_APP_ENVIRONMENT=production
```

The ChatBot automatically reads `REACT_APP_API_URL` from this file.

---

## 🔒 Security Checklist

- ✅ **CORS**: Allow `https://eshopperr.me` in backend CORS config
- ✅ **Rate Limiting**: Add rate limiter to `/api/chat` endpoint
- ✅ **Input Validation**: Validate prompt length (max 500 chars set)
- ✅ **Authentication**: (Optional) Add JWT/session check
- ✅ **API Keys**: Store Gemini API key in `.env` (server-side)
- ✅ **HTTPS**: Ensure all API calls use HTTPS

```javascript
// Rate limiting example
const rateLimit = require('express-rate-limit')

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many messages, please try again later'
})

router.post('/api/chat', chatLimiter, (req, res) => {
  // ... handle chat
})
```

---

## 🧪 Testing the ChatBot

### Test Locally:
1. Start your backend: `npm start` (backend server)
2. Start your React app: `npm start` (React dev server)
3. Open browser to `http://localhost:3000`
4. Click the robot icon
5. Type "Hello" and send
6. Should see response from backend

### Test Product Display:
1. Have backend return: `"Check this [PRODUCT:{...}]"`
2. Product card should appear below message
3. Click "View Product" to verify link works

### Test Mobile View:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Set to 375px width
4. Chat should still work smoothly

### Test Mobile Full-Screen:
1. Set to 380px width or smaller
2. Click robot icon
3. Chat should expand to full screen
4. Robot icon should hide
5. Close button (X) should work

---

## 🎯 Common Issues & Fixes

### Issue: "Cannot POST /api/chat"
**Cause**: Backend route not registered  
**Fix**: Add router to your Express app:
```javascript
const chatRouter = require('./routes/chat')
app.use(chatRouter)
```

### Issue: "CORS error"
**Cause**: Frontend and backend have different origins  
**Fix**: Configure CORS:
```javascript
const cors = require('cors')
app.use(cors({
  origin: ['http://localhost:3000', 'https://eshopperr.me'],
  credentials: true
}))
```

### Issue: "Gemini API key error"
**Cause**: Invalid or expired API key  
**Fix**: 
1. Check `.env` has correct key
2. Verify key is not exposed in frontend code
3. Regenerate key in Google Cloud Console

### Issue: "Products not showing"
**Cause**: Backend not formatting product data correctly  
**Fix**: Verify response includes:
```json
"text": "...some text [PRODUCT:{\"name\":\"...\"}]..."
```

### Issue: "Animations are choppy"
**Cause**: GPU not accelerating WebGL  
**Fix**: Check browser console for warnings, try different browser

---

## 📊 Performance Metrics

Target metrics for ChatBot:

| Metric | Target | How to Test |
|--------|--------|------------|
| **TTFB** | < 500ms | Network tab in DevTools |
| **FCP** | < 1s | Lighthouse report |
| **Animation FPS** | 60 FPS | DevTools Performance tab |
| **Bundle Size** | < 50KB | Webpack Bundle Analyzer |

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Backend API deployed to `https://api.eshopperr.me`
- [ ] Environment variables configured on hosting
- [ ] CORS settings configured for production domain
- [ ] API rate limiting enabled
- [ ] Error logging set up (Sentry, Datadog, etc.)
- [ ] Product database contains test data
- [ ] Mobile testing on actual devices
- [ ] HTTPS enforced on all endpoints
- [ ] CSP headers configured
- [ ] Analytics integrated (if needed)

---

## 📈 Analytics Integration (Optional)

Track ChatBot usage:

```javascript
// Add to handleSendMessage
const trackEvent = (eventName, data) => {
  if (window.gtag) {
    window.gtag('event', eventName, data)
  }
}

// Usage:
trackEvent('chat_message_sent', {
  message_length: inputValue.length,
  has_products: products.length > 0
})
```

---

## 💡 Pro Tips

1. **Caching**: Cache AI responses for common questions
2. **Suggestions**: Pre-populate quick suggestions UI
3. **Persistence**: Store conversation history in localStorage
4. **Typing Indicators**: Show "AI is typing..." before response
5. **Sentiment Analysis**: Detect user mood from messages
6. **A/B Testing**: Test different greeting messages
7. **User Segmentation**: Show different products based on user
8. **Offline Support**: Use Service Workers for offline chat

---

## 📞 Support Resources

- **Framer Motion Docs**: https://www.framer.com/motion/
- **Gemini API Docs**: https://ai.google.dev/
- **React Docs**: https://react.dev
- **Express Docs**: https://expressjs.com

---

**Last Updated**: March 2026  
**Status**: Ready for Production ✅
