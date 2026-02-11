import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { Platform, ActivityIndicator, View, Text, Appearance } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import RootStackNavigator from '@/navigation/RootStackNavigator';
import { useDatabase } from '@/hooks/useDatabase';
import { ThemeProvider, useThemeContext } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function AppContent() {
  const { isInitialized, isLoading, error } = useDatabase();
  const [notificationPermissionsRequested, setNotificationPermissionsRequested] = useState(false);
  const { themeColors: theme, isLoading: themeIsLoading, isDark } = useThemeContext();

  // Initialize notifications only on supported platforms
  useEffect(() => {
    const initializeNotifications = async () => {
      // Only initialize notifications on native platforms (not web)
      if (Platform.OS === 'web') {
        console.log('[App] Notifications not supported on web - skipping initialization');
        setNotificationPermissionsRequested(true);
        return;
      }

      try {
        // Request notification permissions
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          if (newStatus === 'granted') {
            console.log('[App] Notifications initialized');
          } else {
            console.log('[App] Notifications permission denied');
          }
        } else {
          console.log('[App] Notifications initialized');
        }
        setNotificationPermissionsRequested(true);
      } catch (err) {
        console.error('[App] Error initializing notifications:', err);
        setNotificationPermissionsRequested(true);
      }
    };

    if (isInitialized && !notificationPermissionsRequested) {
      initializeNotifications();
    }
  }, [isInitialized, notificationPermissionsRequested]);

  // Memoize loading screen components to prevent unnecessary re-renders
  const LoadingScreen = useMemo(() => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme?.backgroundRoot || '#ffffff' }}>
      <ActivityIndicator size="large" color={theme?.primary || '#4CAF50'} />
      <Text style={{ color: theme?.text || '#000000', marginTop: 10 }}>Loading...</Text>
    </View>
  ), [theme]);

  const ErrorScreen = useMemo(() => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme?.backgroundRoot || '#ffffff' }}>
      <Text style={{ color: theme?.error || '#f44336', fontSize: 16 }}>Error: {error?.message}</Text>
    </View>
  ), [error, theme]);

  // Show loading screen while database or theme is initializing
  if (isLoading || themeIsLoading || (!notificationPermissionsRequested && Platform.OS !== 'web')) {
    return LoadingScreen;
  }

  // Show error if database initialization failed
  if (error) {
    return ErrorScreen;
  }

  // Only render the app when database is ready
  if (!isInitialized) {
    return LoadingScreen;
  }

  // Get the appropriate navigation theme based on our theme context
  const navTheme = isDark === null ? DefaultTheme : isDark ? DarkTheme : DefaultTheme;
  // Override navigation theme colors with our theme colors
  navTheme.colors.background = theme.backgroundRoot;
  navTheme.colors.card = theme.backgroundDefault;
  navTheme.colors.text = theme.text;
  navTheme.colors.border = theme.border;
  navTheme.colors.notification = theme.accent;

  return (
    <ErrorBoundary
      onError={(error, stackTrace) => {
        console.error('App-level error:', error, stackTrace);
        // In production, you might want to send this to an error reporting service
        // Example: Crashlytics.recordError(error);
      }}
    >
      <KeyboardProvider>
        <NavigationContainer theme={navTheme}>
          <Suspense fallback={LoadingScreen}>
            <RootStackNavigator />
          </Suspense>
        </NavigationContainer>
      </KeyboardProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  // Move notification handler setup to useEffect to avoid repeated calls
  React.useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    
    // Add notification received listener to provide haptic feedback
    const notificationReceivedListener = Notifications.addNotificationReceivedListener(notification => {
      // Trigger haptic feedback when notification is received
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.warn('Haptic feedback not available:', error);
      }
    });
    
    // Cleanup listener on unmount
    return () => {
      notificationReceivedListener.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}