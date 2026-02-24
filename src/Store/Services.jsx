import { BASE_URL } from "../constants";

const getID = (data) => {
    if (data instanceof FormData) return data.get("id");
    if (typeof data === "object" && data !== null) return data.id || data._id;
    return data;
};

async function fastAPI(endpoint, method = "GET", data = null) {
    const isFD = data instanceof FormData;
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: isFD ? {} : { "content-type": "application/json" },
        body: isFD ? data : (data ? JSON.stringify(data) : null)
    });
    if (res.ok) {
        const text = await res.text();
        return text ? JSON.parse(text) : { result: "Done" };
    }
    const errText = await res.text();
    throw new Error(errText || "API Failure");
}

// --- SYNCED EXPORTS ---
export const loginAPI = (d) => fastAPI("/login", "POST", d);
export const sendOtpAPI = (d) => fastAPI("/api/send-otp", "POST", d);
export const resetPasswordAPI = (d) => fastAPI("/api/reset-password", "POST", d);
export const forgetPasswordAPI = (d) => fastAPI("/api/reset-password", "POST", d); // Fixed for Saga

export const getUserAPI = () => fastAPI("/user");
export const getSingleUserAPI = (id) => fastAPI(`/user/${id}`);
export const createUserAPI = (d) => fastAPI("/user", "POST", d);
export const updateUserAPI = (d) => fastAPI(`/user/${getID(d)}`, "PUT", d);
export const deleteUserAPI = (d) => fastAPI(`/user/${getID(d)}`, "DELETE");

export const getProductAPI = () => fastAPI("/product");
export const getSingleProductAPI = (id) => fastAPI(`/product/${id}`);
export const createProductAPI = (d) => fastAPI("/product", "POST", d);
export const updateProductAPI = (d) => fastAPI(`/product/${getID(d)}`, "PUT", d);
export const deleteProductAPI = (d) => fastAPI(`/product/${getID(d)}`, "DELETE");

export const getMaincategoryAPI = () => fastAPI("/maincategory");
export const createMaincategoryAPI = (d) => fastAPI("/maincategory", "POST", d);
export const updateMaincategoryAPI = (d) => fastAPI(`/maincategory/${getID(d)}`, "PUT", d);
export const deleteMaincategoryAPI = (d) => fastAPI(`/maincategory/${getID(d)}`, "DELETE");

export const getSubcategoryAPI = () => fastAPI("/subcategory");
export const createSubcategoryAPI = (d) => fastAPI("/subcategory", "POST", d);
export const updateSubcategoryAPI = (d) => fastAPI(`/subcategory/${getID(d)}`, "PUT", d);
export const deleteSubcategoryAPI = (d) => fastAPI(`/subcategory/${getID(d)}`, "DELETE");

export const getBrandAPI = () => fastAPI("/brand");
export const createBrandAPI = (d) => fastAPI("/brand", "POST", d);
export const updateBrandAPI = (d) => fastAPI(`/brand/${getID(d)}`, "PUT", d);
export const deleteBrandAPI = (d) => fastAPI(`/brand/${getID(d)}`, "DELETE");

export const getCartAPI = () => fastAPI("/cart");
export const createCartAPI = (d) => fastAPI("/cart", "POST", d);
export const updateCartAPI = (d) => fastAPI(`/cart/${getID(d)}`, "PUT", d);
export const deleteCartAPI = (d) => fastAPI(`/cart/${getID(d)}`, "DELETE");

export const getWishlistAPI = () => fastAPI("/wishlist");
export const createWishlistAPI = (d) => fastAPI("/wishlist", "POST", d);
export const updateWishlistAPI = (d) => fastAPI(`/wishlist/${getID(d)}`, "PUT", d);
export const deleteWishlistAPI = (d) => fastAPI(`/wishlist/${getID(d)}`, "DELETE");

export const getCheckoutAPI = () => fastAPI("/checkout");
export const createCheckoutAPI = (d) => fastAPI("/checkout", "POST", d);
export const updateCheckoutAPI = (d) => fastAPI(`/checkout/${getID(d)}`, "PUT", d);
export const deleteCheckoutAPI = (d) => fastAPI(`/checkout/${getID(d)}`, "DELETE");

export const getContactAPI = () => fastAPI("/contact");
export const createContactAPI = (d) => fastAPI("/contact", "POST", d);
export const updateContactAPI = (d) => fastAPI(`/contact/${getID(d)}`, "PUT", d);
export const deleteContactAPI = (d) => fastAPI(`/contact/${getID(d)}`, "DELETE");

export const getNewslatterAPI = () => fastAPI("/newslatter");
export const createNewslatterAPI = (d) => fastAPI("/newslatter", "POST", d);
export const updateNewslatterAPI = (d) => fastAPI(`/newslatter/${getID(d)}`, "PUT", d);
export const deleteNewslatterAPI = (d) => fastAPI(`/newslatter/${getID(d)}`, "DELETE");