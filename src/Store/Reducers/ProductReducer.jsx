import { ADD_PRODUCT_RED, DELETE_PRODUCT_RED, GET_PRODUCT_RED, UPDATE_PRODUCT_RED } from "../Constant";

export function ProductReducer(state = [], action) {
    switch (action.type) {
        case ADD_PRODUCT_RED:
            return [...state, action.data]
        case GET_PRODUCT_RED:
            return action.data
        case DELETE_PRODUCT_RED:
            return state.filter(item => (item._id || item.id) !== (action.data._id || action.data.id))
        case UPDATE_PRODUCT_RED:
            return state.map(item => (item._id || item.id) === (action.data._id || action.data.id) ? action.data : item)
        default:
            return state
    }
}