import { ADD_WISHLIST_RED, DELETE_WISHLIST_RED, GET_WISHLIST_RED, UPDATE_WISHLIST_RED } from "../Constant";

export function WishlistReducer(state = [], action) {
    switch (action.type) {
        case ADD_WISHLIST_RED:
            return Array.isArray(action.data) ? action.data : state;
        case GET_WISHLIST_RED:
            return Array.isArray(action.data) ? action.data : state;
        case DELETE_WISHLIST_RED:
            return state.filter(item => {
                const currentId = item.id || item._id;
                const currentProductId = item.productid?._id || item.productid || item.productId || item.product?._id || item.product || null;
                const targetId = action.data?.id || action.data?._id || action.data;
                return String(currentId) !== String(targetId) && String(currentProductId) !== String(targetId);
            });
        case UPDATE_WISHLIST_RED:
            return state.map(item =>
                String(item.id || item._id) === String(action.data?.id || action.data?._id)
                    ? { ...item, ...action.data }
                    : item
            );
        default:
            return state;
    }
}