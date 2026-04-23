import { Appearance } from "react-native";

const light = {
  primary: "#3db8b0",       // logo mid-teal
  primaryLight: "#e6f7f6",  // very light teal tint
  primaryDark: "#1a7a74",   // logo deep teal (bottom of gradient)

  background: "#f5fafa",    // barely-tinted white
  surface: "#ffffff",
  surfaceSecondary: "#eef6f6",

  navSurface: "#ffffff",
  navText: "#0d1f1e",
  navMuted: "#7a9e9c",

  textPrimary: "#0d1f1e",   // near-black with teal tint
  textSecondary: "#2d5654",
  textMuted: "#7a9e9c",

  success: "#3db8b0",
  warning: "#f59e0b",
  danger: "#ef4444",
  error: "#ef4444",

  border: "#d6ecea",
  divider: "#e8f4f3",

  amountPositive: "#1a7a74",
  amountNegative: "#ef4444",
};

const dark: typeof light = {
  primary: "#4ecdc4",
  primaryLight: "#163330",
  primaryDark: "#2a9d96",

  background: "#0b1a19",
  surface: "#112221",
  surfaceSecondary: "#1a3230",

  navSurface: "#112221",
  navText: "#eaf6f5",
  navMuted: "#6aaeaa",

  textPrimary: "#eaf6f5",      // near-white, readable on dark surface
  textSecondary: "#b0d8d5",    // lighter secondary
  textMuted: "#6aaeaa",        // light enough on dark bg

  success: "#4ecdc4",
  warning: "#f59e0b",
  danger: "#f87171",           // slightly lighter red for dark bg
  error: "#f87171",

  border: "#234442",           // visible but subtle
  divider: "#1c3634",

  amountPositive: "#4ecdc4",
  amountNegative: "#f87171",
};

// Resolved scheme — written by ThemeProvider so Proxy and useColors() stay in sync.
export let _resolvedScheme: "light" | "dark" = Appearance.getColorScheme() ?? "light";
export function _setResolvedScheme(s: "light" | "dark") { _resolvedScheme = s; }

// Proxy so colors.X in inline styles picks up the current scheme at render time.
export const colors = new Proxy({} as typeof light, {
  get(_target, prop: string) {
    const palette = _resolvedScheme === "dark" ? dark : light;
    return palette[prop as keyof typeof light];
  },
});

export type ColorScheme = typeof light;

// Hook — reads from ThemeContext so components re-render on theme change.
import { useTheme } from "./ThemeContext";
export function useColors(): typeof light {
  const { resolvedScheme } = useTheme();
  return resolvedScheme === "dark" ? dark : light;
}
