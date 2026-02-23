import { BASE_URL } from "../constants";

// --- 1. UTILITY HELPERS ---

// Helper to extract ID correctly from either plain Object or FormData
const getID = (data) => {
    if (data instanceof FormData) return data.get("id");
    return data.id || data._id;
};

// --- 2. CORE API HANDLERS (With HTML-Crash Protection) ---

async function getAPI(endpoint) {
    let response = await fetch(`${BASE_URL}${endpoint}`);
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }
    // Prevent "Unexpected token <" by catching HTML errors early
    throw new Error("Backend is starting up... Please wait 10 seconds and refresh.");
}

async function mutationAPI(endpoint, method, data) {
    let isFormData = data instanceof FormData;
    let response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        // FormData bhejte waqt headers empty hona chahiye, browser boundary khud set karta hai
        headers: isFormData ? {} : { "content-type": "application/json" },
        body: isFormData ? data : JSON.stringify(data)
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        if (!response.ok) throw result; // Error cases from backend (400, 401, 500)
        return result;
    } else {
        const errorText = await response.text();
        throw new Error("Server Error: Received HTML instead of JSON. Details: " + errorText.substring(0, 50));
    }
}

// --- 3. EXPORTED API FUNCTIONS ---

// AUTHENTICATION
export const loginAPI = (data) => mutationAPI("/login", "post", data);
export const forgetPasswordAPI = (data) => mutationAPI("/user/forget-password", "post", data);

// MAINCATEGORY
export const createMaincategoryAPI = (data) => mutationAPI("/maincategory", "post", data);
export const getMaincategoryAPI = () => getAPI("/maincategory");
export const updateMaincategoryAPI = (data) => mutationAPI(`/maincategory/${getID(data)}`, "put", data);
export const deleteMaincategoryAPI = (data) => mutationAPI(`/maincategory/${getID(data)}`, "delete");

// SUBCATEGORY
export const createSubcategoryAPI = (data) => mutationAPI("/subcategory", "post", data);
export const getSubcategoryAPI = () => getAPI("/subcategory");
export const updateSubcategoryAPI = (data) => mutationAPI(`/subcategory/${getID(data)}`, "put", data);
export const deleteSubcategoryAPI = (data) => mutationAPI(`/subcategory/${getID(data)}`, "delete");

// BRAND
export const createBrandAPI = (data) => mutationAPI("/brand", "post", data);
export const getBrandAPI = () => getAPI("/brand");
export const updateBrandAPI = (data) => mutationAPI(`/brand/${getID(data)}`, "put", data);
export const deleteBrandAPI = (data) => mutationAPI(`/brand/${getID(data)}`, "delete");

// PRODUCT (Handling Images & String IDs)
export const createProductAPI = (data) => mutationAPI("/product", "post", data); 
export const getProductAPI = () => getAPI("/product");
export const updateProductAPI = (data) => mutationAPI(`/product/${getID(data)}`, "put", data);
export const deleteProductAPI = (data) => mutationAPI(`/product/${getID(data)}`, "delete");

// USER (Profile & Settings)
export const getUserAPI = () => getAPI("/user");
export const createUserAPI = (data) => mutationAPI("/user", "post", data);
export const updateUserAPI = (data) => mutationAPI(`/user/${getID(data)}`, "put", data);
export const deleteUserAPI = (data) => mutationAPI(`/user/${getID(data)}`, "delete");

// CART
export const createCartAPI = (data) => mutationAPI("/cart", "post", data);
export const getCartAPI = () => getAPI("/cart"); // Adjust to /getcart/${uid} if backend changes
export const updateCartAPI = (data) => mutationAPI(`/cart/${getID(data)}`, "put", data);
export const deleteCartAPI = (data) => mutationAPI(`/cart/${getID(data)}`, "delete");

// WISHLIST
export const createWishlistAPI = (data) => mutationAPI("/wishlist", "post", data);
export const getWishlistAPI = () => getAPI("/wishlist");
export const updateWishlistAPI = (data) => mutationAPI(`/wishlist/${getID(data)}`, "put", data);
export const deleteWishlistAPI = (data) => mutationAPI(`/wishlist/${getID(data)}`, "delete");

// CHECKOUT / ORDERS
export const createCheckoutAPI = (data) => mutationAPI("/checkout", "post", data);
export const getCheckoutAPI = () => getAPI("/checkout");
export const updateCheckoutAPI = (data) => mutationAPI(`/checkout/${getID(data)}`, "put", data);
export const deleteCheckoutAPI = (data) => mutationAPI(`/checkout/${getID(data)}`, "delete");

// CONTACT INQUIRIES
export const createContactAPI = (data) => mutationAPI("/contact", "post", data);
export const getContactAPI = () => getAPI("/contact");
export const updateContactAPI = (data) => mutationAPI(`/contact/${getID(data)}`, "put", data);
export const deleteContactAPI = (data) => mutationAPI(`/contact/${getID(data)}`, "delete");

// NEWSLATTER
export const createNewslatterAPI = (data) => mutationAPI("/newslatter", "post", data);
export const getNewslatterAPI = () => getAPI("/newslatter");
export const updateNewslatterAPI = (data) => mutationAPI(`/newslatter/${getID(data)}`, "put", data);
export const deleteNewslatterAPI = (data) => mutationAPI(`/newslatter/${getID(data)}`, "delete");