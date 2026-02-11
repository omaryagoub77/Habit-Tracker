# HabitFlow - Mobile Design Guidelines

## Architecture Decisions

### Authentication
**No Authentication Required** - HabitFlow is a local-first, single-user habit tracker with SQLite storage.

**Profile/Settings Screen Requirements:**
- User-customizable avatar selection (3 preset avatars: minimal geometric shapes representing growth/progress)
- Display name field (default: "You")
- App preferences:
  - Theme toggle (Light/Dark mode)
  - Default habit time section
  - Notification preferences (enable/disable all)
  - Data management (clear all data with double confirmation)

### Navigation Structure
**Tab Navigation (5 tabs):**
- Tab 1: Today (Home)
- Tab 2: Check
- Tab 3: Reports
- Tab 4: Task
- Tab 5: Settings

**No floating action button needed** - the "+" button is embedded within the Today screen for habit creation.

---

## Screen Specifications

### 1. Today Screen (Home/Landing)
**Purpose:** Display and check off today's habits organized by time section.

**Layout:**
- Header: Custom transparent header
  - Title: "Today" (large, bold)
  - Right button: Small "+" icon to navigate to Create Habit
  - Top inset: `headerHeight + Spacing.xl`
- Main content: ScrollView
  - Four collapsible sections: Morning, Midday, Evening, Night
  - Each section contains habit cards with checkbox + name + optional icon
  - Empty state: "No habits yet. Tap + to create one."
- Bottom inset: `tabBarHeight + Spacing.xl`

**Components:**
- Section headers with time-of-day icons
- Habit cards (pressable, with checkbox)
- Visual feedback: Checked habits show checkmark icon, slight opacity change

---

### 2. Create/Edit Habit Screen
**Purpose:** Create or modify a habit.

**Layout:**
- Header: Default navigation header
  - Left button: Cancel (text button)
  - Title: "New Habit" or "Edit Habit"
  - Right button: Save (text button, primary color)
- Main content: ScrollView with form
  - Habit name input (single line)
  - Time section picker (segmented control: Morning/Midday/Evening/Night)
  - Icon/color selector (horizontal scrollable grid)
  - Reminder toggle + time picker (appears when enabled)
  - Start date picker
  - Active toggle
- Bottom inset: `insets.bottom + Spacing.xl`

**Form Behavior:**
- Submit/Cancel buttons in header
- Auto-dismiss keyboard on scroll

---

### 3. Reports Screen
**Purpose:** View completion history in calendar format with analytics.

**Layout:**
- Header: Default navigation header with transparent background
  - Title: "Reports"
  - Top inset: `headerHeight + Spacing.xl`
- Main content: ScrollView
  - Month/year selector (< Month Year >)
  - Calendar grid (7 columns, 5-6 rows)
  - Day intensity colors (gray = no data, light green = partial, dark green = all completed)
  - Below calendar: Streak stats and completion percentage
  - Tap day → modal showing habits completed that day
- Bottom inset: `tabBarHeight + Spacing.xl`

**Components:**
- Calendar grid cells (pressable)
- Stats cards showing streaks per habit
- Modal/bottom sheet for day details

---

### 4. Task Screen
**Purpose:** Create and manage one single one-time task with alarm.

**Layout:**
- Header: Default navigation header
  - Title: "One-Time Task"
  - Right button: "Clear" (only visible when task exists)
- Main content: ScrollView form or centered empty state
  - If no task: "Set a task with an alarm" empty state + "Create Task" button
  - If task exists: Task card showing title, date, time, with "Delete" button
- Form fields (when creating):
  - Task title input
  - Date picker
  - Time picker
  - "Set Alarm" button (primary action)
- Bottom inset: `tabBarHeight + Spacing.xl`

**Components:**
- Date/time pickers (native platform pickers)
- Task card (if active)
- Confirmation alert for deletion

---

### 5. Settings Screen
**Purpose:** User profile and app preferences.

**Layout:**
- Header: Default navigation header
  - Title: "Settings"
