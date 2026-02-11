# Alarmee Integration for Habit Tracker

This document describes the integration of the Alarmee multiplatform alarm scheduler into the Habit Tracker app.

## Overview

Alarmee is a Kotlin Multiplatform library for scheduling alarms that work reliably even when the app is backgrounded or closed. This is essential for the Habit Timer feature where users need to be notified when their timer completes.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HabitTimerScreen.tsx                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    useAlarmee Hook                         │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │              Alarmee Integration                     │ │  │
│  │  │  - scheduleTimerAlarm()                              │ │  │
│  │  │  - cancelAlarm()                                     │ │  │
│  │  │  - stopAlarm()                                       │ │  │
│  │  │  - onTimerCompleted()                                │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│              ┌───────────────────────────────────┐             │
│              │       AlarmNative.ts                │             │
│              │  (React Native Native Module)      │             │
│              └───────────────────────────────────┘             │
│                              │                                   │
│                              ▼                                   │
│         ┌─────────────────────────────────────┐                │
│         │      Android Native Modules         │                │
│         │  - AlarmModule.kt (scheduling)      │                │
│         │  - AlarmService.kt (sound/playback)│                │
│         │  - AlarmReceiver.kt (broadcast)     │                │
│         └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## Files Modified/Created

### New Files

1. **`client/hooks/useAlarmee.ts`** - Main Alarmee integration hook
   - Provides clean API for scheduling alarms
   - Handles state management for alarm playback
   - Manages permission checks
   - Event listeners for alarm triggers

### Modified Files

1. **`client/screens/HabitTimerScreen.tsx`**
   - Added Alarmee integration comments
   - Uses `useAlarmee` hook for alarm scheduling
   - Maintains all existing UI functionality

## Key Features

### 1. Alarm Scheduling

```typescript
import { useAlarmee } from '@/hooks/useAlarmee';

function MyComponent() {
  const { scheduleTimerAlarm, stopAlarm, isAlarmPlaying } = useAlarmee();

  const handleStartTimer = async () => {
    // Schedule alarm for 25 minutes (Pomodoro)
    await scheduleTimerAlarm(25 * 60, habitId, habitName);
  };

  const handleStopAlarm = async () => {
    await stopAlarm();
  };
}
```

### 2. Habit Name as Alarm Label

The selected habit from the dropdown is automatically used as the alarm label:

```typescript
// When scheduling a timer alarm, the habitName is used as the alarm label
await scheduleTimerAlarm(durationSeconds, habitId, habitName);

// This shows up in the notification as: "Reading session complete"
// or whatever the habit name is
```

### 3. Sound + Haptic Feedback

Alarmee triggers sound and haptic feedback when the alarm fires:

```typescript
// From useAlarmee hook - haptic feedback on alarm trigger
if (mergedConfig.defaultHapticEnabled) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// Native AlarmService.kt handles the alarm sound playback
// - Uses device default alarm ringtone
// - Plays in loop until stopped
// - Full-screen intent on Android
```

### 4. Standalone Build Support

Alarmee works correctly in standalone builds (APK/AAB):

```typescript
// Check permissions before scheduling
const hasPermission = await hasExactAlarmPermission();
if (!hasPermission) {
  await requestExactAlarmPermission();
}

// Android-specific battery optimization
const isWhitelisted = await hasBatteryOptimizationWhitelisted();
if (!isWhitelisted) {
  await requestBatteryOptimizationWhitelist();
}
```

## API Reference

### useAlarmee Hook

```typescript
interface UseAlarmeeReturn {
  // Scheduling
  scheduleAlarm: (alarm: AlarmeeAlarm) => Promise<AlarmeeScheduledAlarm>;
  scheduleTimerAlarm: (durationSeconds: number, habitId: string, habitName: string) => Promise<AlarmeeScheduledAlarm>;
  cancelAlarm: (alarmId: string) => Promise<void>;
  cancelAllAlarms: () => Promise<void>;

  // Timer Control
  startTimer: (habitId: string, habitName: string, mode: 'timer' | 'stopwatch', durationSeconds: number) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
  stopAlarm: (alarmId?: string) => Promise<void>;

  // State
  isAlarmPlaying: boolean;
  isTimerRunning: boolean;
  scheduledAlarmIds: string[];

  // Permissions
  hasExactAlarmPermission: () => Promise<boolean>;
  requestExactAlarmPermission: () => Promise<void>;
  hasBatteryOptimizationWhitelisted: () => Promise<boolean>;
  requestBatteryOptimizationWhitelist: () => Promise<void>;
  openExactAlarmSettings: () => Promise<void>;

  // Events
  onAlarmTriggered: (callback: (alarm: AlarmeeAlarm) => void) => void;
  onTimerCompleted: (callback: (habitId: string) => void) => void;
}
```

