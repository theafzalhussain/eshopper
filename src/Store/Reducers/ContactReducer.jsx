import { ADD_CONTACT_RED, DELETE_CONTACT_RED, GET_CONTACT_RED, UPDATE_CONTACT_RED } from "../Constant";

export function ContactReducer(state = [], action) {
    switch (action.type) {
        case ADD_CONTACT_RED:
            return [...state, { ...action.data, id: action.data._id }]; // Mapping id immediately

        case GET_CONTACT_RED:
            // FIX: Saare data ko map karke _id ki value id me dal rahe hain
            return action.data.map(item => ({ 
                ...item, 
                id: item._id || item.id 
            }));

        case DELETE_CONTACT_RED:
            return state.filter(item => item.id !== action.data);

        default:
            return state
    }
}