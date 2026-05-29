import { takeEvery, put } from "redux-saga/effects"
import { createWishlistAPI, deleteWishlistAPI, getWishlistAPI, updateWishlistAPI } from "../Services"
import { ADD_WISHLIST_RED, ADD_WISHLIST, GET_WISHLIST, GET_WISHLIST_RED, DELETE_WISHLIST_RED, DELETE_WISHLIST, UPDATE_WISHLIST, UPDATE_WISHLIST_RED } from "../Constant"

function* refreshWishlist(userId) {
    if (!userId) return;
    const response = yield getWishlistAPI(userId)
    yield put({ type: GET_WISHLIST_RED, data: response })
}

function* createWishlistSaga(action) {
    try {
        if (!action || !action.payload) return;
        const response = yield createWishlistAPI(action.payload)
        const userId = action.payload.userid || action.payload.userId || action.payload.user || localStorage.getItem('userid')
        yield refreshWishlist(userId)
        try { window.dispatchEvent(new CustomEvent('eshopper:wishlist:confirmed', { detail: { success: true, message: (response && response.message) || 'Added to wishlist', data: response } })); } catch (e) {}
    } catch (e) { console.error("❌ Wishlist Add Error:", e); try { window.dispatchEvent(new CustomEvent('eshopper:wishlist:error', { detail: { message: String(e?.message || 'Wishlist add failed') } })); } catch (err) {} }
}

function* getWishlistSaga() {
    try {
        const userId = localStorage.getItem('userid')
        if (!userId) return
        let response = yield getWishlistAPI(userId)
        yield put({ type: GET_WISHLIST_RED, data: response })
    } catch (e) { console.error("❌ Wishlist Fetch Error:", e) }
}

function* deleteWishlistSaga(action) {
    try {
        if (!action || !action.payload) return;
        const targetId = action.payload?.id || action.payload?._id || action.payload;
        if (!targetId) return;
        const userId = action.payload.userid || action.payload.userId || action.payload.user || localStorage.getItem('userid')
        yield deleteWishlistAPI(targetId)
        yield refreshWishlist(userId)
    } catch (e) { console.error("❌ Wishlist Delete Error:", e) }
}

function* updateWishlistSaga(action) {
    try {
        if (!action || !action.payload) return;
        const userId = action.payload.userid || action.payload.userId || action.payload.user || localStorage.getItem('userid')
        yield updateWishlistAPI(action.payload)
        yield refreshWishlist(userId)
    } catch (e) { console.error("❌ Wishlist Update Error:", e) }
}

export function* wishlistSaga() {
    yield takeEvery(ADD_WISHLIST, createWishlistSaga)
    yield takeEvery(GET_WISHLIST, getWishlistSaga)
    yield takeEvery(DELETE_WISHLIST, deleteWishlistSaga)
    yield takeEvery(UPDATE_WISHLIST, updateWishlistSaga)
}