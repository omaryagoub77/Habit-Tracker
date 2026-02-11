import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { themeColors: theme, isDark } = useThemeContext();

  return {
    theme,
    isDark,
  };
}
