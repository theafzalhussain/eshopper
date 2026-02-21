import { ADD_CONTACT_RED, DELETE_CONTACT_RED, GET_CONTACT_RED } from "../Constant";

export function ContactReducer(state = [], action) {
    switch (action.type) {
        case ADD_CONTACT_RED:
            return [{...action.data, id: action.data._id || action.data.id}, ...state]

        case GET_CONTACT_RED:
            // Sahi logic: mongodb se aane wali id ko DataGrid ke liye map karega
            return action.data.map(item => ({ ...item, id: item._id || item.id }))

        case DELETE_CONTACT_RED:
            return state.filter(item => (item.id || item._id) !== (action.data.id || action.data._id))

        default:
            return state
    }
}