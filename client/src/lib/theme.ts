import { useEffect } from "react";
import { useAppSelector } from "@/store";

/** Applies the theme preference to <html> and follows the OS setting in "system" mode. */
export function useThemeSync() {
  const theme = useAppSelector((s) => s.ui.theme);
  useEffect(() => {
    try {
      localStorage.setItem("klyro-theme", theme);
    } catch {
      /* storage unavailable */
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && mq.matches));
    apply();
    if (theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}
