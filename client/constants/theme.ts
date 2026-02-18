import { Platform } from "react-native";

// =============================================================================
// CALM PREMIUM DESIGN SYSTEM - REFINED COLOR PALETTE
// =============================================================================

// Light Theme - Clean, Premium, Calm
const cleanMeadowPrimary = "#2E8B57"; // Sea Green - refined from neon
const cleanMeadowPrimaryMuted = "#2E8B5733"; // 20% opacity for backgrounds
const cleanMeadowBackground = "#F8FAF7"; // Off-White
const cleanMeadowSurface = "#EEF2EF"; // Soft Pale Green
const cleanMeadowTextPrimary = "#1A2E24"; // Deep Forest Green
const cleanMeadowTextSecondary = "#6B7C6B"; // Muted Sage Green

// Dark Theme - Forest Premium, Calm
const darkForestPrimary = "#3CB371"; // Medium Sea Green - refined
const darkForestPrimaryMuted = "#3CB37133"; // 20% opacity
const darkForestBackground = "#121A15"; // Deep Forest
const darkForestSurface = "#1A2820"; // Dark Forest Grey
const darkForestTextPrimary = "#F5F7F3"; // Soft White
const darkForestTextSecondary = "#9AAB9E"; // Muted Sage

// Secondary accent colors - Muted, not neon
const coralColor = "#C4806A"; // Muted Coral
const electricBlueColor = "#6B8BA4"; // Muted Steel Blue
const purpleColor = "#9B7AB8"; // Muted Purple
const pinkColor = "#B87090"; // Muted Rose

export const Colors = {
  light: {
    // Clean Meadow Light Theme - Premium Calm
    text: cleanMeadowTextPrimary,
    textSecondary: cleanMeadowTextSecondary,
    buttonText: "#FFFFFF",
    tabIconDefault: cleanMeadowTextSecondary,
    tabIconSelected: cleanMeadowPrimary,
    link: cleanMeadowPrimary,
    primary: cleanMeadowPrimary,
    primaryMuted: cleanMeadowPrimaryMuted,
    secondary: coralColor,
    accent: electricBlueColor,
    success: "#4A7C59", // Forest Success
    error: "#B85450", // Muted Coral Red
    warning: "#B8860B", // Goldenrod
    backgroundRoot: cleanMeadowBackground,
    backgroundDefault: cleanMeadowSurface,
    backgroundSecondary: "#E2E8E4", // Light Sage
    backgroundTertiary: "#D4DCD7", // Muted Gray-Green
    border: "#C5CFC8", // Subtle divider
    calendarNoData: "#D4DCD7",
    calendarPartial: "#8FBC8F",
    calendarFull: "#4A7C59",
    checkboxBorder: cleanMeadowPrimary,
    checkboxFill: cleanMeadowPrimary,
    // Secondary accent colors - Muted
    coral: coralColor,
    electricBlue: electricBlueColor,
    purple: purpleColor,
    pink: pinkColor,
    // Tab Navigation Colors
    tabActiveBackground: "#E8F5E9", // Light soft green for active tab background
    tabContainerBackground: "#FFFFFF", // Pure white for floating container
    tabInactiveIcon: "#8A9A8A", // Muted gray-green for inactive icons
    tabActiveIcon: cleanMeadowPrimary, // Primary green for active icons
    // Shadow Colors
    shadowLight: "#000000",
    shadowDark: "#23f574ff",
  },
  dark: {
    // Dark Forest Premium Theme - Calm Minimalist
    text: darkForestTextPrimary,
    textSecondary: darkForestTextSecondary,
    buttonText: "#FFFFFF",
    tabIconDefault: darkForestTextSecondary,
    tabIconSelected: darkForestPrimary,
    link: darkForestPrimary,
    primary: darkForestPrimary,
    primaryMuted: darkForestPrimaryMuted,
    secondary: coralColor,
    accent: electricBlueColor,
    success: "#5D9C6F", // Forest Success
    error: "#D47570", // Muted Coral
    warning: "#DAA520", // Goldenrod
    backgroundRoot: darkForestBackground,
    backgroundDefault: darkForestSurface,
    backgroundSecondary: "#243530", // Forest Gray
    backgroundTertiary: "#2E443A", // Muted Forest
    border: "#3D5446", // Subtle divider
    calendarNoData: "#2E443A",
    calendarPartial: "#3D6B4F",
    calendarFull: "#5D9C6F",
    checkboxBorder: darkForestPrimary,
    checkboxFill: darkForestPrimary,
    // Secondary accent colors - Muted
    coral: coralColor,
    electricBlue: electricBlueColor,
    purple: purpleColor,
    pink: pinkColor,
    // Tab Navigation Colors - Dark Mode
    tabActiveBackground: "#1E3D2A", // Dark forest green for active tab background
    tabContainerBackground: darkForestSurface, // Dark surface for floating container
    tabInactiveIcon: "#5A6B5E", // Muted gray for inactive icons
    tabActiveIcon: darkForestPrimary, // Primary green for active icons
    // Shadow Colors
    shadowLight: "#000000",
    shadowDark: "#23f574ff",
  },
};

// =============================================================================
// SPACING SYSTEM - 8-POINT SCALE
// =============================================================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,  // Section spacing minimum
  "2xl": 32, // Major screen separation
  "3xl": 40,
  "4xl": 48,
  "5xl": 56,
  inputHeight: 48,
  buttonHeight: 48,
  buttonHeightSmall: 44,
};

// =============================================================================
// BORDER RADIUS SYSTEM
// =============================================================================
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12, // Standard button radius
  lg: 16, // Card radius
  xl: 20,
  "2xl": 24, // Large card radius
  "3xl": 32,
  full: 9999,
};

// =============================================================================
// TYPOGRAPHY HIERARCHY - REFINED WEIGHTS
// =============================================================================
export const Typography = {
  display: {
    fontSize: 34,
    fontWeight: "700" as const, // Bold - display only
  },
  h1: {
    fontSize: 32,
    fontWeight: "600" as const, // Medium - not heavy
  },
  h2: {
    fontSize: 28,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "500" as const, // Semibold reduced
  },
  h4: {
    fontSize: 20,
    fontWeight: "500" as const,
  },
  title: {
    fontSize: 18,
    fontWeight: "500" as const,
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

// =============================================================================
// FONT CONFIGURATION
// =============================================================================
export const Fonts = Platform.select({
  ios: {
    sans: "Inter",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "Inter",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// =============================================================================
// HABIT ICONS
// =============================================================================
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

// =============================================================================
// HABIT COLORS - REFINED PALETTE
// =============================================================================
export const HabitColors = [
  "#4A7C59", // Forest Green
  "#5B7B9B", // Steel Blue
  "#8B7355", // Warm Taupe
  "#9B7AB8", // Muted Purple
  "#6B8BA4", // Muted Blue
  "#7A9B8B", // Sage
  "#B87090", // Muted Rose
  "#8B9AA3", // Blue Gray
] as const;

// =============================================================================
// TIME SECTIONS
// =============================================================================
export const TimeSection = {
  morning: { label: "Morning", icon: "sunrise" as const, order: 0 },
  midday: { label: "Midday", icon: "sun" as const, order: 1 },
  evening: { label: "Evening", icon: "sunset" as const, order: 2 },
  night: { label: "Night", icon: "moon" as const, order: 3 },
} as const;
