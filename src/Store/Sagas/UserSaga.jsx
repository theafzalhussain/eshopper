import { takeEvery, put } from "redux-saga/effects"
import { getUserAPI, updateUserAPI, forgetPasswordAPI, createUserAPI } from "../Services" 
import { ADD_USER, ADD_USER_RED, GET_USER, GET_USER_RED, UPDATE_USER, UPDATE_USER_RED } from "../Constant"

function* getUserSaga() {
    try {
        let res = yield getUserAPI();
        yield put({ type: GET_USER_RED, data: res });
    } catch (e) { console.error(e) }
}

function* createUserSaga(action) {
    try {
        let res = yield createUserAPI(action.payload);
        yield put({ type: ADD_USER_RED, data: res });
    } catch (e) { console.error(e) }
}

function* updateUserSaga(action) {
    try {
        let res = yield updateUserAPI(action.payload);
        if (res.id === localStorage.getItem("userid")) {
            localStorage.setItem("name", res.name);
        }
        yield put({ type: UPDATE_USER_RED, data: res });
    } catch (e) { console.error(e) }
}

function* forgetSaga(action) {
    try {
        // Backend ke dedicated route /user/forget-password ko call karega
        let res = yield forgetPasswordAPI(action.payload);
        yield put({ type: UPDATE_USER_RED, data: res });
    } catch (e) { console.error("Forget Password Error:", e) }
}

export function* userSaga() {
    yield takeEvery(GET_USER, getUserSaga);
    yield takeEvery(ADD_USER, createUserSaga);
    yield takeEvery(UPDATE_USER, updateUserSaga);
    yield takeEvery("FORGET_PASSWORD", forgetSaga);
}