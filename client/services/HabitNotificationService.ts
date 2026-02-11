// HabitNotificationService.ts
// Legacy timer-alarm notification logic removed.
// This file remains as a minimal shim to avoid breaking reminder UI paths.

export const HabitNotificationService = {
  async scheduleTimerNotification(_seconds: number, _habitName: string): Promise<string | null> {
    return null;
  },
  async cancelNotification(_notificationId: string): Promise<void> {
    return;
  },
  async cancelAll(): Promise<void> {
    return;
  }
};

// Backwards-compat export used by TasksScreen.
export const registerNotificationCategories = async (): Promise<void> => {
  return;
};
