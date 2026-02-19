import { takeEvery, put } from "redux-saga/effects"
import { createContactAPI, deleteContactAPI, getContactAPI, updateContactAPI } from "../Services"
import {ADD_CONTACT_RED,ADD_CONTACT,GET_CONTACT,GET_CONTACT_RED, DELETE_CONTACT_RED, DELETE_CONTACT, UPDATE_CONTACT, UPDATE_CONTACT_RED} from "../Constant"


function* createContactSaga(action) {
    var response = yield createContactAPI(action.payload)
    yield put({type:ADD_CONTACT_RED,data:response})
}
function* getContactSaga() {
    var response = yield getContactAPI()
    yield put({type:GET_CONTACT_RED,data:response})
}
function* deleteContactSaga(action) {
    yield deleteContactAPI(action.payload)
    yield put({type:DELETE_CONTACT_RED,data:action.payload})
}
function* updateContactSaga(action) {
    yield updateContactAPI(action.payload)
    yield put({type:UPDATE_CONTACT_RED,data:action.payload})
}
export function* contactSaga() {
    yield takeEvery(ADD_CONTACT, createContactSaga)
    yield takeEvery(GET_CONTACT, getContactSaga)
    yield takeEvery(DELETE_CONTACT, deleteContactSaga)
    yield takeEvery(UPDATE_CONTACT, updateContactSaga)


}