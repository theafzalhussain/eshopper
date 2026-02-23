import { takeEvery, put } from "redux-saga/effects"
import { createWishlistAPI, deleteWishlistAPI, getWishlistAPI, updateWishlistAPI } from "../Services"
import { ADD_WISHLIST_RED, ADD_WISHLIST, GET_WISHLIST, GET_WISHLIST_RED, DELETE_WISHLIST_RED, DELETE_WISHLIST, UPDATE_WISHLIST, UPDATE_WISHLIST_RED } from "../Constant"

function* createWishlistSaga(action) {
    try {
        let response = yield createWishlistAPI(action.payload)
        yield put({ type: ADD_WISHLIST_RED, data: response })
    } catch (e) { console.error("❌ Wishlist Add Error:", e) }
}

function* getWishlistSaga() {
    try {
        let response = yield getWishlistAPI()
        yield put({ type: GET_WISHLIST_RED, data: response })
    } catch (e) { console.error("❌ Wishlist Fetch Error:", e) }
}

function* deleteWishlistSaga(action) {
    try {
        yield deleteWishlistAPI(action.payload)
        yield put({ type: DELETE_WISHLIST_RED, data: action.payload })
    } catch (e) { console.error("❌ Wishlist Delete Error:", e) }
}

function* updateWishlistSaga(action) {
    try {
        yield updateWishlistAPI(action.payload)
        yield put({ type: UPDATE_WISHLIST_RED, data: action.payload })
    } catch (e) { console.error("❌ Wishlist Update Error:", e) }
}

export function* wishlistSaga() {
    yield takeEvery(ADD_WISHLIST, createWishlistSaga)
    yield takeEvery(GET_WISHLIST, getWishlistSaga)
    yield takeEvery(DELETE_WISHLIST, deleteWishlistSaga)
    yield takeEvery(UPDATE_WISHLIST, updateWishlistSaga)
}