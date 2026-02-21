import { ADD_NEWSLATTER_RED, DELETE_NEWSLATTER_RED, GET_NEWSLATTER_RED, UPDATE_NEWSLATTER_RED } from "../Constant";

export function NewslatterReducer(state = [], action) {
    switch (action.type) {
        case ADD_NEWSLATTER_RED:
            return [...state, action.data]

        case GET_NEWSLATTER_RED:
            // FIX: Convert _id to id for DataGrid
            return action.data.map(item => ({ ...item, id: item._id || item.id }))

        case DELETE_NEWSLATTER_RED:
            return state.filter(item => (item.id || item._id) !== (action.data.id || action.data._id))

        default:
            return state
    }
}