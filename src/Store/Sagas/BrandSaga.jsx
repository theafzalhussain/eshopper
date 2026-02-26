import { takeEvery, put } from "redux-saga/effects"
import { createBrandAPI, deleteBrandAPI, getBrandAPI, updateBrandAPI } from "../Services"
import { ADD_BRAND, ADD_BRAND_RED, DELETE_BRAND, DELETE_BRAND_RED, GET_BRAND, GET_BRAND_RED, UPDATE_BRAND, UPDATE_BRAND_RED } from "../Constant"

function* createBrandSaga(action) {
    try {
        let response = yield createBrandAPI(action.payload)
        yield put({ type: ADD_BRAND_RED, data: response })
    } catch (e) { console.error("Brand Add Error:", e) }
}
function* getBrandSaga() {
    try {
        let response = yield getBrandAPI()
        yield put({ type: GET_BRAND_RED, data: response })
    } catch (e) { console.error("Brand Fetch Error:", e) }
}
function* deleteBrandSaga(action) {
    try {
        yield deleteBrandAPI(action.payload)
        yield put({ type: DELETE_BRAND_RED, data: action.payload })
    } catch (e) { console.error("Brand Delete Error:", e) }
}
function* updateBrandSaga(action) {
    try {
        yield updateBrandAPI(action.payload)
        yield put({ type: UPDATE_BRAND_RED, data: action.payload })
    } catch (e) { console.error("Brand Update Error:", e) }
}

export function* brandSaga() {
    yield takeEvery(ADD_BRAND, createBrandSaga)
    yield takeEvery(GET_BRAND, getBrandSaga)
    yield takeEvery(DELETE_BRAND, deleteBrandSaga)
    yield takeEvery(UPDATE_BRAND, updateBrandSaga)
}