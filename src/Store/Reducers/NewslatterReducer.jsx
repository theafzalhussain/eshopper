import { ADD_NEWSLATTER_RED, DELETE_NEWSLATTER_RED, GET_NEWSLATTER_RED, UPDATE_NEWSLATTER_RED } from "../Constant";

export function NewslatterReducer(state = [], action) {
    switch (action.type) {
        case ADD_NEWSLATTER_RED:
            return [...state, action.data]
        case GET_NEWSLATTER_RED:
            return action.data
        case DELETE_NEWSLATTER_RED:
            return state.filter(item => (item._id || item.id) !== (action.data._id || action.data.id))
        case UPDATE_NEWSLATTER_RED:
            return state.map(item => (item._id || item.id) === (action.data._id || action.data.id) ? action.data : item)
        default:
            return state
    }
}