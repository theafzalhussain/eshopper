import { BASE_URL } from "../constants";

const getID = (data) => {
    if (data instanceof FormData) return data.get("id");
    if (typeof data === "object" && data !== null) return data.id || data._id;
    return data;
};

async function getAPI(endpoint) {
    let res = await fetch(`${BASE_URL}${endpoint}`);
    if (res.ok) return await res.json();
    throw new Error("Backend is starting up... please refresh.");
}

async function mutationAPI(endpoint, method, data) {
    let isFD = data instanceof FormData;
    let res = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: isFD ? {} : { "content-type": "application/json" },
        body: isFD ? data : (data ? JSON.stringify(data) : undefined)
    });
    if (res.ok) {
        const text = await res.text();
        return text ? JSON.parse(text) : { result: "Done" };
    }
    throw new Error("API Failure");
}

// --- FULL EXPORT LIST (SYNCED WITH ALL SAGAS) ---

export const loginAPI = (d) => mutationAPI("/login", "post", d);
export const sendOtpAPI = (d) => mutationAPI("/api/send-otp", "post", d);
export const resetPasswordAPI = (d) => mutationAPI("/api/reset-password", "post", d);
export const forgetPasswordAPI = (d) => mutationAPI("/user/forget-password", "post", d);

export const getUserAPI = () => getAPI("/user");
export const createUserAPI = (d) => mutationAPI("/user", "post", d);
export const updateUserAPI = (d) => mutationAPI(`/user/${getID(d)}`, "put", d);
export const deleteUserAPI = (d) => mutationAPI(`/user/${getID(d)}`, "delete");

export const getProductAPI = () => getAPI("/product");
export const createProductAPI = (d) => mutationAPI("/product", "post", d);
export const updateProductAPI = (d) => mutationAPI(`/product/${getID(d)}`, "put", d);
export const deleteProductAPI = (d) => mutationAPI(`/product/${getID(d)}`, "delete");

export const getMaincategoryAPI = () => getAPI("/maincategory");
export const createMaincategoryAPI = (d) => mutationAPI("/maincategory", "post", d);
export const updateMaincategoryAPI = (d) => mutationAPI(`/maincategory/${getID(d)}`, "put", d);
export const deleteMaincategoryAPI = (d) => mutationAPI(`/maincategory/${getID(d)}`, "delete");

export const getSubcategoryAPI = () => getAPI("/subcategory");
export const createSubcategoryAPI = (d) => mutationAPI("/subcategory", "post", d);
export const updateSubcategoryAPI = (d) => mutationAPI(`/subcategory/${getID(d)}`, "put", d);
export const deleteSubcategoryAPI = (d) => mutationAPI(`/subcategory/${getID(d)}`, "delete");

export const getBrandAPI = () => getAPI("/brand");
export const createBrandAPI = (d) => mutationAPI("/brand", "post", d);
export const updateBrandAPI = (d) => mutationAPI(`/brand/${getID(d)}`, "put", d);
export const deleteBrandAPI = (d) => mutationAPI(`/brand/${getID(d)}`, "delete");

export const getCartAPI = () => getAPI("/cart");
export const createCartAPI = (d) => mutationAPI("/cart", "post", d);
export const updateCartAPI = (d) => mutationAPI(`/cart/${getID(d)}`, "put", d);
export const deleteCartAPI = (d) => mutationAPI(`/cart/${getID(d)}`, "delete");

export const getWishlistAPI = () => getAPI("/wishlist");
export const createWishlistAPI = (d) => mutationAPI("/wishlist", "post", d);
export const updateWishlistAPI = (d) => mutationAPI(`/wishlist/${getID(d)}`, "put", d);
export const deleteWishlistAPI = (d) => mutationAPI(`/wishlist/${getID(d)}`, "delete");

export const getCheckoutAPI = () => getAPI("/checkout");
export const createCheckoutAPI = (d) => mutationAPI("/checkout", "post", d);
export const updateCheckoutAPI = (d) => mutationAPI(`/checkout/${getID(d)}`, "put", d);
export const deleteCheckoutAPI = (d) => mutationAPI(`/checkout/${getID(d)}`, "delete");

export const getContactAPI = () => getAPI("/contact");
export const createContactAPI = (d) => mutationAPI("/contact", "post", d);
export const updateContactAPI = (d) => mutationAPI(`/contact/${getID(d)}`, "put", d);
export const deleteContactAPI = (d) => mutationAPI(`/contact/${getID(d)}`, "delete");

export const getNewslatterAPI = () => getAPI("/newslatter");
export const createNewslatterAPI = (d) => mutationAPI("/newslatter", "post", d);
export const updateNewslatterAPI = (d) => mutationAPI(`/newslatter/${getID(d)}`, "put", d);
export const deleteNewslatterAPI = (d) => mutationAPI(`/newslatter/${getID(d)}`, "delete");