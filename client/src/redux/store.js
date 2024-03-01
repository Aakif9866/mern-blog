import { configureStore, combineReducers } from "@reduxjs/toolkit";
import userReducer from "./user/userSlice";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";

// as this is the same with which we wrapped our App ie provider our redux actually works
// here we use userReducer we get from userSlice.js

// finally we use all these reducers in SignIn.jsx

const rootReducer = combineReducers({
  user: userReducer,
});

const persistConfig = {
  key: "root",
  storage,
  version: 1,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);

// Middleware in Redux is a function that provides a third-party extension point between dispatching an action and the moment it reaches the reducer. It allows you to intercept actions and add extra functionality to the Redux store, such as logging, asynchronous actions, routing, and more. Middleware is a powerful concept that enables you to extend the behavior of Redux in a reusable and composable way.
