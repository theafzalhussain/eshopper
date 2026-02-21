import { ADD_CHECKOUT_RED, DELETE_CHECKOUT_RED, GET_CHECKOUT_RED } from "../Constant";

export function CheckoutReducer(state = [], action) {
    switch (action.type) {
        case ADD_CHECKOUT_RED:
            return [{...action.data, id: action.data._id || action.data.id}, ...state]

        case GET_CHECKOUT_RED:
            return action.data.map(item => ({ ...item, id: item._id || item.id }))

        case DELETE_CHECKOUT_RED:
            return state.filter(item => (item.id || item._id) !== (action.data.id || action.data._id))

        default:
            return state
    }
}