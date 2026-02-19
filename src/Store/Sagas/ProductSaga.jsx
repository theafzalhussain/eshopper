import { takeEvery, put } from "redux-saga/effects"
import { createProductAPI, deleteProductAPI, getProductAPI, updateProductAPI } from "../Services"
import {
    ADD_PRODUCT_RED, ADD_PRODUCT, 
    GET_PRODUCT, GET_PRODUCT_RED, 
    DELETE_PRODUCT_RED, DELETE_PRODUCT, 
    UPDATE_PRODUCT, UPDATE_PRODUCT_RED
} from "../Constant"

function* createProductSaga(action) {
    try {
        const response = yield createProductAPI(action.payload)
        yield put({ type: ADD_PRODUCT_RED, data: response })
    } catch (e) { console.error("Product Create Error", e) }
}

function* getProductSaga() {
    try {
        const response = yield getProductAPI()
        yield put({ type: GET_PRODUCT_RED, data: response })
    } catch (e) { console.error("Product Fetch Error", e) }
}

function* deleteProductSaga(action) {
    try {
        yield deleteProductAPI(action.payload)
        yield put({ type: DELETE_PRODUCT_RED, data: action.payload })
    } catch (e) { console.error("Product Delete Error", e) }
}

function* updateProductSaga(action) {
    try {
        const response = yield updateProductAPI(action.payload)
        yield put({ type: UPDATE_PRODUCT_RED, data: response })
    } catch (e) { console.error("Product Update Error", e) }
}

export function* productSaga() {
    yield takeEvery(ADD_PRODUCT, createProductSaga)
    yield takeEvery(GET_PRODUCT, getProductSaga)
    yield takeEvery(DELETE_PRODUCT, deleteProductSaga)
    yield takeEvery(UPDATE_PRODUCT, updateProductSaga)
}