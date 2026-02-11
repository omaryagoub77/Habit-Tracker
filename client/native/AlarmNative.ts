e import { NativeModules, NativeEventEmitter } from 'react-native';

const { AlarmModule } = NativeModules;

// Define the native module interface
interface AlarmNativeModule {
  scheduleAlarm: (timestamp: number, label: string, habitId: string) => Promise<string>;
  cancelAlarm: (alarmId: string) => Promise<void>;
  stopAlarm: () => Promise<void>;
}

// Check if the native module is available - CRITICAL for standalone APK
// Don't throw an error - instead, return undefined so the app can gracefully degrade
let alarmNativeModule: AlarmNativeModule | undefined;

if (!AlarmModule) {
  // Log warning instead of throwing - app can continue with reduced functionality
  console.warn('[AlarmNative] WARNING: Native AlarmModule is not available. ' +
    'Alarms will not work. This is expected in Expo Go or during development. ' +
    'For standalone APK, ensure AlarmPackage is registered in MainApplication.kt.');
  alarmNativeModule = undefined;
} else {
  // Native module is available, use the actual implementation
  alarmNativeModule = AlarmModule as AlarmNativeModule;
}

// Export the native module (or undefined if not available)
export default alarmNativeModule;

// Export functions that handle the case where native module is not available
export const scheduleAlarm = alarmNativeModule?.scheduleAlarm;
export const cancelAlarm = alarmNativeModule?.cancelAlarm;
export const stopAlarm = alarmNativeModule?.stopAlarm;

// Event emitter for alarm triggered events (only if native module exists)
let alarmEventEmitter: NativeEventEmitter | null = null;

if (AlarmModule) {
  alarmEventEmitter = new NativeEventEmitter(AlarmModule);
}

export const addAlarmTriggeredListener = alarmEventEmitter
  ? (callback: (alarmId: string) => void) => alarmEventEmitter.addListener('alarmTriggered', callback)
  : () => ({ remove: () => {} });

// Helper function to check if native module is available
export const isAlarmNativeModuleAvailable = (): boolean => {
  return alarmNativeModule !== undefined;
};
