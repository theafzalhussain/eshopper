import { takeEvery, put } from "redux-saga/effects"
// यहाँ हमने forgetPasswordAPI की जगह resetPasswordAPI कर दिया है
import { getUserAPI, updateUserAPI, resetPasswordAPI, createUserAPI } from "../Services" 
import { ADD_USER, ADD_USER_RED, GET_USER, GET_USER_RED, UPDATE_USER, UPDATE_USER_RED, FORGET_PASSWORD } from "../Constant"

function* getUserSaga() {
    try {
        let res = yield getUserAPI();
        yield put({ type: GET_USER_RED, data: res });
    } catch (e) { console.error("Get User Error:", e) }
}

function* createUserSaga(action) {
    try {
        // यहाँ payload में अब OTP भी जाएगा जो हमने Services में सेट किया है
        let res = yield createUserAPI(action.payload);
        yield put({ type: ADD_USER_RED, data: res });
    } catch (e) { console.error("Create User Error:", e) }
}

function* updateUserSaga(action) {
    try {
        let res = yield updateUserAPI(action.payload);
        // अगर करंट यूज़र अपनी प्रोफाइल अपडेट करता है तो लोकल स्टोरेज अपडेट करें
        if (res.id === localStorage.getItem("userid")) {
            localStorage.setItem("name", res.name);
        }
        yield put({ type: UPDATE_USER_RED, data: res });
    } catch (e) { console.error("Update User Error:", e) }
}

function* forgetSaga(action) {
    try {
        // यहाँ resetPasswordAPI का इस्तेमाल होगा जो /api/reset-password को कॉल करता है
        let res = yield resetPasswordAPI(action.payload);
        yield put({ type: UPDATE_USER_RED, data: res });
    } catch (e) { 
        console.error("Forget Password/Reset Error:", e);
        alert("Verification Failed: Invalid or Expired Code.");
    }
}

export function* userSaga() {
    yield takeEvery(GET_USER, getUserSaga);
    yield takeEvery(ADD_USER, createUserSaga);
    yield takeEvery(UPDATE_USER, updateUserSaga);
    yield takeEvery(FORGET_PASSWORD, forgetSaga);
}