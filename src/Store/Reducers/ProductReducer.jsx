import { ADD_PRODUCT_RED, DELETE_PRODUCT_RED, GET_PRODUCT_RED, UPDATE_PRODUCT_RED } from "../Constant";

export function ProductReducer(state = [], action) {
    switch (action.type) {
        case GET_PRODUCT_RED:
            return (action.data || []).map(i => ({ ...i, id: i.id || i._id }));
        case ADD_PRODUCT_RED:
            return [{ ...action.data, id: action.data.id || action.data._id }, ...state];
        case UPDATE_PRODUCT_RED:
            return state.map(i => (i.id === action.data.id) ? { ...i, ...action.data } : i);
        case DELETE_PRODUCT_RED:
            return state.filter(i => (i.id || i._id) !== action.data);
        default: return state;
    }
}