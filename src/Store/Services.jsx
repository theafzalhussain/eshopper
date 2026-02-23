import { BASE_URL } from "../constants";

/**
 * --- 1. UTILITY HELPER ---
 * Handling MongoDB _id and Frontend id mismatch for all data types
 */
const getID = (data) => {
    if (data instanceof FormData) return data.get("id");
    if (typeof data === "object" && data !== null) return data.id || data._id;
    return data;
};

/**
 * --- 2. CORE API HANDLERS ---
 */

// GET Handler (For fetching data)
async function getAPI(endpoint) {
    let response = await fetch(`${BASE_URL}${endpoint}`);
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }
    // Render free tier protection logic
    throw new Error("Backend is waking up... Please wait 10 seconds and refresh.");
}

// Mutation Handler (For POST, PUT, DELETE)
async function mutationAPI(endpoint, method, data) {
    let isFormData = data instanceof FormData;
    let response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: isFormData ? {} : { "content-type": "application/json" },
        body: isFormData ? data : (data ? JSON.stringify(data) : undefined)
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        if (!response.ok) throw result; 
        return result;
    } else {
        // Handle non-JSON responses (like 500 HTML errors or successful deletes)
        if (response.ok) return { result: "Done" };
        const errorText = await response.text();
        console.error("Critical Server Error:", errorText.substring(0, 200));
        throw new Error("Server Crash: Received non-JSON response from Backend.");
    }
}

/**
 * --- 3. EXPORTED FUNCTIONS (ALL PROJECT MODULES) ---
 */

// --- AUTHENTICATION ---
export const loginAPI = (data) => mutationAPI("/login", "post", data);
export const forgetPasswordAPI = (data) => mutationAPI("/user/forget-password", "post", data);

// --- USER MODULE ---
export const getUserAPI = () => getAPI("/user");
export const createUserAPI = (data) => mutationAPI("/user", "post", data);
export const updateUserAPI = (data) => mutationAPI(`/user/${getID(data)}`, "put", data);
export const deleteUserAPI = (data) => mutationAPI(`/user/${getID(data)}`, "delete");

// --- PRODUCT MODULE ---
export const getProductAPI = () => getAPI("/product");
export const createProductAPI = (data) => mutationAPI("/product", "post", data);
export const updateProductAPI = (data) => mutationAPI(`/product/${getID(data)}`, "put", data);
export const deleteProductAPI = (data) => mutationAPI(`/product/${getID(data)}`, "delete");

// --- MAINCATEGORY MODULE ---
export const getMaincategoryAPI = () => getAPI("/maincategory");
export const createMaincategoryAPI = (data) => mutationAPI("/maincategory", "post", data);
export const updateMaincategoryAPI = (data) => mutationAPI(`/maincategory/${getID(data)}`, "put", data);
export const deleteMaincategoryAPI = (data) => mutationAPI(`/maincategory/${getID(data)}`, "delete");

// --- SUBCATEGORY MODULE ---
export const getSubcategoryAPI = () => getAPI("/subcategory");
export const createSubcategoryAPI = (data) => mutationAPI("/subcategory", "post", data);
export const updateSubcategoryAPI = (data) => mutationAPI(`/subcategory/${getID(data)}`, "put", data);
export const deleteSubcategoryAPI = (data) => mutationAPI(`/subcategory/${getID(data)}`, "delete");

// --- BRAND MODULE ---
export const getBrandAPI = () => getAPI("/brand");
export const createBrandAPI = (data) => mutationAPI("/brand", "post", data);
export const updateBrandAPI = (data) => mutationAPI(`/brand/${getID(data)}`, "put", data);
export const deleteBrandAPI = (data) => mutationAPI(`/brand/${getID(data)}`, "delete");

// --- CART MODULE ---
export const getCartAPI = () => getAPI("/cart");
export const createCartAPI = (data) => mutationAPI("/cart", "post", data);
export const updateCartAPI = (data) => mutationAPI(`/cart/${getID(data)}`, "put", data);
export const deleteCartAPI = (data) => mutationAPI(`/cart/${getID(data)}`, "delete");

// --- WISHLIST MODULE ---
export const getWishlistAPI = () => getAPI("/wishlist");
export const createWishlistAPI = (data) => mutationAPI("/wishlist", "post", data);
export const updateWishlistAPI = (data) => mutationAPI(`/wishlist/${getID(data)}`, "put", data);
export const deleteWishlistAPI = (data) => mutationAPI(`/wishlist/${getID(data)}`, "delete");

// --- CHECKOUT / ORDERS ---
export const getCheckoutAPI = () => getAPI("/checkout");
export const createCheckoutAPI = (data) => mutationAPI("/checkout", "post", data);
export const updateCheckoutAPI = (data) => mutationAPI(`/checkout/${getID(data)}`, "put", data);
export const deleteCheckoutAPI = (data) => mutationAPI(`/checkout/${getID(data)}`, "delete");

// --- CONTACT INQUIRIES ---
export const getContactAPI = () => getAPI("/contact");
export const createContactAPI = (data) => mutationAPI("/contact", "post", data);
export const updateContactAPI = (data) => mutationAPI(`/contact/${getID(data)}`, "put", data);
export const deleteContactAPI = (data) => mutationAPI(`/contact/${getID(data)}`, "delete");

// --- NEWSLETTER ---
export const getNewslatterAPI = () => getAPI("/newslatter");
export const createNewslatterAPI = (data) => mutationAPI("/newslatter", "post", data);
export const updateNewslatterAPI = (data) => mutationAPI(`/newslatter/${getID(data)}`, "put", data);
export const deleteNewslatterAPI = (data) => mutationAPI(`/newslatter/${getID(data)}`, "delete");