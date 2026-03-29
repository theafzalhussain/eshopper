import { BASE_URL, API_ENDPOINTS, REQUEST_TIMEOUT } from "../constants";

// Error notification system
const showRateLimitNotification = (message) => {
    // Show user-friendly notification
    console.warn("🚦 Rate Limit Notice:", message);

    // Create a simple toast notification
    if (typeof window !== 'undefined' && document) {
        const existingToast = document.getElementById('rate-limit-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.id = 'rate-limit-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f59e0b;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
        `;
        toast.innerHTML = `🚦 ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
};

const getID = (data) => {
    if (data instanceof FormData) return data.get("id");
    if (typeof data === "object" && data !== null) return data.id || data._id;
    return data;
};

const getAuthToken = () => {
    return localStorage.getItem("userid") || null;
};

// Rate limiting: Track API calls to prevent 429 errors
const rateLimiter = new Map();
const MAX_CALLS_PER_MINUTE = 50;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

const checkRateLimit = (endpoint) => {
    const now = Date.now();
    const key = endpoint.split('/')[0]; // Group by endpoint type

    if (!rateLimiter.has(key)) {
        rateLimiter.set(key, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
    }

    const limit = rateLimiter.get(key);

    if (now > limit.resetTime) {
        // Reset counter
        limit.count = 0;
        limit.resetTime = now + RATE_LIMIT_WINDOW;
    }

    if (limit.count >= MAX_CALLS_PER_MINUTE) {
        throw new Error(`Rate limit exceeded for ${endpoint}. Please wait before making more requests.`);
    }

    limit.count++;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// With timeout and better error handling
export async function fastAPI(endpoint, method = "GET", data = null, retryCount = 0) {
    const isFD = data instanceof FormData;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        // Check rate limit before making request
        checkRateLimit(endpoint);

        const headers = isFD ? {} : { "content-type": "application/json" };
        const token = getAuthToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method,
            headers,
            body: isFD ? data : (data ? JSON.stringify(data) : null),
            signal: controller.signal
        });

        const text = await res.text();

        // Handle successful responses
        if (res.ok) {
            // Only parse as JSON if response is ok and has content
            const responseData = text ? JSON.parse(text) : { result: "Done" };
            return responseData;
        }

        // Handle error responses
        let errorData;
        try {
            // Try to parse as JSON first
            errorData = text ? JSON.parse(text) : {};
        } catch {
            // If not JSON, treat as plain text error
            errorData = { message: text || `HTTP ${res.status} Error` };
        }

        // Special handling for 429 (Rate Limited)
        if (res.status === 429) {
            const retryAfter = res.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(2000 * (retryCount + 1), 10000);

            const friendlyMessage = retryCount === 0
                ? `Too many requests. Retrying in ${Math.ceil(waitTime/1000)} seconds...`
                : `Still rate limited. Waiting ${Math.ceil(waitTime/1000)} seconds...`;

            console.warn(`🚦 Rate limited on ${endpoint}. Retrying after ${waitTime}ms...`);

            // Show notification only on first retry attempt
            if (retryCount === 0) {
                showRateLimitNotification(friendlyMessage);
            }

            // Retry up to 3 times for 429 errors
            if (retryCount < 3) {
                await delay(waitTime);
                return fastAPI(endpoint, method, data, retryCount + 1);
            } else {
                showRateLimitNotification('Too many requests. Please refresh the page in a few minutes.');
                throw new Error(`🚫 Rate limit exceeded for ${endpoint}. Please reload the page after a few minutes.`);
            }
        }

        // Handle other error statuses
        const errorMsg = errorData?.message || errorData?.error || `API Error: ${res.status} ${res.statusText}`;
        const error = new Error(errorMsg);
        error.status = res.status;
        error.data = errorData;
        throw error;

    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error(`Request timeout (${REQUEST_TIMEOUT}ms) for ${endpoint}`);
        }

        // Log the exact error for debugging
        if (err.message.includes("JSON")) {
            console.error(`📝 JSON Parse Error on ${endpoint}:`, err);
            console.error(`📝 Raw response text:`, text);
        }

        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// --- ALL SYNCED EXPORTS ---
export const loginAPI = (d) => fastAPI(API_ENDPOINTS.LOGIN, "POST", d);
// sendOtpAPI removed as part of email/OTP system cleanup
export const resetPasswordAPI = (d) => fastAPI(API_ENDPOINTS.RESET_PASSWORD, "POST", d);
export const forgetPasswordAPI = (d) => fastAPI(API_ENDPOINTS.RESET_PASSWORD, "POST", d);

export const getUserAPI = () => fastAPI(API_ENDPOINTS.USER);
export const getSingleUserAPI = (id) => fastAPI(`${API_ENDPOINTS.USER}/${id}`);
export const createUserAPI = (d) => fastAPI(API_ENDPOINTS.USER, "POST", d);
export const updateUserAPI = (d) => fastAPI(`${API_ENDPOINTS.USER}/${getID(d)}`, "PUT", d);
export const deleteUserAPI = (d) => fastAPI(`${API_ENDPOINTS.USER}/${getID(d)}`, "DELETE");

export const getProductAPI = () => fastAPI(API_ENDPOINTS.PRODUCT);
export const getSingleProductAPI = (id) => fastAPI(`${API_ENDPOINTS.PRODUCT}/${id}`);
export const createProductAPI = (d) => fastAPI(API_ENDPOINTS.PRODUCT, "POST", d);
export const updateProductAPI = (d) => fastAPI(`${API_ENDPOINTS.PRODUCT}/${getID(d)}`, "PUT", d);
export const deleteProductAPI = (d) => fastAPI(`${API_ENDPOINTS.PRODUCT}/${getID(d)}`, "DELETE");

export const getMaincategoryAPI = () => fastAPI(API_ENDPOINTS.MAINCATEGORY);
export const createMaincategoryAPI = (d) => fastAPI(API_ENDPOINTS.MAINCATEGORY, "POST", d);
export const updateMaincategoryAPI = (d) => fastAPI(`${API_ENDPOINTS.MAINCATEGORY}/${getID(d)}`, "PUT", d);
export const deleteMaincategoryAPI = (d) => fastAPI(`${API_ENDPOINTS.MAINCATEGORY}/${getID(d)}`, "DELETE");

export const getSubcategoryAPI = () => fastAPI(API_ENDPOINTS.SUBCATEGORY);
export const createSubcategoryAPI = (d) => fastAPI(API_ENDPOINTS.SUBCATEGORY, "POST", d);
export const updateSubcategoryAPI = (d) => fastAPI(`${API_ENDPOINTS.SUBCATEGORY}/${getID(d)}`, "PUT", d);
export const deleteSubcategoryAPI = (d) => fastAPI(`${API_ENDPOINTS.SUBCATEGORY}/${getID(d)}`, "DELETE");

export const getBrandAPI = () => fastAPI(API_ENDPOINTS.BRAND);
export const createBrandAPI = (d) => fastAPI(API_ENDPOINTS.BRAND, "POST", d);
export const updateBrandAPI = (d) => fastAPI(`${API_ENDPOINTS.BRAND}/${getID(d)}`, "PUT", d);
export const deleteBrandAPI = (d) => fastAPI(`${API_ENDPOINTS.BRAND}/${getID(d)}`, "DELETE");

export const getCartAPI = (userId) => fastAPI(`${API_ENDPOINTS.CART}?userId=${userId}`);
export const createCartAPI = (d) => fastAPI(API_ENDPOINTS.CART, "POST", d);
export const updateCartAPI = (d) => fastAPI(`${API_ENDPOINTS.CART}/${getID(d)}`, "PUT", d);
export const deleteCartAPI = (d) => fastAPI(`${API_ENDPOINTS.CART}/${getID(d)}`, "DELETE");
export const clearUserCartAPI = (userid) => fastAPI(`${API_ENDPOINTS.CLEAR_CART}/${userid}`, "POST");

export const getWishlistAPI = () => fastAPI(API_ENDPOINTS.WISHLIST);
export const createWishlistAPI = (d) => fastAPI(API_ENDPOINTS.WISHLIST, "POST", d);
export const updateWishlistAPI = (d) => fastAPI(`${API_ENDPOINTS.WISHLIST}/${getID(d)}`, "PUT", d);
export const deleteWishlistAPI = (d) => fastAPI(`${API_ENDPOINTS.WISHLIST}/${getID(d)}`, "DELETE");

export const getCheckoutAPI = () => fastAPI(API_ENDPOINTS.CHECKOUT);
export const createCheckoutAPI = (d) => fastAPI(API_ENDPOINTS.CHECKOUT, "POST", d);
export const updateCheckoutAPI = (d) => fastAPI(`${API_ENDPOINTS.CHECKOUT}/${getID(d)}`, "PUT", d);
export const deleteCheckoutAPI = (d) => fastAPI(`${API_ENDPOINTS.CHECKOUT}/${getID(d)}`, "DELETE");

export const getContactAPI = () => fastAPI(API_ENDPOINTS.CONTACT);
export const createContactAPI = (d) => fastAPI(API_ENDPOINTS.CONTACT, "POST", d);
export const updateContactAPI = (d) => fastAPI(`${API_ENDPOINTS.CONTACT}/${getID(d)}`, "PUT", d);
export const deleteContactAPI = (d) => fastAPI(`${API_ENDPOINTS.CONTACT}/${getID(d)}`, "DELETE");

export const getNewslatterAPI = () => fastAPI(API_ENDPOINTS.NEWSLETTER);
export const createNewslatterAPI = (d) => fastAPI(API_ENDPOINTS.NEWSLETTER, "POST", d);
export const updateNewslatterAPI = (d) => fastAPI(`${API_ENDPOINTS.NEWSLETTER}/${getID(d)}`, "PUT", d);
export const deleteNewslatterAPI = (d) => fastAPI(`${API_ENDPOINTS.NEWSLETTER}/${getID(d)}`, "DELETE");