import { BASE_URL, API_ENDPOINTS, REQUEST_TIMEOUT } from "../constants";

const getID = (data) => {
    if (data instanceof FormData) return data.get("id");
    if (typeof data === "object" && data !== null) return data.id || data._id;
    return data;
};

const getAuthToken = () => {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        return user?.token || null;
    } catch {
        return null;
    }
};

// With timeout and better error handling
async function fastAPI(endpoint, method = "GET", data = null) {
    const isFD = data instanceof FormData;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
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
        const responseData = text ? JSON.parse(text) : { result: "Done" };

        if (res.ok) {
            return responseData;
        }

        // Better error handling with status codes
        const errorMsg = responseData?.message || responseData?.error || `API Error: ${res.status}`;
        const error = new Error(errorMsg);
        error.status = res.status;
        error.data = responseData;
        throw error;

    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error(`Request timeout (${REQUEST_TIMEOUT}ms) for ${endpoint}`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// --- ALL SYNCED EXPORTS ---
export const loginAPI = (d) => fastAPI(API_ENDPOINTS.LOGIN, "POST", d);
export const sendOtpAPI = (d) => fastAPI(API_ENDPOINTS.SEND_OTP, "POST", d);
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

export const getCartAPI = () => fastAPI(API_ENDPOINTS.CART);
export const createCartAPI = (d) => fastAPI(API_ENDPOINTS.CART, "POST", d);
export const updateCartAPI = (d) => fastAPI(`${API_ENDPOINTS.CART}/${getID(d)}`, "PUT", d);
export const deleteCartAPI = (d) => fastAPI(`${API_ENDPOINTS.CART}/${getID(d)}`, "DELETE");

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