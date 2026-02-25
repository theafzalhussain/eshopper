// ===== API BASE URL =====
// Localhost wala band kar dein
// export const BASE_URL = "http://localhost:8000"; 

// Render wala URL yahan daalein
export const BASE_URL = process.env.REACT_APP_API_URL || "https://eshopper-ukgu.onrender.com";

// ===== FRONTEND URLs =====
export const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || "https://eshopperr.vercel.app";

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