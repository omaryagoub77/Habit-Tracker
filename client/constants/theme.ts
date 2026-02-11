import { Platform } from "react-native";

// New theme colors based on Dark Forest and Clean Meadow themes
const darkForestPrimary = "#00FF88"; // Vibrant Neon Green (consistent across both themes)
const darkForestBackground = "#0D1B13"; // Deep Charcoal-Green
const darkForestSurface = "#1A2E24"; // Dark Forest Grey
const darkForestTextPrimary = "#FFFFFF"; // Pure White
const darkForestTextSecondary = "#8A9A8F"; // Muted Grey-Green

const cleanMeadowPrimary = "#00FF88"; // Vibrant Neon Green (consistent across both themes)
const cleanMeadowBackground = "#F5F7F3"; // Crisp Off-White/Light Grey
const cleanMeadowSurface = "#E8EFEB"; // Soft Pale Green
const cleanMeadowTextPrimary = "#1A2E24"; // Deep Forest Green
const cleanMeadowTextSecondary = "#6A7C6B"; // Muted Sage Green

// Secondary accent colors (consistent across both themes)
const coralColor = "#FF6B4A";
const electricBlueColor = "#4A6BFF";
const purpleColor = "#D94AFF";
const pinkColor = "#FF4A9B";

export const Colors = {
  light: {
    // Clean Meadow Light Theme
    text: cleanMeadowTextPrimary,
    textSecondary: cleanMeadowTextSecondary,
    buttonText: "#FFFFFF",
    tabIconDefault: cleanMeadowTextSecondary,
    tabIconSelected: cleanMeadowPrimary,
    link: cleanMeadowPrimary,
    primary: cleanMeadowPrimary, // Vibrant Neon Green
    secondary: coralColor,
    accent: electricBlueColor,
    success: "#4CAF50",
    error: "#F44336",
    warning: "#FF9800",
    backgroundRoot: cleanMeadowBackground,
    backgroundDefault: cleanMeadowSurface,
    backgroundSecondary: cleanMeadowSurface,
    backgroundTertiary: "#D9D9D9",
    border: cleanMeadowTextSecondary,
    calendarNoData: "#E0E0E0",
    calendarPartial: "#A5D6A7",
    calendarFull: "#4CAF50",
    checkboxBorder: cleanMeadowPrimary,
    checkboxFill: cleanMeadowPrimary,
    // Secondary accent colors
    coral: coralColor,
    electricBlue: electricBlueColor,
    purple: purpleColor,
    pink: pinkColor,
  },
  dark: {
    // Dark Forest Minimalist Theme (Default)
    text: darkForestTextPrimary,
    textSecondary: darkForestTextSecondary,
    buttonText: "#FFFFFF",
    tabIconDefault: darkForestTextSecondary,
    tabIconSelected: darkForestPrimary,
    link: darkForestPrimary,
    primary: darkForestPrimary, // Vibrant Neon Green
    secondary: coralColor,
    accent: electricBlueColor,
    success: "#66BB6A",
    error: "#EF5350",
    warning: "#FFA726",
    backgroundRoot: darkForestBackground,
    backgroundDefault: darkForestSurface,
    backgroundSecondary: darkForestSurface,
    backgroundTertiary: "#353535",
    border: darkForestTextSecondary,
    calendarNoData: "#404040",
    calendarPartial: "#2E7D32",
    calendarFull: "#4CAF50",
    checkboxBorder: darkForestPrimary,
    checkboxFill: darkForestPrimary,
    // Secondary accent colors
    coral: coralColor,
    electricBlue: electricBlueColor,
    purple: purpleColor,
    pink: pinkColor,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 56,
  inputHeight: 48,
  buttonHeight: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24, // Consistent 24px corner radius for all cards, buttons, and major UI elements
  "3xl": 32,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 34,
    fontWeight: "700" as const,
  },
  h1: {
    fontSize: 32,
    fontWeight: "700" as const, // Large and bold as specified
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const, // Large and bold as specified
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "Inter", // Use Inter font as specified in requirements
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "Inter", // Use Inter font as specified in requirements
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const HabitIcons = [
  "droplet",
  "activity",
  "book-open",
  "heart",
  "sun",
  "moon",
  "coffee",
  "zap",
] as const;

export const HabitColors = [
  "#4CAF50",
  "#2196F3",
  "#FF9800",
  "#E91E63",
  "#9C27B0",
  "#00BCD4",
  "#FF5722",
  "#607D8B",
] as const;

export const TimeSection = {
  morning: { label: "Morning", icon: "sunrise" as const, order: 0 },
  midday: { label: "Midday", icon: "sun" as const, order: 1 },
  evening: { label: "Evening", icon: "sunset" as const, order: 2 },
  night: { label: "Night", icon: "moon" as const, order: 3 },
} as const;
