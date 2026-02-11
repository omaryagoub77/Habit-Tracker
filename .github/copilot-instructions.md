# Copilot / Agent instructions for Habit‑Tracker‑Pro

Purpose: Provide the minimal, high‑value context an AI coding agent needs to be immediately productive in this repo.

Quick context
- Mono‑repo style React Native (Expo prebuild) app with both JS (client/) and native Android (android/) code.
- Native alarm subsystem lives under `android/app/src/main/java/com/habitflow/app/alarm` and is intentionally the Source of Truth for exact alarms.
- JS UI lives in `client/` (screens, services, hooks). Expo notification logic lives in `client/services/NotificationService.ts` and is intentionally separate from native AlarmManager behavior.

Top-level architecture (short)
- UI (React Native, `client/`) – lists, pickers, scheduling UI. Examples: `NewHabitScreen.tsx`, `TasksScreen.tsx`, `HabitTimerScreen.tsx`.
- JS services – local notification helper (`client/services/NotificationService.ts`), DB service (`client/database/DatabaseService.ts`).
- Native Android (Kotlin) – exact alarm scheduling + firing, foreground service, full‑screen activity, boot reschedule. Files: `AlarmScheduler.kt`, `AlarmReceiver.kt`, `AlarmService.kt`, `FullScreenAlarmActivity.kt`, `BootReceiver.kt`, `AlarmRepository.kt`, `NotificationHelper.kt`, `PermissionHelper.kt`.
- RN bridge: `AlarmModule.kt` + `AlarmPackage.kt` + JS wrapper `client/native/AlarmNative.ts` (used by `TasksScreen` and `NewHabitScreen`). Note: a local RN package may need manual registration in `MainApplication.kt` (see below).

Key conventions and patterns
- Persistence: Prefer single-source simple persistence for critical state (SharedPreferences for alarms in `AlarmRepository`, SQLite via `DatabaseService` for app data). Keep alarm state durable (ringing state, snooze state, nativeAlarmId).
- Native responsibilities (do not duplicate in JS): exact scheduling, wake locks, audio focus, foreground service lifecycle, boot rescheduling, full‑screen intent. JS must be UI-only for alarms and call native APIs for scheduling/canceling.
- JS responsibilities: create/edit UI, call AlarmNative.scheduleAlarm(ms) and AlarmNative.cancelAlarm(id), schedule Expo local notifications only when exact alarm not required or as a fallback.
- Error handling: prefer graceful fallback (e.g., if native exact alarm fails, fall back to scheduled notification and persist both tokens where applicable).

Files to inspect for alarm behavior (examples)
- `android/app/src/main/AndroidManifest.xml` — permissions `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, receivers/services registered.
- `android/app/src/main/java/com/habitflow/app/alarm/` — all native alarm components and helpers.
- `client/services/NotificationService.ts` — Expo local notification patterns and permission flow.
- `client/screens/TasksScreen.tsx` and `client/screens/NewHabitScreen.tsx` — where scheduling is invoked; search for `AlarmNative` and `scheduleOneTimeNotification`.
- `client/database/DatabaseService.ts` — DB schema: `one_time_tasks` now contains `nativeAlarmId` and `notificationId`.

Build & run notes (developer workflows)
- Install: `npm install` or `yarn`
- Run JS dev server: `npx expo start` (Metro)
- Run on Android emulator/device (fast dev): `npx expo run:android` or `cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`.
- When changing native Kotlin code, prefer Android Studio to sync Gradle and inspect manifest/merged manifests; then `./gradlew assembleDebug` to build.
- Logs: use `adb logcat | grep -i habitflow` or `adb logcat` and filter tags `AlarmReceiver`, `AlarmService`, `BootReceiver`, `NotificationHelper` for native logs; use `expo` logs for JS.

Alarm testing & debug commands (practical examples)
- Broadcast an alarm trigger (dev test):
  adb shell am broadcast -a com.habitflow.app.alarm.ACTION_ALARM_FIRE --es alarm_id test_immediate -n <PACKAGE_NAME>/.alarm.AlarmReceiver
- Start foreground service directly (test notification + fullScreenIntent):
  adb shell am start-foreground-service -n <PACKAGE_NAME>/.alarm.AlarmService --es alarm_id test_immediate
- Use ADB to inspect boot logs and device idle for Doze testing: e.g., `adb shell dumpsys deviceidle force-idle`.
- Check DB row `one_time_tasks` has `nativeAlarmId` populated after scheduling.

Play Store & policy notes (must know)
- `SCHEDULE_EXACT_ALARM` is declared in manifest but must be justified in Play Console when submitting: treat exact alarms as a sensitive permission (only for clock/alarms). Provide clear justification and in-app onboarding. Use `PermissionHelper.kt` to direct users to settings when needed.
- Full-screen intents are allowed for alarm scenarios — ensure they are used only for legitimate alarm events and documented in store listing.

Project-specific gotchas & conventions
- RN native module registration: the repo created `AlarmPackage.kt` and `AlarmModule.kt`, but an agent should confirm the package is registered in `MainApplication.getPackages()` if not autolinked. Search `MainApplication.kt` for manual additions (PackageList auto-links other modules).
- Database migrations: `createOneTimeTask` now accepts `nativeAlarmId`; DB creation includes the column but agents adding new columns should add safe migrations (ALTER TABLE wrapped in try/catch as current pattern uses).
- Notification dual-path: tasks schedule Expo local notification (reliable on JS side) and *optionally* a native exact alarm on Android; the app persists both tokens/ids. Use whichever is available for cancel/reschedule.

Testing guidance to add/instrument
- Unit tests: there are Jest dev deps; add unit tests for DatabaseService helpers and JS AlarmNative usage by mocking `AlarmNative`.
- Integration tests: add an instrumentation or robot test for the AlarmService lifecycle (service starts, notification posted, full-screen intent fired) and BootReceiver rescheduling.
- Add quick ADB smoke test scripts under `android/app/src/main/assets/ALARM_TESTS.md` (already present) and extend them with device IDs and package name replacement.

When in doubt (explicit rules for agents)
- Do not change alarm scheduling behavior in JS; any change to scheduling logic that affects exact firing must be implemented in native `AlarmScheduler.kt` and follow `setAlarmClock` → `setExactAndAllowWhileIdle` fallback pattern.
- Avoid adding long-lived wakelocks — native `AlarmService` should only hold a `PARTIAL_WAKE_LOCK` briefly and release promptly.
- For new public-facing behavior that requires exact alarms, add Play Console justification text and an in-app, opt‑in permission flow using `PermissionHelper.openExactAlarmSettings()`.
- Always persist alarm IDs (`nativeAlarmId` and `notificationId`) atomically with DB changes so BootReceiver and cancel flows can rely on DB state.

If any of the above is unclear or you want me to expand examples (e.g., show how to add a unit test mocking AlarmNative, or how to add Play Console justification text), tell me which section to expand. I can iterate quickly.