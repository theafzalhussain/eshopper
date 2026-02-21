import { ADD_CONTACT_RED, DELETE_CONTACT_RED, GET_CONTACT_RED, UPDATE_CONTACT_RED } from "../Constant";

export function ContactReducer(state = [], action) {
    switch (action.type) {
        case ADD_CONTACT_RED:
            return [...state, action.data]

        case GET_CONTACT_RED:
            return action.data

        case DELETE_CONTACT_RED:
            return state.filter(item => (item.id || item._id) !== (action.data.id || action.data._id))

        case UPDATE_CONTACT_RED:
            return state.map(item => 
                (item.id || item._id) === (action.data.id || action.data._id) ? action.data : item
            )

        default:
            return state
    }
}