import { ADD_CART_RED, DELETE_CART_RED, GET_CART_RED, UPDATE_CART_RED } from "../Constant";

export function CartReducer(state = [], action) {
    switch (action.type) {
        case ADD_CART_RED:
            return [...state, action.data] // Immutable push
        case GET_CART_RED:
            return action.data
        case DELETE_CART_RED:
            return state.filter(item => (item._id || item.id) !== (action.data._id || action.data.id))
        case UPDATE_CART_RED:
            return state.map(item => (item._id || item.id) === (action.data._id || action.data.id) ? action.data : item)
        default:
            return state
    }
}