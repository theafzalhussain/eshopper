import { ADD_PRODUCT_RED, DELETE_PRODUCT_RED, GET_PRODUCT_RED, UPDATE_PRODUCT_RED } from "../Constant";

export function ProductReducer(state = [], action) {
    switch (action.type) {
        case GET_PRODUCT_RED:
            /** 
             * 1. Protection: Agar action.data undefined ho toh empty array use karein.
             * 2. Normalization: MongoDB Atlas ki '_id' ko standard 'id' mein convert karein 
             * taaki MUI DataGrid aur Edit functionality sahi se chale.
             */
            return (action.data || []).map(item => ({
                ...item,
                id: item.id || item._id 
            }));

        case ADD_PRODUCT_RED:
            // Naye product mein bhi 'id' ensure karein aur state update karein
            const newItem = { ...action.data, id: action.data.id || action.data._id };
            return [...state, newItem];

        case UPDATE_PRODUCT_RED:
            /**
             * Immutability Fix: Map use karke naya array return karein.
             * Dono formats (id aur _id) ko check karein taaki update misfire na ho.
             */
            return state.map((item) => {
                const itemId = item.id || item._id;
                const updateId = action.data.id || action.data._id;

                if (itemId === updateId) {
                    return { ...item, ...action.data }; // Purane data mein naya data merge karein
                }
                return item;
            });

        case DELETE_PRODUCT_RED:
            /**
             * Delete logic: Check karein ki action.data object hai ya sirf string ID.
             */
            const prodId = action.data.id || action.data._id || action.data;
            return state.filter(item => (item.id || item._id) !== prodId);

        default:
            return state;
    }
}