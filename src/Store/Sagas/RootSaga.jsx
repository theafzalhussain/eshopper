import { all, fork } from "redux-saga/effects"

// Sabhi Sagas ko import karein
import { maincategorySaga } from "./MaincategorySaga"
import { subcategorySaga } from "./SubcategorySaga"
import { brandSaga } from "./BrandSaga"
import { productSaga } from "./ProductSaga"
import { userSaga } from "./UserSaga"
import { cartSaga } from "./CartSaga"
import { wishlistSaga } from "./WishlistSaga"
import { checkoutSaga } from "./CheckoutSaga"
import { contactSaga } from "./ContactSaga"
import { newslatterSaga } from "./NewslatterSaga"

/**
 * RootSaga: Ye aapki poori application ka engine hai.
 * 'fork' ka use karne se saari sagas background mein parallel chalti hain.
 * Isse loading speed fast ho jati hai aur app crash nahi hota.
 */
export default function* RootSaga() {
    yield all([
        fork(maincategorySaga),
        fork(subcategorySaga),
        fork(brandSaga),
        fork(productSaga),
        fork(userSaga),
        fork(cartSaga),
        fork(wishlistSaga),
        fork(checkoutSaga),
        fork(contactSaga),
        fork(newslatterSaga)
    ])
}