import { ADD_SUBCATEGORY_RED, DELETE_SUBCATEGORY_RED, GET_SUBCATEGORY_RED, UPDATE_SUBCATEGORY_RED } from "../Constant";

export function SubcategoryReducer(state = [], action) {
    switch (action.type) {
        case ADD_SUBCATEGORY_RED:
            return [...state, action.data]

        case GET_SUBCATEGORY_RED:
            // Ensure data has ID for MUI grid
            return (action.data || []).map(item => ({ ...item, id: item.id || item._id }));

        case DELETE_SUBCATEGORY_RED:
            return state.filter(item => (item.id || item._id) !== action.data);

        case UPDATE_SUBCATEGORY_RED:
            // CRITICAL FIX: Use map to avoid undefined crash
            return state.map((item) => {
                if ((item.id || item._id) === action.data.id) {
                    return { ...item, ...action.data };
                }
                return item;
            });

        default:
            return state;
    }
}