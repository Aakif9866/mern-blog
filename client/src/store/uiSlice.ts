import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemePref = "light" | "dark" | "system";

function readTheme(): ThemePref {
  try {
    const t = localStorage.getItem("klyro-theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export interface UiState {
  theme: ThemePref;
  searchOpen: boolean;
}

const uiSlice = createSlice({
  name: "ui",
  initialState: { theme: readTheme(), searchOpen: false } as UiState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemePref>) {
      state.theme = action.payload;
    },
    setSearchOpen(state, action: PayloadAction<boolean>) {
      state.searchOpen = action.payload;
    },
  },
});

export const { setTheme, setSearchOpen } = uiSlice.actions;
export default uiSlice.reducer;
