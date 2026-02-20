import { takeEvery, put } from "redux-saga/effects"
import { createUserAPI, deleteUserAPI, getUserAPI, updateUserAPI } from "../Services"
import { ADD_USER, ADD_USER_RED, DELETE_USER, DELETE_USER_RED, GET_USER, GET_USER_RED, UPDATE_USER, UPDATE_USER_RED } from "../Constant"

function* createUserSaga(action) {
    try {
        let response = yield createUserAPI(action.payload)
        yield put({ type: ADD_USER_RED, data: response })
    } catch (e) { console.log("User Signup Error:", e) }
}

function* getUserSaga() {
    try {
        let response = yield getUserAPI()
        yield put({ type: GET_USER_RED, data: response })
    } catch (e) { console.log("User Fetch Error:", e) }
}

function* deleteUserSaga(action) {
    try {
        yield deleteUserAPI(action.payload)
        yield put({ type: DELETE_USER_RED, data: action.payload })
    } catch (e) { console.log("User Delete Error:", e) }
}

function* updateUserSaga(action) {
    try {
        // response me backend se naya updated user data aayega
        let response = yield updateUserAPI(action.payload)
        yield put({ type: UPDATE_USER_RED, data: response })
    } catch (e) { 
        console.log("User Update Error:", e) 
    }
}

export function* userSaga() {
    yield takeEvery(ADD_USER, createUserSaga)
    yield takeEvery(GET_USER, getUserSaga)
    yield takeEvery(DELETE_USER, deleteUserSaga)
    yield takeEvery(UPDATE_USER, updateUserSaga)
}