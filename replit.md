# HabitFlow - Mobile Habit Tracker App

## Overview
HabitFlow is a production-ready mobile habit tracker app built with Expo and React Native. The app allows users to track daily habits organized by time of day, check off completions, view calendar reports with streaks, and set one-time task alarms.

## Tech Stack
- **Frontend**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Navigation**: React Navigation 7 with bottom tabs
- **Database**: expo-sqlite (local persistent storage)
- **Notifications**: expo-notifications (local notifications & alarms)
- **UI**: iOS 26 Liquid Glass design system with clean, minimal mobile-first UI

## Project Structure
```
client/
├── components/          # Reusable UI components
│   ├── Button.tsx       # Primary button component with animations
│   ├── Card.tsx         # Elevation-based card component
│   ├── ErrorBoundary.tsx # App crash handler
│   ├── ErrorFallback.tsx # Crash recovery UI
│   ├── HeaderTitle.tsx  # App branding header
│   ├── KeyboardAwareScrollViewCompat.tsx # Keyboard avoiding scroll
│   ├── Spacer.tsx       # Layout utility
│   ├── ThemedText.tsx   # Theme-aware text
│   └── ThemedView.tsx   # Theme-aware view
├── constants/
│   └── theme.ts         # Design system tokens, colors, spacing
├── database/
│   └── DatabaseService.ts # SQLite singleton with all CRUD operations
├── hooks/
│   ├── useColorScheme.ts # System color scheme detection
│   ├── useDatabase.ts    # Database hooks for habits, completions, tasks
│   ├── useScreenOptions.ts # Navigation header config
│   └── useTheme.ts       # Theme hook
├── navigation/
│   ├── MainTabNavigator.tsx # 5-tab bottom navigation
│   └── RootStackNavigator.tsx # Root + modal screens
├── screens/
│   ├── TodayScreen.tsx   # Home - habits grouped by time section
│   ├── ReportsScreen.tsx # Calendar view with streaks
│   ├── TaskScreen.tsx    # One-time task with alarm
│   ├── SettingsScreen.tsx # Profile and app preferences
│   ├── NewHabitScreen.tsx # Create habit modal
│   └── EditHabitScreen.tsx # Edit habit modal
├── App.tsx               # App entry with providers
└── index.js              # Expo entry point

server/                   # Express server for static files
assets/images/            # App icons and splash screens
```

## Database Schema

### Tables
1. **habits** - Habit definitions with name, time section, icon, color, reminder settings
2. **habit_completions** - Daily completion records (habitId + date = unique)
3. **one_time_tasks** - Single tasks with date, time, and notification ID
4. **user_settings** - User preferences (avatar, display name, notifications)

## Key Features

### Today Screen
- Habits grouped by Morning, Midday, Evening, Night sections
- Checkbox completion with haptic feedback
- Long press to edit habit
- Floating + button to create new habits


### Reports Screen
- Monthly calendar grid with completion intensity colors
- Tap day to see completed habits
- Current streak tracking per habit
- Overall completion rate statistics

### Task Screen
- Create one-time task with alarm
- Date and time pickers
- Notification scheduling at exact time
- Delete task cancels notification

### Settings Screen
- Profile avatar selection (3 presets)
- Display name customization
- Notifications toggle
- Default time section preference
- Clear all data (double confirmation)

## Running the App

### Development
```bash
npm run all:dev  # Starts Expo + Express servers
```

### Testing
- **Web**: Opens in browser (SQLite has limited web support)
- **Mobile**: Scan QR code with Expo Go app on iOS/Android

## Platform Notes
- expo-sqlite works fully on native (iOS/Android via Expo Go)
- Web platform shows WASM warning but app still functions with graceful fallbacks
- Notifications work on native devices, limited on web

## Design Guidelines
See `design_guidelines.md` for full design system specifications including:
- Color palette (Primary green #4CAF50)
- Typography scale
- Spacing tokens
- Component styling
- Calendar intensity colors for reports
