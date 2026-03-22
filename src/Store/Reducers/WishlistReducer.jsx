import { ADD_WISHLIST_RED, DELETE_WISHLIST_RED, GET_WISHLIST_RED, UPDATE_WISHLIST_RED } from "../Constant";

export function WishlistReducer(state = [], action) {
    switch (action.type) {
        case ADD_WISHLIST_RED:
            return [...state, action.data];
        case GET_WISHLIST_RED:
            return action.data;
        case DELETE_WISHLIST_RED:
            return state.filter(item => item.id !== action.data.id);
        case UPDATE_WISHLIST_RED:
            return state.map(item =>
                item.id === action.data.id ? { ...item, ...action.data } : item
            );
        default:
            return state;
    }
}