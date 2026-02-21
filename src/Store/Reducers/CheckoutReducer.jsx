import { ADD_CHECKOUT_RED, DELETE_CHECKOUT_RED, GET_CHECKOUT_RED, UPDATE_CHECKOUT_RED } from "../Constant";

export function CheckoutReducer(state = [], action) {
    switch (action.type) {
        case ADD_CHECKOUT_RED:
            // Sahi Tareeka: Naya array return karein taaki React re-render ho
            return [...state, action.data]

        case GET_CHECKOUT_RED:
            return action.data

        case DELETE_CHECKOUT_RED:
            // MongoDB ki _id aur JSON-Server ki id dono ko handle karega
            return state.filter(item => (item.id || item._id) !== (action.data.id || action.data._id))

        case UPDATE_CHECKOUT_RED:
            return state.map(item => 
                (item.id || item._id) === (action.data.id || action.data._id) ? action.data : item
            )

        default:
            return state
    }
}