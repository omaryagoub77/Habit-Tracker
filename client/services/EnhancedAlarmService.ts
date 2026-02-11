// EnhancedAlarmService.ts
// Hard-reset: JS alarm playback removed. Native AlarmManager + ForegroundService owns playback.

export async function stopAlarmSound(): Promise<void> {
  // no-op (native handles)
  return;
}

