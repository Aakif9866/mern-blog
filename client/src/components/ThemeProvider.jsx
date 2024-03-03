import { useSelector } from "react-redux";
// this is a component
// this is used in Main.jsx to wrap our main app with

export default function ThemeProvider({ children }) {
  const { theme } = useSelector((state) => state.theme); //  to find whether to use dark or light
  return (
    <div className={theme}>
      <div className="bg-white text-gray-700 dark:text-gray-200 dark:bg-[rgb(16,23,42)] min-h-screen">
        {children}
      </div>
    </div>
  );
}
