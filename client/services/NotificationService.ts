// NotificationService.ts
// NOTE: Alarm scheduling/playback has been hard-reset to native Android AlarmManager.
// This service remains ONLY for non-alarm reminders (e.g., daily habit reminders, task reminders)
// that use Expo Notifications.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let permissionsRequested = false;

export async function ensureNotificationPermissions(): Promise<void> {
  if (permissionsRequested) return;
  permissionsRequested = true;
  try {
    await Notifications.requestPermissionsAsync();
  } catch {
    // ignore
  }

  if (Platform.OS === 'android') {
    // Keep channels for non-alarm notifications only.
    await Notifications.setNotificationChannelAsync('general-notifications', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
    });
  }
}

export async function ensurePostNotificationsPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleOneTimeNotification(title: string, body: string, date: Date): Promise<string | null> {
  try {
    await ensureNotificationPermissions();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'general-notifications' }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
    return id ?? null;
  } catch {
    return null;
  }
}

export async function scheduleDailyNotification(
  title: string,
  body: string,
  hour: number,
  minute: number
): Promise<string | null> {
  try {
    await ensureNotificationPermissions();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'general-notifications' }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    return id ?? null;
  } catch {
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

