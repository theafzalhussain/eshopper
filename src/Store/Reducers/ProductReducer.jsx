import { ADD_PRODUCT_RED, DELETE_PRODUCT_RED, GET_PRODUCT_RED, UPDATE_PRODUCT_RED } from "../Constant";

export function ProductReducer(state = [], action) {
    switch (action.type) {
        case GET_PRODUCT_RED:
            /** 
             * 1. Protection: Agar data null ya undefined ho toh empty array return karein.
             * 2. Normalization: Har item mein 'id' field ensure karein taaki MUI DataGrid crash na ho.
             */
            return (action.data || []).map(item => ({
                ...item,
                id: item.id || item._id 
            }));

        case ADD_PRODUCT_RED:
            /**
             * Naye product ko list ke upar (start) mein add karein taaki Admin ko turant dikhe.
             */
            const newItem = { 
                ...action.data, 
                id: action.data.id || action.data._id 
            };
            return [newItem, ...state];

        case UPDATE_PRODUCT_RED:
            /**
             * CRITICAL FIX: Map use karke purane data ko naye (action.data) se replace karein.
             * Dono formats (id aur _id) ko match karte hain security ke liye.
             */
            return state.map((item) => {
                const itemId = String(item.id || item._id);
                const updateId = String(action.data.id || action.data._id);

                if (itemId === updateId) {
                    // Purana data + Naya data merge (Images update handle karne ke liye)
                    return { ...item, ...action.data, id: itemId }; 
                }
                return item;
            });

        case DELETE_PRODUCT_RED:
            /**
             * Filter logic: Jo ID delete karni hai use array se nikaal dein.
             */
            const delId = String(action.data.id || action.data._id || action.data);
            return state.filter(item => String(item.id || item._id) !== delId);

        default:
            return state;
    }
}