import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import auth from "./authSlice";
import ui from "./uiSlice";

export function makeStore() {
  return configureStore({ reducer: { auth, ui } });
}

export const store = makeStore();
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useMe = () => useAppSelector((s) => s.auth.user);
export const useAuthStatus = () => useAppSelector((s) => s.auth.status);
