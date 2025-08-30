import React, { createContext, useContext, useEffect, useState } from "react";
import { useSystemTheme } from "../hooks/useSystemTheme";

type DarkModeOption = "light" | "dark" | "system";

interface ThemeContextType {
  mode: DarkModeOption;
  isDarkMode: boolean;
  setMode: (mode: DarkModeOption) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemDarkMode = useSystemTheme();
  const [mode, setMode] = useState<DarkModeOption>(() => {
    const saved = localStorage.getItem("darkModePreference");
    return (saved as DarkModeOption) || "system";
  });

  const isDarkMode = mode === "system" ? systemDarkMode : mode === "dark";

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    localStorage.setItem("darkModePreference", mode);
  }, [isDarkMode, mode]);

  return (
    <ThemeContext.Provider value={{ mode, isDarkMode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
