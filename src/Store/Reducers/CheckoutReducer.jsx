import { ADD_CHECKOUT_RED, DELETE_CHECKOUT_RED, GET_CHECKOUT_RED, UPDATE_CHECKOUT_RED } from "../Constant";

export function CheckoutReducer(state = [], action) {
    switch (action.type) {
        case ADD_CHECKOUT_RED:
            return [...state, action.data]

        case GET_CHECKOUT_RED:
            // FIX: Convert _id to id for DataGrid
            return action.data.map(item => ({ ...item, id: item._id || item.id }))

        case DELETE_CHECKOUT_RED:
            return state.filter(item => (item.id || item._id) !== (action.data.id || action.data._id))

        case UPDATE_CHECKOUT_RED:
            return state.map(item => (item.id || item._id) === (action.data.id || action.data._id) ? action.data : item)

        default:
            return state
    }
}