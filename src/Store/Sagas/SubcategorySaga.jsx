import { takeEvery, put, call } from "redux-saga/effects"
import { createSubcategoryAPI, deleteSubcategoryAPI, getSubcategoryAPI, updateSubcategoryAPI } from "../Services"
import { ADD_SUBCATEGORY_RED, ADD_SUBCATEGORY, GET_SUBCATEGORY, GET_SUBCATEGORY_RED, DELETE_SUBCATEGORY_RED, DELETE_SUBCATEGORY, UPDATE_SUBCATEGORY, UPDATE_SUBCATEGORY_RED } from "../Constant"
import { invalidateCatalogQueries, catalogQueryKeys, fetchSubcategories } from "../../queries/catalogQueries"
import { queryClient } from "../../queries/queryClient"

function* createSubcategorySaga(action) {
    try {
        let response = yield createSubcategoryAPI(action.payload)
        yield put({ type: ADD_SUBCATEGORY_RED, data: response })
        yield call(invalidateCatalogQueries)
    } catch (e) { console.error("❌ Subcategory Add Error:", e) }
}

function* getSubcategorySaga() {
    try {
        const response = yield call([queryClient, queryClient.fetchQuery], {
            queryKey: catalogQueryKeys.subcategories,
            queryFn: ({ signal }) => fetchSubcategories({ signal })
        })
        yield put({ type: GET_SUBCATEGORY_RED, data: response })
    } catch (e) { console.error("❌ Subcategory Fetch Error:", e) }
}

function* deleteSubcategorySaga(action) {
    try {
        yield deleteSubcategoryAPI(action.payload)
        yield put({ type: DELETE_SUBCATEGORY_RED, data: action.payload })
        yield call(invalidateCatalogQueries)
    } catch (e) { console.error("❌ Subcategory Delete Error:", e) }
}

function* updateSubcategorySaga(action) {
    try {
        yield updateSubcategoryAPI(action.payload)
        yield put({ type: UPDATE_SUBCATEGORY_RED, data: action.payload })
        yield call(invalidateCatalogQueries)
    } catch (e) { console.error("❌ Subcategory Update Error:", e) }
}

export function* subcategorySaga() {
    yield takeEvery(ADD_SUBCATEGORY, createSubcategorySaga)
    yield takeEvery(GET_SUBCATEGORY, getSubcategorySaga)
    yield takeEvery(DELETE_SUBCATEGORY, deleteSubcategorySaga)
    yield takeEvery(UPDATE_SUBCATEGORY, updateSubcategorySaga)
}