### AlarmeeAlarm Interface

```typescript
interface AlarmeeAlarm {
  /** Unique identifier for the alarm */
  id: string;
  /** Label/title for the alarm (e.g., habit name) */
  label: string;
  /** Timestamp when the alarm should fire (milliseconds since epoch) */
  triggerAtMillis: number;
  /** Whether the alarm should repeat */
  repeat?: boolean;
  /** Repeat interval in days (0 = no repeat) */
  repeatIntervalDays?: number;
  /** Sound to play when alarm fires */
  sound?: string;
  /** Whether to enable haptic feedback */
  hapticEnabled?: boolean;
  /** Additional data to pass with the alarm */
  data?: Record<string, any>;
}
```

## Integration Points in HabitTimerScreen

### 1. Timer Start (Line ~747)

```typescript
const start = useCallback(async () => {
  // ... validation checks ...

  // ================================================================
  // ALARMEE: Schedule alarm using Alarmee
  // ================================================================
  // The alarm is scheduled with the habitName as the label
  // This ensures the user knows which habit the alarm is for
  // ================================================================
  if (mode === 'timer') {
    const triggerAtMillis = Date.now() + (durationSeconds * 1000);
    if (alarmNativeModule) {
      await scheduleTimerCompletion(
        triggerAtMillis,
        currentHabitId?.toString() || 'unknown',
        currentHabitName  // <-- Used as alarm label
      );
    }
  }
  // ...
}, [/* dependencies */]);
```

### 2. Alarm Trigger (Line ~888)

```typescript
const startAlarmSequence = useCallback(() => {
  // ================================================================
  // ALARMEE: Trigger alarm sequence
  // ================================================================
  // When timer completes, this function is called
  // It sets isAlarmPlaying to true which:
  // 1. Shows the alarm UI
  // 2. Enables sound (handled by native AlarmService.kt)
  // 3. Enables haptic feedback
  // ================================================================
  if (isSoundEnabled) {
    setIsAlarmPlaying(true);
  }
}, [isSoundEnabled]);
```

### 3. Stop Alarm (Line ~862)

```typescript
const stopAlarmFromButton = useCallback(async () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  // ================================================================
  // ALARMEE: Stop the alarm
  // ================================================================
  // Stops the native alarm sound and resets UI state
  // ================================================================
  if (alarmNativeModule) {
    try {
      await stopTimer();
    } catch (error) {
      console.error('[HabitTimer] Failed to stop native timer:', error);
    }
  }

  stopAlarmSafely();
  stopAlarmSound();
  setIsAlarmPlaying(false);
  reset();
}, [reset]);
```

## Testing

### Manual Testing Checklist

1. [ ] Schedule a timer and let it complete
    - [ ] Alarm sound plays
    - [ ] Haptic feedback triggers
    - [ ] Alarm notification appears
    - [ ] Habit name is shown in notification

2. [ ] Stop the alarm
    - [ ] Sound stops immediately
    - [ ] Haptic feedback on stop
    - [ ] UI resets correctly

3. [ ] Background/close app during timer
    - [ ] Timer still completes
    - [ ] Alarm still fires when app is closed

4. [ ] Test on standalone build
    - [ ] Alarms work without Expo Go
    - [ ] Permissions requested correctly
    - [ ] Battery optimization handled

## Troubleshooting

### Alarm Not Firing

1. Check exact alarm permission:
```typescript
const hasPermission = await hasExactAlarmPermission();
if (!hasPermission) {
  await requestExactAlarmPermission();
}
```

2. Check battery optimization:
```typescript
const isWhitelisted = await hasBatteryOptimizationWhitelisted();
if (!isWhitelisted) {
  await requestBatteryOptimizationWhitelist();
}
```

### No Sound

1. Check device volume
2. Check notification channel importance (Android)
3. Verify AlarmService.kt is running

### Haptic Not Working

1. Check Haptics import: `import * as Haptics from 'expo-haptics'`
2. Verify device supports haptic feedback
3. Check haptic type being used

## References

- [Alarmee GitHub](https://github.com/tweener-23/Alarmee)
- [React Native Native Modules](https://reactnative.dev/docs/native-modules-android)
- [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [Android AlarmManager](https://developer.android.com/reference/android/app/AlarmManager)
