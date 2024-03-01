import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./user/userSlice";
// as this is the same with which we wrapped our App ie provider our redux actually works
// here we use userReducer we get from userSlice.js

// finally we use all these reducers in SignIn.jsx

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
});

// redux store created
