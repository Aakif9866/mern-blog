import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Me } from "@/lib/types";

/** Only the signed-in user's profile. Tokens live in httpOnly cookies, never here. */
export interface AuthState {
  user: Me | null;
  status: "loading" | "authenticated" | "guest";
}

const initialState: AuthState = { user: null, status: "loading" };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signedIn(state, action: PayloadAction<Me>) {
      state.user = action.payload;
      state.status = "authenticated";
    },
    userUpdated(state, action: PayloadAction<Partial<Me>>) {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    signedOut(state) {
      state.user = null;
      state.status = "guest";
    },
  },
});

export const { signedIn, userUpdated, signedOut } = authSlice.actions;
export default authSlice.reducer;
