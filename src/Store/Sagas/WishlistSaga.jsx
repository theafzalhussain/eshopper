import { takeEvery, put } from "redux-saga/effects"
import { createWishlistAPI, deleteWishlistAPI, getWishlistAPI, updateWishlistAPI } from "../Services"
import {ADD_WISHLIST_RED,ADD_WISHLIST,GET_WISHLIST,GET_WISHLIST_RED, DELETE_WISHLIST_RED, DELETE_WISHLIST, UPDATE_WISHLIST, UPDATE_WISHLIST_RED} from "../Constant"


function* createWishlistSaga(action) {
    var response = yield createWishlistAPI(action.payload)
    yield put({type:ADD_WISHLIST_RED,data:response})
}
function* getWishlistSaga() {
    var response = yield getWishlistAPI()
    yield put({type:GET_WISHLIST_RED,data:response})
}
function* deleteWishlistSaga(action) {
    yield deleteWishlistAPI(action.payload)
    yield put({type:DELETE_WISHLIST_RED,data:action.payload})
}
function* updateWishlistSaga(action) {
    yield updateWishlistAPI(action.payload)
    yield put({type:UPDATE_WISHLIST_RED,data:action.payload})
}
export function* wishlistSaga() {
    yield takeEvery(ADD_WISHLIST, createWishlistSaga)
    yield takeEvery(GET_WISHLIST, getWishlistSaga)
    yield takeEvery(DELETE_WISHLIST, deleteWishlistSaga)
    yield takeEvery(UPDATE_WISHLIST, updateWishlistSaga)


}