import Constants from "expo-constants";

/**
 * Checks if the app is running in Expo Go
 * @returns true if running in Expo Go, false otherwise
 */
export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

/**
 * Checks if the app is running in a standalone build
 * @returns true if running in standalone build, false otherwise
 */
export function isStandaloneApp(): boolean {
  // Expo SDK 54: appOwnership is primarily 'expo' (Expo Go) or 'standalone'.
  // Prefer executionEnvironment when available, with a safe fallback.
  const anyConstants: any = Constants as any;
  const execEnv = anyConstants?.executionEnvironment;
  if (typeof execEnv === 'string') {
    // Known values include: 'storeClient' (Expo Go), 'standalone', 'bare'
    return execEnv === 'standalone' || execEnv === 'bare';
  }
  const ownership = (Constants as any)?.appOwnership;
  return ownership === 'standalone';
}

/**
 * Checks if notifications are fully supported in the current environment
 * @returns true if notifications are fully supported, false if limited
 */
export function areNotificationsFullySupported(): boolean {
  // Notifications work fully in standalone builds but have limitations in Expo Go
  return isStandaloneApp() || !isExpoGo();
}
