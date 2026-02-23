import { ADD_MAINCATEGORY_RED, DELETE_MAINCATEGORY_RED, GET_MAINCATEGORY_RED, UPDATE_MAINCATEGORY_RED } from "../Constant";

export function MaincategoryReducer(state = [], action) {
    switch (action.type) {
        case ADD_MAINCATEGORY_RED:
            return [...state, action.data]

        case GET_MAINCATEGORY_RED:
            return action.data

        case DELETE_MAINCATEGORY_RED:
            return state.filter(item => (item.id || item._id) !== (action.data.id || action.data._id))

        case UPDATE_MAINCATEGORY_RED:
            return state.map(item => (item.id || item._id) === (action.data.id || action.data._id) ? action.data : item)

        default:
            return state
    }
}