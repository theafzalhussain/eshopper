// ===== API BASE URL =====
// Use env first so Vercel can control API target per environment.
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PROD_API_URL = "https://eshopper-qtgl.onrender.com";
const LOCAL_API_URL = "http://localhost:5000";
const useLocalApi = process.env.REACT_APP_USE_LOCAL_API === 'true';
const forceWebSocket = process.env.REACT_APP_FORCE_WEBSOCKET === 'true';
const shouldForceWebSocket = forceWebSocket;
// Prefer explicit prod URL, but ignore envs pointing to localhost unless developer explicitly opts in.
const envBaseUrl = process.env.REACT_APP_BASE_URL || '';
const envApiUrl = process.env.REACT_APP_API_URL || '';
const configuredLocalApiUrl = process.env.REACT_APP_LOCAL_API_URL || LOCAL_API_URL;
const configuredProdApiUrl = (() => {
  // If developer explicitly requested local API usage, allow localhost envs.
  if (useLocalApi) return envBaseUrl || envApiUrl || PROD_API_URL;
  // Prefer non-local env values; fall back to the hardcoded PROD_API_URL.
  const candidate = envBaseUrl || envApiUrl || PROD_API_URL;
  if (String(candidate).includes('localhost') || String(candidate).includes('127.0.0.1')) {
    return PROD_API_URL;
  }
  return candidate;
})();
// Dev behavior: Default to local backend during development to test new endpoints
// Production behavior: use configured production API URL.
export const BASE_URL = isDev
  ? configuredLocalApiUrl 
  : configuredProdApiUrl;

// Socket transport strategy:
// Force websocket in dev (and when explicitly enabled) to avoid polling 400s.
export const SOCKET_TRANSPORTS = shouldForceWebSocket ? ['websocket'] : ['polling', 'websocket'];

// ===== FRONTEND URLs =====
// Always use production domain
export const FRONTEND_URL = "https://eshopperr.me";

// ===== BRAND ASSETS =====
// Use the same premium ESHOPPER logo image for both standard logo and watermark usage.
// Set these from environment for production/CDN hosting when needed.
export const BRAND_LOGO_URL = process.env.REACT_APP_BRAND_LOGO_URL || "/assets/eshopper-logo-horizontal.svg";
export const BRAND_WATERMARK_URL = process.env.REACT_APP_BRAND_WATERMARK_URL || BRAND_LOGO_URL;

// ===== ADMIN DASHBOARD URL =====
export const ADMIN_URL = "https://eshopperr.me/admin";

// ===== API ENDPOINTS =====
export const API_ENDPOINTS = {
  // Auth
  SEND_OTP: "/api/send-otp",
  VERIFY_OTP: "/api/verify-otp",
  RESET_PASSWORD: "/api/reset-password",
  LOGIN: "/login",
  LOGIN_2FA: "/api/login-2fa",
  
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
  CART: "/api/cart",
  CLEAR_CART: "/api/cart/clear",
  WISHLIST: "/wishlist",
  CHECKOUT: "/checkout",
  PLACE_ORDER: "/api/place-order",
  RAZORPAY_CONFIG: "/api/razorpay/config",
  RAZORPAY_CREATE_ORDER: "/api/razorpay/create-order",
  RAZORPAY_VERIFY_PAYMENT: "/api/razorpay/verify-payment",
  
  // Other
  CONTACT: "/contact",
  NEWSLETTER: "/newslatter",
  FOOTER_DATA: "/api/footer-data",
  ADMIN_FOOTER_CONFIG: "/api/admin/footer-config"
};

// ===== TIMEOUT SETTINGS =====
export const REQUEST_TIMEOUT = 60000; // Increased to 60 seconds to allow Render backend to wake up
export const OTP_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

// ===== UI CONSTANTS =====
export const ITEMS_PER_PAGE = 12;
export const IMAGE_FORMATS = ['jpg', 'png', 'jpeg'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ===== ENV VARIABLES FOR REFERENCE =====
// Required Render Environment Variables:
// - MONGODB_URI: MongoDB connection string
//
// - SENDER_EMAIL: Sender email address (e.g. support@eshopperr.me)
// - CLOUD_NAME: Cloudinary cloud name
// - CLOUD_API_KEY: Cloudinary API key
// - CLOUD_API_SECRET: Cloudinary API secret
// - FRONTEND_URL: Your frontend URL (https://eshopperr.me)
// - SENTRY_DSN: Sentry error tracking DSN (Optional)
// - NODE_ENV: production
// Note: PORT is auto-assigned by Render, do not set manually

// Required Vercel Environment Variables (in .env.local):
// - REACT_APP_API_URL: Your production API URL (https://eshopper-qtgl.onrender.com)
// - REACT_APP_USE_LOCAL_API: true only when you want localhost backend during dev
// - REACT_APP_FRONTEND_URL: Your frontend URL (https://eshopperr.me)
// - REACT_APP_BRAND_LOGO_URL: Final ESHOPPER logo URL
// - REACT_APP_BRAND_WATERMARK_URL: Watermark logo URL (keep same as logo unless needed)