import { BASE_URL } from "../constants";

// Generic function for all GET requests
async function getAPI(endpoint) {
    let response = await fetch(`${BASE_URL}${endpoint}`);
    return await response.json();
}

// Generic function for POST/PUT/DELETE
async function mutationAPI(endpoint, method, data) {
    let isFormData = data instanceof FormData;
    let response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: isFormData ? {} : { "content-type": "application/json" },
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
export const createProductAPI = (data) => mutationAPI("/product", "post", data); // FormData compatible
export const getProductAPI = () => getAPI("/product");
export const updateProductAPI = (data) => mutationAPI(`/product/${data.id}`, "put", data);
export const deleteProductAPI = (data) => mutationAPI(`/product/${data.id}`, "delete");

// --- NEWSLATTER ---
export const createNewslatterAPI = (data) => mutationAPI("/newslatter", "post", data);
export const getNewslatterAPI = () => getAPI("/newslatter");
export const deleteNewslatterAPI = (data) => mutationAPI(`/newslatter/${data.id}`, "delete");

// --- USER ---
export const createUserAPI = (data) => mutationAPI("/user", "post", data);
export const getUserAPI = () => getAPI("/user");
export const updateUserAPI = (data) => mutationAPI(`/user/${data.id}`, "put", data);