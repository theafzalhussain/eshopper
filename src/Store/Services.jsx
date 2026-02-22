import { BASE_URL } from "../constants";

// Helper for GET
async function getAPI(endpoint) {
    let response = await fetch(`${BASE_URL}${endpoint}`);
    return await response.json();
}

// Helper for POST/PUT/DELETE with JSON vs FormData handling
async function mutationAPI(endpoint, method, data) {
    let isFormData = data instanceof FormData;
    let response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: isFormData ? {} : { "content-type": "application/json" },
        body: isFormData ? data : JSON.stringify(data)
    });

    // Check content type to prevent parsing HTML as JSON (fix for "Unexpected token <")
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    } else {
        const errorText = await response.text();
        throw new Error("Server error: " + errorText.substring(0, 100));
    }
}

export const loginAPI = (data) => mutationAPI("/login", "post", data);

export const createMaincategoryAPI = (data) => mutationAPI("/maincategory", "post", data);
export const getMaincategoryAPI = () => getAPI("/maincategory");
export const updateMaincategoryAPI = (data) => mutationAPI(`/maincategory/${data.id}`, "put", data);
export const deleteMaincategoryAPI = (data) => mutationAPI(`/maincategory/${data.id}`, "delete");

export const createSubcategoryAPI = (data) => mutationAPI("/subcategory", "post", data);
export const getSubcategoryAPI = () => getAPI("/subcategory");
export const updateSubcategoryAPI = (data) => mutationAPI(`/subcategory/${data.id}`, "put", data);
export const deleteSubcategoryAPI = (data) => mutationAPI(`/subcategory/${data.id}`, "delete");

export const createBrandAPI = (data) => mutationAPI("/brand", "post", data);
export const getBrandAPI = () => getAPI("/brand");
export const updateBrandAPI = (data) => mutationAPI(`/brand/${data.id}`, "put", data);
export const deleteBrandAPI = (data) => mutationAPI(`/brand/${data.id}`, "delete");

export const createProductAPI = (data) => mutationAPI("/product", "post", data);
export const getProductAPI = () => getAPI("/product");
export const updateProductAPI = (data) => {
    const id = data instanceof FormData ? data.get("id") : data.id;
    return mutationAPI(`/product/${id}`, "put", data);
}
export const deleteProductAPI = (data) => mutationAPI(`/product/${data.id}`, "delete");

export const createUserAPI = (data) => mutationAPI("/user", "post", data);
export const getUserAPI = () => getAPI("/user");
export const updateUserAPI = (data) => {
    const id = data instanceof FormData ? data.get("id") : data.id;
    return mutationAPI(`/user/${id}`, "put", data);
}
export const deleteUserAPI = (data) => mutationAPI(`/user/${data.id}`, "delete");
export const forgetPasswordAPI = (data) => mutationAPI("/user/forget-password", "post", data);

export const createCartAPI = (data) => mutationAPI("/cart", "post", data);
export const getCartAPI = () => getAPI("/cart");
export const updateCartAPI = (data) => mutationAPI(`/cart/${data.id}`, "put", data);
export const deleteCartAPI = (data) => mutationAPI(`/cart/${data.id}`, "delete");

export const createWishlistAPI = (data) => mutationAPI("/wishlist", "post", data);
export const getWishlistAPI = () => getAPI("/wishlist");
export const updateWishlistAPI = (data) => mutationAPI(`/wishlist/${data.id}`, "put", data);
export const deleteWishlistAPI = (data) => mutationAPI(`/wishlist/${data.id}`, "delete");

export const createCheckoutAPI = (data) => mutationAPI("/checkout", "post", data);
export const getCheckoutAPI = () => getAPI("/checkout");
export const updateCheckoutAPI = (data) => mutationAPI(`/checkout/${data.id}`, "put", data);
export const deleteCheckoutAPI = (data) => mutationAPI(`/checkout/${data.id}`, "delete");

export const createContactAPI = (data) => mutationAPI("/contact", "post", data);
export const getContactAPI = () => getAPI("/contact");
export const updateContactAPI = (data) => mutationAPI(`/contact/${data.id}`, "put", data);
export const deleteContactAPI = (data) => mutationAPI(`/contact/${data.id}`, "delete");

export const createNewslatterAPI = (data) => mutationAPI("/newslatter", "post", data);
export const getNewslatterAPI = () => getAPI("/newslatter");
export const updateNewslatterAPI = (data) => mutationAPI(`/newslatter/${data.id}`, "put", data);
export const deleteNewslatterAPI = (data) => mutationAPI(`/newslatter/${data.id}`, "delete");