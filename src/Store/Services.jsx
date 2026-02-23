import { BASE_URL } from "../constants";

/**
 * --- 1. UTILITY HELPER ---
 * Handling MongoDB _id and Frontend id mismatch for all project sections.
 * This also extracts the ID correctly from FormData for image uploads.
 */
const getID = (data) => {
    if (data instanceof FormData) return data.get("id");
    if (typeof data === "object" && data !== null) return data.id || data._id;
    return data;
};

/**
 * --- 2. CORE API HANDLER (Optimized & Robust) ---
 */
async function fastAPI(endpoint, method = "GET", data = null) {
    const isFD = data instanceof FormData;
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        // FormData bhejte waqt headers empty hone chahiye (Browser boundary khud set karta hai)
        headers: isFD ? {} : { "content-type": "application/json" },
        body: isFD ? data : (data ? JSON.stringify(data) : null)
    });

    if (res.ok) {
        const text = await res.text();
        // Agar response empty hai (Delete cases), toh "Done" return karein, warna JSON parse karein
        return text ? JSON.parse(text) : { result: "Done" };
    } else {
        // Render wake-up handling: Agar response HTML hai (Error 500), toh custom message dein
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error("Backend is waking up... Please wait 10 seconds and refresh.");
        }
        
        const errText = await res.text();
        throw new Error(errText || "API Failure");
    }
}

/**
 * --- 3. ALL PROJECT EXPORTS (SYNCED WITH SERVER & SAGAS) ---
 */

// --- 🔐 AUTH & SECURITY MODULE ---
export const loginAPI = (d) => fastAPI("/login", "POST", d);
export const sendOtpAPI = (d) => fastAPI("/api/send-otp", "POST", d);
export const resetPasswordAPI = (d) => fastAPI("/api/reset-password", "POST", d);
export const forgetPasswordAPI = (d) => fastAPI("/user/forget-password", "POST", d);

// --- 👤 USER & PROFILE MODULE ---
export const getUserAPI = () => fastAPI("/user");
export const createUserAPI = (d) => fastAPI("/user", "POST", d);
export const updateUserAPI = (d) => fastAPI(`/user/${getID(d)}`, "PUT", d);
export const deleteUserAPI = (d) => fastAPI(`/user/${getID(d)}`, "DELETE");

// --- 📦 PRODUCT MODULE ---
export const getProductAPI = () => fastAPI("/product");
export const createProductAPI = (d) => fastAPI("/product", "POST", d);
export const updateProductAPI = (d) => fastAPI(`/product/${getID(d)}`, "PUT", d);
export const deleteProductAPI = (d) => fastAPI(`/product/${getID(d)}`, "DELETE");

// --- 🏷️ MAINCATEGORY MODULE ---
export const getMaincategoryAPI = () => fastAPI("/maincategory");
export const createMaincategoryAPI = (d) => fastAPI("/maincategory", "POST", d);
export const updateMaincategoryAPI = (d) => fastAPI(`/maincategory/${getID(d)}`, "PUT", d);
export const deleteMaincategoryAPI = (d) => fastAPI(`/maincategory/${getID(d)}`, "DELETE");

// --- 📂 SUBCATEGORY MODULE ---
export const getSubcategoryAPI = () => fastAPI("/subcategory");
export const createSubcategoryAPI = (d) => fastAPI("/subcategory", "POST", d);
export const updateSubcategoryAPI = (d) => fastAPI(`/subcategory/${getID(d)}`, "PUT", d);
export const deleteSubcategoryAPI = (d) => fastAPI(`/subcategory/${getID(d)}`, "DELETE");

// --- 🏢 BRAND MODULE ---
export const getBrandAPI = () => fastAPI("/brand");
export const createBrandAPI = (d) => fastAPI("/brand", "POST", d);
export const updateBrandAPI = (d) => fastAPI(`/brand/${getID(d)}`, "PUT", d);
export const deleteBrandAPI = (d) => fastAPI(`/brand/${getID(d)}`, "DELETE");

// --- 🛒 CART MODULE ---
export const getCartAPI = () => fastAPI("/cart");
export const createCartAPI = (d) => fastAPI("/cart", "POST", d);
export const updateCartAPI = (d) => fastAPI(`/cart/${getID(d)}`, "PUT", d);
export const deleteCartAPI = (d) => fastAPI(`/cart/${getID(d)}`, "DELETE");

// --- ❤️ WISHLIST MODULE ---
export const getWishlistAPI = () => fastAPI("/wishlist");
export const createWishlistAPI = (d) => fastAPI("/wishlist", "POST", d);
export const updateWishlistAPI = (d) => fastAPI(`/wishlist/${getID(d)}`, "PUT", d);
export const deleteWishlistAPI = (d) => fastAPI(`/wishlist/${getID(d)}`, "DELETE");

// --- 💳 CHECKOUT / ORDERS MODULE ---
export const getCheckoutAPI = () => fastAPI("/checkout");
export const createCheckoutAPI = (d) => fastAPI("/checkout", "POST", d);
export const updateCheckoutAPI = (d) => fastAPI(`/checkout/${getID(d)}`, "PUT", d);
export const deleteCheckoutAPI = (d) => fastAPI(`/checkout/${getID(d)}`, "DELETE");

// --- 📧 CONTACT INQUIRIES ---
export const getContactAPI = () => fastAPI("/contact");
export const createContactAPI = (d) => fastAPI("/contact", "POST", d);
export const updateContactAPI = (d) => fastAPI(`/contact/${getID(d)}`, "PUT", d);
export const deleteContactAPI = (d) => fastAPI(`/contact/${getID(d)}`, "DELETE");

// --- 📰 NEWSLETTER MODULE (Spelled with 'tt' as per your Redux) ---
export const getNewslatterAPI = () => fastAPI("/newslatter");
export const createNewslatterAPI = (d) => fastAPI("/newslatter", "POST", d);
export const updateNewslatterAPI = (d) => fastAPI(`/newslatter/${getID(d)}`, "PUT", d);
export const deleteNewslatterAPI = (d) => fastAPI(`/newslatter/${getID(d)}`, "DELETE");