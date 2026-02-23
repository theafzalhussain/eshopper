import { takeEvery, put } from "redux-saga/effects"
import { createUserAPI, deleteUserAPI, getUserAPI, updateUserAPI, forgetPasswordAPI } from "../Services" 
import { ADD_USER, ADD_USER_RED, DELETE_USER, DELETE_USER_RED, GET_USER, GET_USER_RED, UPDATE_USER, UPDATE_USER_RED } from "../Constant"

function* createUserSaga(action) {
    try {
        let response = yield createUserAPI(action.payload)
        yield put({ type: ADD_USER_RED, data: response })
    } catch (e) { 
        console.error("❌ Signup Failed:", e) 
    }
}

function* getUserSaga() {
    try {
        let response = yield getUserAPI()
        yield put({ type: GET_USER_RED, data: response })
    } catch (e) { 
        console.error("❌ Fetch Users Failed:", e) 
    }
}

function* deleteUserSaga(action) {
    try {
        yield deleteUserAPI(action.payload)
        yield put({ type: DELETE_USER_RED, data: action.payload })
    } catch (e) { 
        console.error("❌ Delete User Failed:", e) 
    }
}

function* updateUserSaga(action) {
    try {
        // action.payload is FormData (for pic update)
        let response = yield updateUserAPI(action.payload)
        
        // Update LocalStorage if the updated user is the logged-in user
        if (response.id === localStorage.getItem("userid")) {
            localStorage.setItem("name", response.name);
            if(response.pic) localStorage.setItem("pic", response.pic);
        }

        yield put({ type: UPDATE_USER_RED, data: response })
    } catch (e) { 
        console.error("❌ Update Profile Failed (ID or FormData error):", e) 
    }
}

function* forgetPasswordSaga(action) {
    try {
        let response = yield forgetPasswordAPI(action.payload)
        yield put({ type: UPDATE_USER_RED, data: response })
    } catch (e) { 
        console.error("❌ Forget Password API Error:", e) 
    }
}

export function* userSaga() {
    yield takeEvery(ADD_USER, createUserSaga)
    yield takeEvery(GET_USER, getUserSaga)
    yield takeEvery(DELETE_USER, deleteUserSaga)
    yield takeEvery(UPDATE_USER, updateUserSaga)
    yield takeEvery("FORGET_PASSWORD", forgetPasswordSaga)
}