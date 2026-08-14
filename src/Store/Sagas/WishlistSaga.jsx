import { takeEvery, put, delay } from "redux-saga/effects"
import { createWishlistAPI, deleteWishlistAPI, getWishlistAPI, updateWishlistAPI } from "../Services"
import { ADD_WISHLIST_RED, ADD_WISHLIST, GET_WISHLIST, GET_WISHLIST_RED, DELETE_WISHLIST_RED, DELETE_WISHLIST, UPDATE_WISHLIST, UPDATE_WISHLIST_RED } from "../Constant"

function* refreshWishlist(userId) {
    if (!userId) return;
    const response = yield getWishlistAPI(userId)
    yield put({ type: GET_WISHLIST_RED, data: response })
}

function* createWishlistSaga(action) {
    try {
        if (!action || !action.payload) return;

        /* `silent` is a client-side hint, not part of the wishlist record, so
           it is stripped before the request.

           Most pages (Shop, the product page) let this saga own the success
           notification. The homepage renders its own styled in-page toast
           instead, and was getting both that and the generic one for a single
           click. Passing silent: true suppresses the duplicate while leaving
           the error path intact — a failure still needs to be reported no
           matter who announced the success. */
        const { silent, ...apiPayload } = action.payload;

        const response = yield createWishlistAPI(apiPayload)
        const userId = apiPayload.userid || apiPayload.userId || apiPayload.user || localStorage.getItem('userid')
        yield refreshWishlist(userId)

        if (!silent) {
            try { window.dispatchEvent(new CustomEvent('eshopper:wishlist:confirmed', { detail: { success: true, message: (response && response.message) || 'Added to wishlist', data: response } })); } catch (e) {}
        }
    } catch (e) { console.error("❌ Wishlist Add Error:", e); try { window.dispatchEvent(new CustomEvent('eshopper:wishlist:error', { detail: { message: String(e?.message || 'Wishlist add failed') } })); } catch (err) {} }
}

function* getWishlistSaga() {
    try {
        const userId = localStorage.getItem('userid')
        if (!userId) return
        let response = yield getWishlistAPI(userId)
        yield put({ type: GET_WISHLIST_RED, data: response })
    } catch (e) { console.error("❌ Wishlist Fetch Error:", e) }
}

/* Wishlist deletes are dispatched from the product grid, the homepage and
   the product page as well as from the wishlist screen. This saga used to
   swallow a failure with nothing but a console.error, which left two
   problems: the user got no feedback, and redux kept the item as deleted
   even though the server still had it, so heart icons lied until reload.

   The backend returns 500 "Failed to remove from wishlist." on an
   unexpected error (controllers/wishlistController.js), which is what
   Datadog recorded. Transient cases are now retried, a genuine failure is
   reported on the eshopper:wishlist:error channel that ToastEventBridge
   already listens to, and the list is resynced from the server either way
   so the UI never disagrees with it.

   Note the wishlist screen (Wishlist.jsx) awaits the DELETE itself so it
   can roll a row back and offer a Retry button; it does not dispatch
   DELETE_WISHLIST. This path serves every other caller. */

/* 429 and 5xx are worth another attempt, as are network errors with no
   response at all. 401/403/404 are not — retrying cannot change them. */
const isRetryableWishlistError = (e) => {
    const status = e?.response?.status
    if (status === undefined) return true
    return status === 429 || status >= 500
}

const DELETE_RETRY_DELAYS = [400, 1200]

function* deleteWishlistSaga(action) {
    const targetId = action?.payload?.id || action?.payload?._id || action?.payload;
    const userId = action?.payload?.userid || action?.payload?.userId || action?.payload?.user || localStorage.getItem('userid')

    if (!action || !action.payload || !targetId) return;

    let lastError
    for (let attempt = 0; attempt <= DELETE_RETRY_DELAYS.length; attempt++) {
        try {
            yield deleteWishlistAPI(targetId)
            yield refreshWishlist(userId)
            return
        } catch (e) {
            lastError = e
            if (!isRetryableWishlistError(e) || attempt === DELETE_RETRY_DELAYS.length) break
            yield delay(DELETE_RETRY_DELAYS[attempt])
        }
    }

    console.error("❌ Wishlist Delete Error:", lastError)

    /* Pull the authoritative list back so the item reappears rather than
       staying optimistically hidden. */
    try { yield refreshWishlist(userId) } catch (e) {}

    try {
        window.dispatchEvent(new CustomEvent('eshopper:wishlist:error', {
            detail: {
                action: 'delete',
                id: targetId,
                message: lastError?.response?.data?.message
                    || 'Could not remove item. Please try again.'
            }
        }));
    } catch (e) {}
}

function* updateWishlistSaga(action) {
    try {
        if (!action || !action.payload) return;
        const userId = action.payload.userid || action.payload.userId || action.payload.user || localStorage.getItem('userid')
        yield updateWishlistAPI(action.payload)
        yield refreshWishlist(userId)
    } catch (e) { console.error("❌ Wishlist Update Error:", e) }
}

export function* wishlistSaga() {
    yield takeEvery(ADD_WISHLIST, createWishlistSaga)
    yield takeEvery(GET_WISHLIST, getWishlistSaga)
    yield takeEvery(DELETE_WISHLIST, deleteWishlistSaga)
    yield takeEvery(UPDATE_WISHLIST, updateWishlistSaga)
}