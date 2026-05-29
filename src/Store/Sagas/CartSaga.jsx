import { takeEvery, put } from "redux-saga/effects"
import { clearUserCartAPI, createCartAPI, deleteCartAPI, getCartAPI, updateCartAPI } from "../Services"
import { ADD_CART, ADD_CART_RED, CLEAR_CART, CLEAR_CART_RED, DELETE_CART, DELETE_CART_RED, GET_CART, GET_CART_RED, UPDATE_CART, UPDATE_CART_RED } from "../Constant"

function* createCartSaga(action) {
    try {
        if (!action || !action.payload) return;
        console.log("Cart Saga Payload:", action.payload); // Debug log
        // Validate required fields before calling API
        const payload = action.payload || {};
        const productId = payload.productId || payload.productid || payload.product;
        const userId = payload.userId || payload.userid || payload.user;
        if (!userId || !productId) {
            console.warn('createCartSaga: missing userId or productId, skipping API call', { userId, productId });
            try { window.dispatchEvent(new CustomEvent('eshopper:cart:error', { detail: { message: 'Missing userId or productId' } })); } catch (e) {}
            return;
        }
        // Client-side sanity check for size/color: allow absence (product without variants),
        // but block explicit empty strings which indicate missing selection.
        const hasSizeField = Object.prototype.hasOwnProperty.call(payload, 'size');
        const hasColorField = Object.prototype.hasOwnProperty.call(payload, 'color');
        if ((hasSizeField && (payload.size === '' || payload.size === null)) || (hasColorField && (payload.color === '' || payload.color === null))) {
            try { window.dispatchEvent(new CustomEvent('eshopper:cart:error', { detail: { message: 'Please select size and color before adding to cart.' } })); } catch (e) {}
            return;
        }

        let response = yield createCartAPI(action.payload);
        if (!response) {
            console.error("API returned undefined response in createCartSaga");
            try { window.dispatchEvent(new CustomEvent('eshopper:cart:error', { detail: { message: 'No response from add-to-cart API' } })); } catch (e) {}
            return;
        }
        const cartData = response.cart || response;
        yield put({ type: ADD_CART_RED, data: cartData });
        // Refresh cart state to ensure all UI consumers have the latest data
        yield put({ type: GET_CART });
        // Emit a browser event so UI can show server-confirmed toasts or handle success
        try {
            window.dispatchEvent(new CustomEvent('eshopper:cart:confirmed', { detail: { success: true, message: (response && response.message) || 'Added to cart', cart: cartData } }));
        } catch (e) {}
    } catch (e) { console.error("❌ Cart Add Error:", e); try { window.dispatchEvent(new CustomEvent('eshopper:cart:error', { detail: { message: String(e?.message || 'Cart add failed') } })); } catch (err) {} }
}

function* getCartSaga() {
    try {
        const userId = localStorage.getItem("userid");
        const isLoggedIn = localStorage.getItem('login') === 'true';
        if (!userId || !isLoggedIn) return;
        let response = yield getCartAPI(userId);
        if (!response) {
            console.error("API returned undefined response in getCartSaga");
            return;
        }
        const cartData = response.cart || response;
        yield put({ type: GET_CART_RED, data: cartData });
    } catch (e) { console.error("❌ Cart Fetch Error:", e) }
}

function* deleteCartSaga(action) {
    try {
        if (!action || !action.payload) return;
        let response = yield deleteCartAPI(action.payload);
        if (!response) {
            console.error("API returned undefined response in deleteCartSaga");
            return;
        }
        const cartData = response.cart || response;
        yield put({ type: DELETE_CART_RED, data: cartData });
    } catch (e) { console.error("❌ Cart Delete Error:", e) }
}

function* updateCartSaga(action) {
    try {
        if (!action || !action.payload) return;
        let response = yield updateCartAPI(action.payload);
        if (!response) {
            console.error("API returned undefined response in updateCartSaga");
            return;
        }
        const cartData = response.cart || response;
        yield put({ type: UPDATE_CART_RED, data: cartData });
    } catch (e) { console.error("❌ Cart Update Error:", e) }
}

function* clearCartSaga(action) {
    try {
        const userid = action.payload?.userid
        if (!userid) return
        yield clearUserCartAPI(userid)
        yield put({ type: CLEAR_CART_RED, data: { userid } })
    } catch (e) { console.error("❌ Cart Clear Error:", e) }
}

export function* cartSaga() {
    yield takeEvery(ADD_CART, createCartSaga)
    yield takeEvery(GET_CART, getCartSaga)
    yield takeEvery(DELETE_CART, deleteCartSaga)
    yield takeEvery(UPDATE_CART, updateCartSaga)
    yield takeEvery(CLEAR_CART, clearCartSaga)
}