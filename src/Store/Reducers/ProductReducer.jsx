import { ADD_PRODUCT_RED, DELETE_PRODUCT_RED, GET_PRODUCT_RED, UPDATE_PRODUCT_RED } from "../Constant";

export function ProductReducer(state = [], action) {
    switch (action.type) {
        case GET_PRODUCT_RED:
            // Normalize _id to id for MUI DataGrid and other components
            return action.data.map(item => ({ ...item, id: item.id || item._id }));

        case ADD_PRODUCT_RED:
            return [...state, action.data];

        case UPDATE_PRODUCT_RED:
            return state.map(item => (item.id === action.data.id) ? { ...item, ...action.data } : item);

        case DELETE_PRODUCT_RED:
            const prodId = action.data.id || action.data._id || action.data;
            return state.filter(item => (item.id || item._id) !== prodId);

        default:
            return state;
    }
}