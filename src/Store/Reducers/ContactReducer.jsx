import { ADD_CONTACT_RED, DELETE_CONTACT_RED, GET_CONTACT_RED } from "../Constant";

export function ContactReducer(state = [], action) {
    switch (action.type) {
        case GET_CONTACT_RED:
            return action.data || []; // MongoDB data load logic

        case ADD_CONTACT_RED:
            return [action.data, ...state];

        case DELETE_CONTACT_RED:
            return state.filter(item => (item.id || item._id) !== action.data.id);

        default:
            return state;
    }
}