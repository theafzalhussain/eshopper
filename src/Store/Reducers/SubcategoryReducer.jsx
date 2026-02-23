import { ADD_SUBCATEGORY_RED, DELETE_SUBCATEGORY_RED, GET_SUBCATEGORY_RED, UPDATE_SUBCATEGORY_RED } from "../Constant";

export function SubcategoryReducer(state = [], action) {
    switch (action.type) {
        case GET_SUBCATEGORY_RED:
            return (action.data || []).map(item => ({ ...item, id: item.id || item._id }));

        case ADD_SUBCATEGORY_RED:
            return [...state, action.data];

        case UPDATE_SUBCATEGORY_RED:
            return state.map(item => (item.id === action.data.id) ? { ...item, ...action.data } : item);

        case DELETE_SUBCATEGORY_RED:
            const subId = action.data.id || action.data._id || action.data;
            return state.filter(item => (item.id || item._id) !== subId);

        default:
            return state;
    }
}