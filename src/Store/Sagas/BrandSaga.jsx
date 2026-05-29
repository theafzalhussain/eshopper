import { takeEvery, put, call } from "redux-saga/effects"
import { createBrandAPI, deleteBrandAPI, getBrandAPI, updateBrandAPI } from "../Services"
import { ADD_BRAND, ADD_BRAND_RED, DELETE_BRAND, DELETE_BRAND_RED, GET_BRAND, GET_BRAND_RED, UPDATE_BRAND, UPDATE_BRAND_RED } from "../Constant"
import { invalidateCatalogQueries, catalogQueryKeys, fetchBrands } from "../../queries/catalogQueries"
import { queryClient } from "../../queries/queryClient"

function* createBrandSaga(action) {
    try {
        let response = yield createBrandAPI(action.payload)
        yield put({ type: ADD_BRAND_RED, data: response })
        yield call(invalidateCatalogQueries)
    } catch (e) { console.error("Brand Add Error:", e) }
}
function* getBrandSaga() {
    try {
        const response = yield call([queryClient, queryClient.fetchQuery], {
            queryKey: catalogQueryKeys.brands,
            queryFn: ({ signal }) => fetchBrands({ signal })
        })
        yield put({ type: GET_BRAND_RED, data: response })
    } catch (e) { console.error("Brand Fetch Error:", e) }
}
function* deleteBrandSaga(action) {
    try {
        yield deleteBrandAPI(action.payload)
        yield put({ type: DELETE_BRAND_RED, data: action.payload })
        yield call(invalidateCatalogQueries)
    } catch (e) { console.error("Brand Delete Error:", e) }
}
function* updateBrandSaga(action) {
    try {
        yield updateBrandAPI(action.payload)
        yield put({ type: UPDATE_BRAND_RED, data: action.payload })
        yield call(invalidateCatalogQueries)
    } catch (e) { console.error("Brand Update Error:", e) }
}

export function* brandSaga() {
    yield takeEvery(ADD_BRAND, createBrandSaga)
    yield takeEvery(GET_BRAND, getBrandSaga)
    yield takeEvery(DELETE_BRAND, deleteBrandSaga)
    yield takeEvery(UPDATE_BRAND, updateBrandSaga)
}