import { ADD_CART_RED, CLEAR_CART_RED, DELETE_CART_RED, GET_CART_RED, UPDATE_CART_RED } from "../Constant";

// Cart state is now an object: { _id, user, items: [], createdAt }
export function CartReducer(state = { items: [] }, action) {
    switch (action.type) {
        case ADD_CART_RED:
        case GET_CART_RED:
        case UPDATE_CART_RED:
        case DELETE_CART_RED:
        case CLEAR_CART_RED:
            // All actions replace the cart state with the new cart object
            return action.data && action.data.items ? action.data : { items: [] };
        default:
            return state;
    }
}