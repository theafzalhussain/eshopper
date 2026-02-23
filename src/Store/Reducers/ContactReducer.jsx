import { ADD_CONTACT_RED, DELETE_CONTACT_RED, GET_CONTACT_RED, UPDATE_CONTACT_RED } from "../Constant";

export function ContactReducer(state = [], action) {
    switch (action.type) {
        case GET_CONTACT_RED:
            return action.data || [];

        case ADD_CONTACT_RED:
            return [...state, action.data];

        case UPDATE_CONTACT_RED:
            return state.map(item => (item.id || item._id) === action.data.id ? action.data : item)

        case DELETE_CONTACT_RED:
            // Improved ID comparison
            const deleteId = action.data.id || action.data._id || action.data;
            return state.filter(item => (item.id || item._id) !== deleteId);

        default:
            return state;
    }
}