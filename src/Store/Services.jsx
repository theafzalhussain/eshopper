import { BASE_URL } from "../constants";

// Helper function for GET requests
async function getAPI(endpoint) {
    let response = await fetch(`${BASE_URL}${endpoint}`);
    return await response.json();
}

// Helper function for POST/PUT/DELETE
async function mutationAPI(endpoint, method, data) {
    let isFormData = data instanceof FormData;
    let response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: isFormData ? {} : { "content-type": "application/json" }, // FormData me header empty hona chahiye
        body: isFormData ? data : JSON.stringify(data)
    });
    return await response.json();
}

// --- MAINCATEGORY ---
export const createMaincategoryAPI = (data) => mutationAPI("/maincategory", "post", data);
export const getMaincategoryAPI = () => getAPI("/maincategory");
export const updateMaincategoryAPI = (data) => mutationAPI(`/maincategory/${data.id}`, "put", data);
export const deleteMaincategoryAPI = (data) => mutationAPI(`/maincategory/${data.id}`, "delete");

// --- SUBCATEGORY ---
export const createSubcategoryAPI = (data) => mutationAPI("/subcategory", "post", data);
export const getSubcategoryAPI = () => getAPI("/subcategory");
export const updateSubcategoryAPI = (data) => mutationAPI(`/subcategory/${data.id}`, "put", data);
export const deleteSubcategoryAPI = (data) => mutationAPI(`/subcategory/${data.id}`, "delete");

// --- BRAND ---
export const createBrandAPI = (data) => mutationAPI("/brand", "post", data);
export const getBrandAPI = () => getAPI("/brand");
export const updateBrandAPI = (data) => mutationAPI(`/brand/${data.id}`, "put", data);
export const deleteBrandAPI = (data) => mutationAPI(`/brand/${data.id}`, "delete");

// --- PRODUCT ---
export const createProductAPI = (data) => mutationAPI("/product", "post", data); 
export const getProductAPI = () => getAPI("/product");
export const updateProductAPI = (data) => {
    // FIX: Get ID from FormData if exists
    const id = data instanceof FormData ? data.get("id") : data.id;
    return mutationAPI(`/product/${id}`, "put", data);
}
export const deleteProductAPI = (data) => mutationAPI(`/product/${data.id}`, "delete");

// --- USER ---
export const createUserAPI = (data) => mutationAPI("/user", "post", data);
export const getUserAPI = () => getAPI("/user");
export const updateUserAPI = (data) => {
    let id;
    if (data instanceof FormData) {
        id = data.get("id"); // FormData se ID nikaalne ka sahi tareeka
    } else {
        id = data.id;
    }
    return mutationAPI(`/user/${id}`, "put", data);
}
export const deleteUserAPI = (data) => mutationAPI(`/user/${data.id}`, "delete");

// --- CART ---
export const createCartAPI = (data) => mutationAPI("/cart", "post", data);
export const getCartAPI = () => getAPI("/cart");
export const updateCartAPI = (data) => mutationAPI(`/cart/${data.id}`, "put", data);
export const deleteCartAPI = (data) => mutationAPI(`/cart/${data.id}`, "delete");

// --- WISHLIST ---
export const createWishlistAPI = (data) => mutationAPI("/wishlist", "post", data);
export const getWishlistAPI = () => getAPI("/wishlist");
export const updateWishlistAPI = (data) => mutationAPI(`/wishlist/${data.id}`, "put", data);
export const deleteWishlistAPI = (data) => mutationAPI(`/wishlist/${data.id}`, "delete");

// --- CHECKOUT ---
export const createCheckoutAPI = (data) => mutationAPI("/checkout", "post", data);
export const getCheckoutAPI = () => getAPI("/checkout");
export const updateCheckoutAPI = (data) => mutationAPI(`/checkout/${data.id}`, "put", data);
export const deleteCheckoutAPI = (data) => mutationAPI(`/checkout/${data.id}`, "delete");

// --- CONTACT ---
export const createContactAPI = (data) => mutationAPI("/contact", "post", data);
export const getContactAPI = () => getAPI("/contact");
export const updateContactAPI = (data) => mutationAPI(`/contact/${data.id}`, "put", data);
export const deleteContactAPI = (data) => mutationAPI(`/contact/${data.id}`, "delete");

// --- NEWSLATTER ---
export const createNewslatterAPI = (data) => mutationAPI("/newslatter", "post", data);
export const getNewslatterAPI = () => getAPI("/newslatter");
export const updateNewslatterAPI = (data) => mutationAPI(`/newslatter/${data.id}`, "put", data);
export const deleteNewslatterAPI = (data) => mutationAPI(`/newslatter/${data.id}`, "delete");

// pasword
// Is line ko Services.jsx mein check karein ya add karein:
export const forgetPasswordAPI = (data) => mutationAPI("/user/forget-password", "post", data);