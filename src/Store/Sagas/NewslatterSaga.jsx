import { takeEvery, put } from "redux-saga/effects"
import { createNewslatterAPI, deleteNewslatterAPI, getNewslatterAPI, updateNewslatterAPI } from "../Services"
import {
    ADD_NEWSLATTER_RED, ADD_NEWSLATTER, 
    GET_NEWSLATTER, GET_NEWSLATTER_RED, 
    DELETE_NEWSLATTER_RED, DELETE_NEWSLATTER, 
    UPDATE_NEWSLATTER, UPDATE_NEWSLATTER_RED
} from "../Constant"

function* createNewslatterSaga(action) {
    try {
        const response = yield createNewslatterAPI(action.payload)
        yield put({ type: ADD_NEWSLATTER_RED, data: response })
    } catch (e) { console.error("Newsletter Create Error", e) }
}

function* getNewslatterSaga() {
    try {
        const response = yield getNewslatterAPI()
        yield put({ type: GET_NEWSLATTER_RED, data: response })
    } catch (e) { console.error("Newsletter Fetch Error", e) }
}

function* deleteNewslatterSaga(action) {
    try {
        yield deleteNewslatterAPI(action.payload)
        yield put({ type: DELETE_NEWSLATTER_RED, data: action.payload })
    } catch (e) { console.error("Newsletter Delete Error", e) }
}

function* updateNewslatterSaga(action) {
    try {
        const response = yield updateNewslatterAPI(action.payload)
        yield put({ type: UPDATE_NEWSLATTER_RED, data: response })
    } catch (e) { console.error("Newsletter Update Error", e) }
}

export function* newslatterSaga() {
    yield takeEvery(ADD_NEWSLATTER, createNewslatterSaga)
    yield takeEvery(GET_NEWSLATTER, getNewslatterSaga)
    yield takeEvery(DELETE_NEWSLATTER, deleteNewslatterSaga)
    yield takeEvery(UPDATE_NEWSLATTER, updateNewslatterSaga)
}