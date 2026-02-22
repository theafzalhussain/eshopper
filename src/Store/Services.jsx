import { BASE_URL } from "../constants";

// --- 1. HELPER FUNCTIONS (Robust Logic to prevent crashes) ---

async function getAPI(endpoint) {
    let response = await fetch(`${BASE_URL}${endpoint}`);
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }
    // Agar server HTML bhej raha hai (crash hone par), toh error throw karein taaki frontend handle kar sake
    throw new Error("Server Error: Expected JSON but received HTML. Backend might be warming up.");
}

async function mutationAPI(endpoint, method, data) {
    let isFormData = data instanceof FormData;
    let response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        // FormData bhejte waqt headers browser khud handle karta hai
        headers: isFormData ? {} : { "content-type": "application/json" },
        body: isFormData ? data : JSON.stringify(data)
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        if (!response.ok) throw result; // Backend se aane wali error messages (400, 401)
        return result;
    } else {
        // "Unexpected token <" wali error ko yahan roka jata hai
        const errorText = await response.text();
        throw new Error("Backend Logic Error: " + errorText.substring(0, 100));
    }
}

// --- 2. AUTHENTICATION ---
export const loginAPI = (data) => mutationAPI("/login", "post", data);
export const forgetPasswordAPI = (data) => mutationAPI("/user/forget-password", "post", data);

// --- 3. MAINCATEGORY (CRUD) ---
export const createMaincategoryAPI = (data) => mutationAPI("/maincategory", "post", data);
export const getMaincategoryAPI = () => getAPI("/maincategory");
export const updateMaincategoryAPI = (data) => mutationAPI(`/maincategory/${data.id}`, "put", data);
export const deleteMaincategoryAPI = (data) => mutationAPI(`/maincategory/${data.id}`, "delete");

// --- 4. SUBCATEGORY (CRUD) ---
export const createSubcategoryAPI = (data) => mutationAPI("/subcategory", "post", data);
export const getSubcategoryAPI = () => getAPI("/subcategory");
export const updateSubcategoryAPI = (data) => mutationAPI(`/subcategory/${data.id}`, "put", data);
export const deleteSubcategoryAPI = (data) => mutationAPI(`/subcategory/${data.id}`, "delete");

// --- 5. BRAND (CRUD) ---
export const createBrandAPI = (data) => mutationAPI("/brand", "post", data);
export const getBrandAPI = () => getAPI("/brand");
export const updateBrandAPI = (data) => mutationAPI(`/brand/${data.id}`, "put", data);
export const deleteBrandAPI = (data) => mutationAPI(`/brand/${data.id}`, "delete");

// --- 6. PRODUCT (Handling FormData for Image Uploads) ---
export const createProductAPI = (data) => mutationAPI("/product", "post", data); 
export const getProductAPI = () => getAPI("/product");
export const updateProductAPI = (data) => {
    // 🎯 FormData se ID nikalne ka sahi tareeka taaki 'undefined' 404 error na aaye
    const id = data instanceof FormData ? data.get("id") : data.id;
    return mutationAPI(`/product/${id}`, "put", data);
}
export const deleteProductAPI = (data) => mutationAPI(`/product/${data.id}`, "delete");

// --- 7. USER (Profile & Management) ---
export const getUserAPI = () => getAPI("/user");
export const createUserAPI = (data) => mutationAPI("/user", "post", data);
export const updateUserAPI = (data) => {
    // 🎯 Profile Pic update logic with proper ID extraction
    const id = data instanceof FormData ? data.get("id") : data.id;
    return mutationAPI(`/user/${id}`, "put", data);
}
export const deleteUserAPI = (data) => mutationAPI(`/user/${data.id}`, "delete");

// --- 8. CART ---
export const createCartAPI = (data) => mutationAPI("/cart", "post", data);
export const getCartAPI = () => getAPI("/getcart"); // User specific carts check backend
export const updateCartAPI = (data) => mutationAPI(`/cart/${data.id}`, "put", data);
export const deleteCartAPI = (data) => mutationAPI(`/cart/${data.id}`, "delete");

// --- 9. WISHLIST ---
export const createWishlistAPI = (data) => mutationAPI("/wishlist", "post", data);
export const getWishlistAPI = () => getAPI("/wishlist");
export const updateWishlistAPI = (data) => mutationAPI(`/wishlist/${data.id}`, "put", data);
export const deleteWishlistAPI = (data) => mutationAPI(`/wishlist/${data.id}`, "delete");

// --- 10. CHECKOUT / ORDERS ---
export const createCheckoutAPI = (data) => mutationAPI("/checkout", "post", data);
export const getCheckoutAPI = () => getAPI("/checkout");
export const updateCheckoutAPI = (data) => mutationAPI(`/checkout/${data.id}`, "put", data);
export const deleteCheckoutAPI = (data) => mutationAPI(`/checkout/${data.id}`, "delete");

// --- 11. CONTACT INQUIRIES ---
export const createContactAPI = (data) => mutationAPI("/contact", "post", data);
export const getContactAPI = () => getAPI("/contact");
export const updateContactAPI = (data) => mutationAPI(`/contact/${data.id}`, "put", data);
export const deleteContactAPI = (data) => mutationAPI(`/contact/${data.id}`, "delete");

// --- 12. NEWSLATTER ---
export const createNewslatterAPI = (data) => mutationAPI("/newslatter", "post", data);
export const getNewslatterAPI = () => getAPI("/newslatter");
export const updateNewslatterAPI = (data) => mutationAPI(`/newslatter/${data.id}`, "put", data);
export const deleteNewslatterAPI = (data) => mutationAPI(`/newslatter/${data.id}`, "delete");