import { ADD_CART_RED, CLEAR_CART_RED, DELETE_CART_RED, GET_CART_RED, UPDATE_CART_RED } from "../Constant";

// Cart state is now an object: { _id, user, items: [], createdAt }
export function CartReducer(state = { items: [] }, action) {
    switch (action.type) {
        case ADD_CART_RED:
        case GET_CART_RED:
        case UPDATE_CART_RED:
        case DELETE_CART_RED:
        case CLEAR_CART_RED:
            // Normalize different API payload shapes into { items: [] }
            if (action.data && Array.isArray(action.data.items)) return action.data;
            if (Array.isArray(action.data)) return { items: action.data };
            return { items: [] };
        default:
            return state;
    }
}