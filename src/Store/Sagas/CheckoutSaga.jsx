import { takeEvery, put } from "redux-saga/effects"
import { createCheckoutAPI, deleteCheckoutAPI, getCheckoutAPI, updateCheckoutAPI } from "../Services"
import {ADD_CHECKOUT_RED,ADD_CHECKOUT,GET_CHECKOUT,GET_CHECKOUT_RED, DELETE_CHECKOUT_RED, DELETE_CHECKOUT, UPDATE_CHECKOUT, UPDATE_CHECKOUT_RED} from "../Constant"


function* createCheckoutSaga(action) {
    var response = yield createCheckoutAPI(action.payload)
    yield put({type:ADD_CHECKOUT_RED,data:response})
}
function* getCheckoutSaga() {
    var response = yield getCheckoutAPI()
    yield put({type:GET_CHECKOUT_RED,data:response})
}
function* deleteCheckoutSaga(action) {
    yield deleteCheckoutAPI(action.payload)
    yield put({type:DELETE_CHECKOUT_RED,data:action.payload})
}
function* updateCheckoutSaga(action) {
    yield updateCheckoutAPI(action.payload)
    yield put({type:UPDATE_CHECKOUT_RED,data:action.payload})
}
export function* checkoutSaga() {
    yield takeEvery(ADD_CHECKOUT, createCheckoutSaga)
    yield takeEvery(GET_CHECKOUT, getCheckoutSaga)
    yield takeEvery(DELETE_CHECKOUT, deleteCheckoutSaga)
    yield takeEvery(UPDATE_CHECKOUT, updateCheckoutSaga)


}