import { ADD_NEWSLATTER_RED, DELETE_NEWSLATTER_RED, GET_NEWSLATTER_RED } from "../Constant";

export function NewslatterReducer(state = [], action) {
    switch (action.type) {
        case ADD_NEWSLATTER_RED:
            return [...state, action.data]

        case GET_NEWSLATTER_RED:
            // Ensure all items have 'id' for MUI DataGrid compatibility
            return action.data.map(item => ({ ...item, id: item.id || item._id }))

        case DELETE_NEWSLATTER_RED:
            const delId = action.data.id || action.data._id || action.data;
            return state.filter(item => (item.id || item._id) !== delId)

        default:
            return state
    }
}