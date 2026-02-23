import { ADD_BRAND_RED, DELETE_BRAND_RED, GET_BRAND_RED, UPDATE_BRAND_RED } from "../Constant";

export function BrandReducer(state = [], action) {
    switch (action.type) {
        case ADD_BRAND_RED:
            return [...state, action.data] // Immutable way

        case GET_BRAND_RED:
            return action.data

        case DELETE_BRAND_RED:
            return state.filter(item => (item.id || item._id) !== action.data)

        case UPDATE_BRAND_RED:
            return state.map(item => (item.id || item._id) === action.data.id ? action.data : item)

        default:
            return state
    }
}