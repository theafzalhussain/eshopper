import { takeEvery, put } from "redux-saga/effects"
import { createCheckoutAPI, deleteCheckoutAPI, getCheckoutAPI, updateCheckoutAPI } from "../Services"
import { ADD_CHECKOUT_RED, ADD_CHECKOUT, GET_CHECKOUT, GET_CHECKOUT_RED, DELETE_CHECKOUT_RED, DELETE_CHECKOUT, UPDATE_CHECKOUT, UPDATE_CHECKOUT_RED } from "../Constant"

function* createCheckoutSaga(action) {
    try {
        let response = yield createCheckoutAPI(action.payload)
        yield put({ type: ADD_CHECKOUT_RED, data: response })
    } catch (e) {
        console.error("❌ Checkout Create Error:", e)
    }
}

function* getCheckoutSaga() {
    try {
        let response = yield getCheckoutAPI()
        yield put({ type: GET_CHECKOUT_RED, data: response })
    } catch (e) {
        console.error("❌ Checkout Fetch Error:", e)
    }
}

function* deleteCheckoutSaga(action) {
    try {
        yield deleteCheckoutAPI(action.payload)
        yield put({ type: DELETE_CHECKOUT_RED, data: action.payload })
    } catch (e) {
        console.error("❌ Checkout Delete Error:", e)
    }
}

function* updateCheckoutSaga(action) {
    try {
        let response = yield updateCheckoutAPI(action.payload)
        yield put({ type: UPDATE_CHECKOUT_RED, data: response })
    } catch (e) {
        console.error("❌ Checkout Update Error:", e)
    }
}

export function* checkoutSaga() {
    yield takeEvery(ADD_CHECKOUT, createCheckoutSaga)
    yield takeEvery(GET_CHECKOUT, getCheckoutSaga)
    yield takeEvery(DELETE_CHECKOUT, deleteCheckoutSaga)
    yield takeEvery(UPDATE_CHECKOUT, updateCheckoutSaga)
}