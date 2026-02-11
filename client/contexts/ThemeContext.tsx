import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/database/DatabaseService';
import { Colors } from '@/constants/theme';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system' | null;
  isDark: boolean | null;
  themeColors: any;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  toggleTheme: () => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system' | null>(null);
  const [isDark, setIsDark] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from database on initial mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Prefer AsyncStorage if a persisted preference exists.
        // This prevents the UI from briefly rendering the wrong theme on cold start.
        const savedTheme = await AsyncStorage.getItem('user-theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setThemeState(savedTheme);
          setIsDark(savedTheme === 'dark');
          return;
        }

        const settings = await db.getUserSettings();
        
        // Check if user has previously selected a theme
        if (settings.themeMode && settings.themeMode !== 'system') {
          // Use stored theme directly (user preference overrides system)
          const storedTheme = settings.themeMode;
          setThemeState(storedTheme);
          setIsDark(storedTheme === 'dark');
        } else {
          // Either no stored theme exists or user chose 'system'
          // For first-time users (no stored theme), use system theme temporarily
          // but persist it immediately so it becomes the user's choice
          const systemTheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
          
          // If themeMode is 'system' (explicitly set by user), keep it as 'system'
          // If themeMode is null/undefined (first time), use system theme and persist it
          if (settings.themeMode === 'system') {
            setThemeState('system');
            setIsDark(Appearance.getColorScheme() === 'dark');
          } else {
            // First-time user - use system theme but persist the actual choice
            setThemeState(systemTheme);
            setIsDark(systemTheme === 'dark');
            
            // Persist the system theme choice so it becomes the user's preference
            await db.updateUserSettings({ themeMode: systemTheme });
          }
        }
      } catch (error) {
        console.error('Error loading theme from database:', error);
        // Fallback to system theme if there's an error
        const systemTheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
        setThemeState(systemTheme);
        setIsDark(systemTheme === 'dark');
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (theme === 'system' && isDark !== null) {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setIsDark(colorScheme === 'dark');
      });
      return () => subscription.remove();
    }
  }, [theme, isDark]);

  const setTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    
    // Update isDark immediately based on the new theme
    const calculatedIsDark = newTheme === 'dark';
    setIsDark(calculatedIsDark);

    // Persist only explicit user choice (ignore 'system' for AsyncStorage persistence)
    // so cold-start always has a deterministic mode if chosen.
    if (newTheme === 'light' || newTheme === 'dark') {
      try {
        await AsyncStorage.setItem('user-theme', newTheme);
      } catch (e) {
        console.warn('Error saving theme to AsyncStorage:', e);
      }
    }
    
    // Persist to database
    try {
      await db.updateUserSettings({ themeMode: newTheme });
    } catch (error) {
      console.error('Error saving theme to database:', error);
    }
  };

  const toggleTheme = async () => {
    // Only toggle between light and dark when theme is not 'system'
    // If current theme is 'system', switch to the opposite of the current display mode
    let newTheme: 'light' | 'dark' | 'system';
    if (theme === 'system') {
      // If system theme is active, toggle between light/dark and keep as user preference
      newTheme = isDark ? 'light' : 'dark';
    } else {
      // Cycle between light -> dark -> system
      newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    }
    await setTheme(newTheme);
  };

  const themeColors = isDark === null ? Colors.light : isDark ? Colors.dark : Colors.light;

  const contextValue: ThemeContextType = {
    theme,
    isDark,
    themeColors,
    setTheme,
    toggleTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {isLoading ? null : children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
