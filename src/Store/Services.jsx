import { BASE_URL } from "../constants"; // Ensure base url is correct

// --- UTILITY: Get ID correctly from Object or FormData ---
const getID = (data) => {
    if (data instanceof FormData) return data.get("id");
    return data.id || data._id;
};

// --- CORE: GET Request Handler ---
async function getAPI(endpoint) {
    let response = await fetch(`${BASE_URL}${endpoint}`);
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }
    // Prevent "Unexpected token <" crash when Render is waking up
    throw new Error("Backend is starting up... Please wait and refresh.");
}

// --- CORE: POST/PUT/DELETE Request Handler ---
async function mutationAPI(endpoint, method, data) {
    let isFormData = data instanceof FormData;
    
    let response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        // FormData ke waqt header empty hona chahiye (Browser boundary khud set karta hai)
        headers: isFormData ? {} : { "content-type": "application/json" },
        body: isFormData ? data : JSON.stringify(data)
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        if (!response.ok) throw result; 
        return result;
    } else {
        throw new Error("Server Error: Received non-JSON response.");
    }
}

// --- EXPORTED API FUNCTIONS ---

// AUTH
export const loginAPI = (data) => mutationAPI("/login", "post", data);
export const forgetPasswordAPI = (data) => mutationAPI("/user/forget-password", "post", data);

// USER
export const getUserAPI = () => getAPI("/user");
export const createUserAPI = (data) => mutationAPI("/user", "post", data);
export const updateUserAPI = (data) => mutationAPI(`/user/${getID(data)}`, "put", data);
export const deleteUserAPI = (data) => mutationAPI(`/user/${getID(data)}`, "delete");

// PRODUCT
export const getProductAPI = () => getAPI("/product");
export const createProductAPI = (data) => mutationAPI("/product", "post", data);
export const updateProductAPI = (data) => mutationAPI(`/product/${getID(data)}`, "put", data);
export const deleteProductAPI = (data) => mutationAPI(`/product/${getID(data)}`, "delete");

// CATEGORIES
export const getMaincategoryAPI = () => getAPI("/maincategory");
export const createMaincategoryAPI = (data) => mutationAPI("/maincategory", "post", data);
export const updateMaincategoryAPI = (data) => mutationAPI(`/maincategory/${getID(data)}`, "put", data);
export const deleteMaincategoryAPI = (data) => mutationAPI(`/maincategory/${getID(data)}`, "delete");

export const getSubcategoryAPI = () => getAPI("/subcategory");
export const createSubcategoryAPI = (data) => mutationAPI("/subcategory", "post", data);
export const updateSubcategoryAPI = (data) => mutationAPI(`/subcategory/${getID(data)}`, "put", data);
export const deleteSubcategoryAPI = (data) => mutationAPI(`/subcategory/${getID(data)}`, "delete");

export const getBrandAPI = () => getAPI("/brand");
export const createBrandAPI = (data) => mutationAPI("/brand", "post", data);
export const updateBrandAPI = (data) => mutationAPI(`/brand/${getID(data)}`, "put", data);
export const deleteBrandAPI = (data) => mutationAPI(`/brand/${getID(data)}`, "delete");

// CART
export const getCartAPI = () => getAPI("/cart");
export const createCartAPI = (data) => mutationAPI("/cart", "post", data);
export const deleteCartAPI = (data) => mutationAPI(`/cart/${getID(data)}`, "delete");

// CHECKOUT & SUPPORT
export const getCheckoutAPI = () => getAPI("/checkout");
export const createCheckoutAPI = (data) => mutationAPI("/checkout", "post", data);

export const getContactAPI = () => getAPI("/contact");
export const createContactAPI = (data) => mutationAPI("/contact", "post", data);

export const getNewslatterAPI = () => getAPI("/newslatter");
export const createNewslatterAPI = (data) => mutationAPI("/newslatter", "post", data);