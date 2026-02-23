import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "@redux-saga/core";

import RootReducer from "./Reducers/RootReducer"
import RootSaga from "./Sagas/RootSaga"

const sagaMiddleware = createSagaMiddleware()

const Store = configureStore({
    reducer: RootReducer,
    // Modern Toolkit way to handle saga middleware
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false // Necessary for FormData handling
    }).concat(sagaMiddleware)
})

sagaMiddleware.run(RootSaga)

export default Store