import { ADD_USER_RED, DELETE_USER_RED, GET_USER_RED, UPDATE_USER_RED } from "../Constant";

export function UserReducer(state = [], action) {
    switch (action.type) {
        case ADD_USER_RED:
            return [...state, action.data]
        case GET_USER_RED:
            // Handle both single user object and array responses
            if (Array.isArray(action.data)) {
                return action.data
            } else if (action.data && typeof action.data === 'object') {
                // Wrap single user object in array for consistency
                return [action.data]
            }
            return state
        case DELETE_USER_RED:
            return state.filter(item => (item._id || item.id) !== (action.data._id || action.data.id))
        case UPDATE_USER_RED:
            return state.map(item => (item._id || item.id) === (action.data._id || action.data.id) ? action.data : item)
        default:
            return state
    }
}