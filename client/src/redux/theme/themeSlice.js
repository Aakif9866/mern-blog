import { createSlice } from "@reduxjs/toolkit";
// here reducer is defined and is used in store.js
// in store its  used to add to redux persist toolkit

// also the main function is used in header.jsx to add functionaliy  to the app
// we need to use toggle theme function (ie dispatch it in header.jsx )

const initialState = {
  theme: "light",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
  },
});

export const { toggleTheme } = themeSlice.actions;

export default themeSlice.reducer;
