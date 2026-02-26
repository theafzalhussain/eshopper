// ===== API BASE URL =====
// Production API endpoint on Railway
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const BASE_URL = process.env.REACT_APP_API_URL || (isDev ? "http://localhost:5000" : "https://api.eshopperr.me");

// ===== FRONTEND URLs =====
export const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || "https://eshopperr.me";

// ===== ADMIN DASHBOARD URL (Optional) =====
export const ADMIN_URL = process.env.REACT_APP_ADMIN_URL || window.location.origin;

// ===== API ENDPOINTS =====
export const API_ENDPOINTS = {
  // Auth
  SEND_OTP: "/api/send-otp",
  RESET_PASSWORD: "/api/reset-password",
  LOGIN: "/login",
  
  // User
  USER: "/user",
  USER_PROFILE: "/user/:id",
  
  // Products
  PRODUCT: "/product",
  PRODUCT_DETAIL: "/product/:id",
  
  // Categories
  MAINCATEGORY: "/maincategory",
  SUBCATEGORY: "/subcategory",
  BRAND: "/brand",
  
  // Shopping
  CART: "/cart",
  WISHLIST: "/wishlist",
  CHECKOUT: "/checkout",
  
  // Other
  CONTACT: "/contact",
  NEWSLETTER: "/newslatter"
};

// ===== TIMEOUT SETTINGS =====
export const REQUEST_TIMEOUT = 15000; // 15 seconds
export const OTP_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

// ===== UI CONSTANTS =====
export const ITEMS_PER_PAGE = 12;
export const IMAGE_FORMATS = ['jpg', 'png', 'jpeg'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ===== ENV VARIABLES FOR REFERENCE =====
// Required Railway Environment Variables:
// - MONGODB_URI: MongoDB connection string
// - BREVO_API_KEY: Email service API key (Brevo v3 API)
// - CLOUD_NAME: Cloudinary cloud name
// - CLOUD_API_KEY: Cloudinary API key
// - CLOUD_API_SECRET: Cloudinary API secret
// - PORT: Server port (Railway auto-assigns)
// - FRONTEND_URL: Your frontend URL (https://eshopperr.me)
// - SENTRY_DSN: Sentry error tracking DSN (Optional but recommended)
// - NODE_ENV: production

// Required Vercel Environment Variables (in .env.local):
// - REACT_APP_API_URL: Your production API URL (https://api.eshopperr.me)
// - REACT_APP_FRONTEND_URL: Your frontend URL (https://eshopperr.me)