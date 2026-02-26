import { takeEvery, put } from "redux-saga/effects"
import { createMaincategoryAPI, deleteMaincategoryAPI, getMaincategoryAPI, updateMaincategoryAPI } from "../Services"
import { ADD_MAINCATEGORY, ADD_MAINCATEGORY_RED, DELETE_MAINCATEGORY, DELETE_MAINCATEGORY_RED, GET_MAINCATEGORY, GET_MAINCATEGORY_RED, UPDATE_MAINCATEGORY, UPDATE_MAINCATEGORY_RED } from "../Constant"

function* createMaincategorySaga(action) {
    try {
        let response = yield createMaincategoryAPI(action.payload)
        yield put({ type: ADD_MAINCATEGORY_RED, data: response })
    } catch (e) { console.error("Maincategory Add Error:", e) }
}
function* getMaincategorySaga() {
    try {
        let response = yield getMaincategoryAPI()
        yield put({ type: GET_MAINCATEGORY_RED, data: response })
    } catch (e) { console.error("Maincategory Fetch Error:", e) }
}
function* deleteMaincategorySaga(action) {
    try {
        yield deleteMaincategoryAPI(action.payload)
        yield put({ type: DELETE_MAINCATEGORY_RED, data: action.payload })
    } catch (e) { console.error("Maincategory Delete Error:", e) }
}
function* updateMaincategorySaga(action) {
    try {
        yield updateMaincategoryAPI(action.payload)
        yield put({ type: UPDATE_MAINCATEGORY_RED, data: action.payload })
    } catch (e) { console.error("Maincategory Update Error:", e) }
}

export function* maincategorySaga() {
    yield takeEvery(ADD_MAINCATEGORY, createMaincategorySaga)
    yield takeEvery(GET_MAINCATEGORY, getMaincategorySaga)
    yield takeEvery(DELETE_MAINCATEGORY, deleteMaincategorySaga)
    yield takeEvery(UPDATE_MAINCATEGORY, updateMaincategorySaga)
}