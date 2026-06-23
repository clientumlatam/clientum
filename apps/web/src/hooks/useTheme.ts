import { useState, useEffect, useCallback } from "react";

export type AppTheme = "light" | "dark";

function getStoredTheme(): AppTheme {
  try {
    const stored = localStorage.getItem("cl-app-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return "light";
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
  try {
    localStorage.setItem("cl-app-theme", theme);
  } catch {}
}

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: AppTheme = prev === "light" ? "dark" : "light";
      return next;
    });
  }, []);

  return {
    theme,
    toggleTheme,
    isLight: theme === "light",
    isDark: theme === "dark",
  };
}