- Main content: ScrollView with sections
  - Profile section: Avatar + display name
  - Preferences: Theme, notifications, default time section
  - Data: "Clear all data" (danger action, nested with double confirmation)
- Bottom inset: `tabBarHeight + Spacing.xl`

**Components:**
- Avatar selector (3 preset options: circle, triangle, hexagon with gradient fills)
- Text input for display name
- Toggle switches
- List items for navigation to nested settings
- Danger button for data clearing

---

## Design System

### Color Palette
**Primary Colors:**
- Primary: `#4CAF50` (Green - represents growth and completion)
- Secondary: `#FF9800` (Amber - for warnings/incomplete)
- Accent: `#2196F3` (Blue - for task/alarm features)

**Neutrals:**
- Background Light: `#FFFFFF`
- Background Dark: `#121212`
- Surface Light: `#F5F5F5`
- Surface Dark: `#1E1E1E`
- Text Primary Light: `#212121`
- Text Primary Dark: `#FFFFFF`
- Text Secondary Light: `#757575`
- Text Secondary Dark: `#B0B0B0`

**Semantic Colors:**
- Success: `#4CAF50`
- Error: `#F44336`
- Warning: `#FF9800`

**Calendar Intensity:**
- No data: `#E0E0E0`
- Partial completion: `#A5D6A7`
- Full completion: `#4CAF50`

### Typography
**Font Family:** System default (SF Pro for iOS, Roboto for Android)

**Type Scale:**
- Display: 34px, bold (screen titles)
- Headline: 24px, semibold (section headers)
- Title: 18px, semibold (card titles)
- Body: 16px, regular (main content)
- Caption: 14px, regular (secondary info)
- Small: 12px, regular (metadata)

### Spacing
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

### Component Styling
**Checkboxes:**
- Size: 24x24px
- Border: 2px solid, Primary color
- Checked: Filled with Primary color + white checkmark
- Press feedback: Scale to 0.95

**Habit Cards:**
- Padding: 16px
- Border radius: 12px
- Background: Surface color
- Press feedback: Opacity 0.7
- No shadow (flat design for minimalism)

**Buttons:**
- Primary: Filled with Primary color, white text, 12px border radius
- Secondary: Outlined with Primary color, Primary text
- Text button: No background, Primary text
- Minimum height: 48px for touch targets

**Floating Elements:**
- None required (no FAB)

**Tab Bar:**
- Height: 60px
- Icons: Feather icons from @expo/vector-icons
  - Today: `home`
  - Reports: `calendar`
  - Task: `clock`
  - Settings: `settings`
- Active tint: Primary color
- Inactive tint: Text secondary color

---

## Visual Design

### Icons
- **System Icons:** Use Feather icon set from `@expo/vector-icons` for all UI actions
- **Habit Icons:** 8 preset icons for users to choose (e.g., water drop, running shoe, book, meditation, etc.) - rendered as Feather icons with customizable colors

### Safe Area Insets
- Screens with tab bar: `bottom: tabBarHeight + Spacing.xl`
- Screens without tab bar: `bottom: insets.bottom + Spacing.xl`
- Screens with transparent header: `top: headerHeight + Spacing.xl`
- Screens without header: `top: insets.top + Spacing.xl`

### Interaction Feedback
- All touchable components use opacity change (0.7) on press
- Checkbox has scale animation (0.95) on press
- No blurred shadows on standard components
- Tab bar icons scale slightly on press

### Critical Assets
1. **User Avatars (3 presets):** Simple geometric shapes with gradient fills
   - Circle with green-to-blue gradient
   - Triangle with orange-to-red gradient  
   - Hexagon with purple-to-pink gradient
2. **Empty State Illustrations:** Minimal line art for:
   - No habits yet (simple plant sprouting)
   - No task set (clock with checkmark)

### Accessibility
- Minimum touch targets: 44x44px (iOS) / 48x48px (Android)
- Color contrast ratio: 4.5:1 for text
- Support for system font scaling
- VoiceOver/TalkBack labels on all interactive elements
- Haptic feedback on habit completion (optional)