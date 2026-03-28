import React from "react";
import { useTheme } from "../contexts/ThemeContext";

export const ThemeToggle: React.FC = () => {
  const { mode, setMode } = useTheme();

  const options: Array<{
    value: "light" | "dark" | "system";
    label: string;
    icon: string;
  }> = [
    { value: "light", label: "Light", icon: "☀️" },
    { value: "dark", label: "Dark", icon: "🌙" },
    { value: "system", label: "System", icon: "💻" },
  ];

  return (
    <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setMode(option.value)}
          className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center ${
            mode === option.value
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
          title={option.label}
        >
          <span className="sm:mr-1">{option.icon}</span>
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
};
