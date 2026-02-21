import { takeEvery, put } from "redux-saga/effects"
// Ensure the name here matches exactly with the export in Services.jsx
import { 
    createUserAPI, 
    deleteUserAPI, 
    getUserAPI, 
    updateUserAPI, 
    forgetPasswordAPI 
} from "../Services" 
import { 
    ADD_USER, ADD_USER_RED, 
    DELETE_USER, DELETE_USER_RED, 
    GET_USER, GET_USER_RED, 
    UPDATE_USER, UPDATE_USER_RED 
} from "../Constant"

function* createUserSaga(action) {
    try {
        let response = yield createUserAPI(action.payload)
        yield put({ type: ADD_USER_RED, data: response })
    } catch (e) {
        console.error("❌ Signup API Failed:", e)
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
        let response = yield updateUserAPI(action.payload)
        yield put({ type: UPDATE_USER_RED, data: response })
    } catch (e) {
        console.error("❌ Update Profile Failed:", e)
    }
}

function* forgetPasswordSaga(action) {
    try {
        // Logic: Naya password save karne ke liye forgetPasswordAPI call ho rahi hai
        let response = yield forgetPasswordAPI(action.payload)
        // Redux store mein user data update karne ke liye wahi same RED use karenge
        yield put({ type: UPDATE_USER_RED, data: response })
    } catch (e) { 
        console.error("❌ Forget Password Saga Error:", e) 
    }
}

export function* userSaga() {
    yield takeEvery(ADD_USER, createUserSaga)
    yield takeEvery(GET_USER, getUserSaga)
    yield takeEvery(DELETE_USER, deleteUserSaga)
    yield takeEvery(UPDATE_USER, updateUserSaga)
    // "FORGET_PASSWORD" action aapke login page ya reset form se trigger hona chahiye
    yield takeEvery("FORGET_PASSWORD", forgetPasswordSaga) 
}