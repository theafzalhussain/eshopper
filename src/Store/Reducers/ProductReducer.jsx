import { ADD_PRODUCT_RED, DELETE_PRODUCT_RED, GET_PRODUCT_RED, UPDATE_PRODUCT_RED } from "../Constant";

export function ProductReducer(state = [], action) {
    switch (action.type) {
        case ADD_PRODUCT_RED:
            return [...state, action.data]

        case GET_PRODUCT_RED:
            return action.data

        case DELETE_PRODUCT_RED:
            const prodId = action.data.id || action.data._id || action.data;
            return state.filter(item => (item.id || item._id) !== prodId)

        case UPDATE_PRODUCT_RED:
            return state.map(item => (item.id || item._id) === (action.data.id || action.data._id) ? action.data : item)

        default:
            return state
    }
}