import { takeEvery, put } from "redux-saga/effects"
import { getUserAPI, updateUserAPI } from "../Services" 
import { GET_USER, GET_USER_RED, UPDATE_USER, UPDATE_USER_RED } from "../Constant"

function* getUserSaga() {
    try {
        let res = yield getUserAPI();
        yield put({ type: GET_USER_RED, data: res });
    } catch (e) { console.error("Fetch Fail", e) }
}

function* updateUserSaga(action) {
    try {
        let res = yield updateUserAPI(action.payload);
        if (res.id === localStorage.getItem("userid")) {
            localStorage.setItem("name", res.name);
            if(res.pic) localStorage.setItem("pic", res.pic);
        }
        yield put({ type: UPDATE_USER_RED, data: res });
    } catch (e) { console.error("Update Fail", e) }
}

export function* userSaga() {
    yield takeEvery(GET_USER, getUserSaga);
    yield takeEvery(UPDATE_USER, updateUserSaga);
}