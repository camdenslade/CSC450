import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Appearance } from "react-native";
import * as SecureStore from "expo-secure-store";
import { _setResolvedScheme } from "./colors";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedScheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const STORE_KEY = "tabup_theme_mode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") setModeState(val);
    });
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    SecureStore.setItemAsync(STORE_KEY, next);
  }

  const systemScheme = Appearance.getColorScheme() ?? "light";
  const resolvedScheme: "light" | "dark" = mode === "system" ? systemScheme : mode;

  // Keep the module-level variable in sync for Proxy-based consumers
  _setResolvedScheme(resolvedScheme);

  return (
    <ThemeContext.Provider value={{ mode, resolvedScheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
