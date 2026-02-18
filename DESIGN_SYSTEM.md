# Habit Tracker Design System
## Calm, Premium, Completion-Focused Product Identity

---

## 1. GLOBAL DESIGN SYSTEM

### 1.1 Spacing System (8-Point Scale)
**Enforced Values:**
- `xs`: 4px (minimal element spacing)
- `sm`: 8px (tight element grouping)
- `md`: 12px (default small gap)
- `lg`: 16px (standard card padding, element spacing)
- `xl`: 24px (section spacing minimum)
- `2xl`: 32px (major screen separation)
- `3xl`: 40px (large section gaps)
- `4xl`: 48px (hero spacing)

**Rules:**
- Section spacing minimum: 24px (xl)
- Card internal padding minimum: 16px (lg)
- Major screen separation minimum: 32px (2xl)
- No arbitrary values like 13, 19, or 27

### 1.2 Typography Hierarchy
**Scale with Distinct Roles:**
- `display`: 34px, weight 700 - Screen titles only
- `h1`: 32px, weight 600 - Page headers (medium, not heavy)
- `h2`: 28px, weight 600 - Section headers
- `h3`: 24px, weight 500 - Card titles (reduced from 600)
- `h4`: 20px, weight 500 - Subsection titles
- `title`: 18px, weight 500 - Component titles
- `body`: 16px, weight 400 - Primary content
- `small`: 14px, weight 400 - Secondary content
- `caption`: 12px, weight 400 - Tertiary info, labels

**Principles:**
- Reduce bold usage; employ weight contrast intentionally
- Create visual hierarchy without heaviness
- Use semibold (500-600) for most headings, reserve bold (700) for display only

### 1.3 Color System

**Light Theme (Clean Meadow Premium):**
```
text: #1A2E24 (Deep Forest Green)
textSecondary: #6B7C6B (Muted Sage)
primary: #2E8B57 (Sea Green - refined from neon)
primaryMuted: #2E8B5733 (20% opacity for backgrounds)
secondary: #8B7355 (Warm Taupe - refined from coral)
accent: #5B7B9B (Muted Steel Blue - refined from electric blue)
success: #4A7C59 (Forest Success)
error: #B85450 (Muted Coral Red)
warning: #B8860B (Goldenrod)
backgroundRoot: #F8FAF7 (Off-White)
backgroundDefault: #EEF2EF (Soft Pale Green)
backgroundSecondary: #E2E8E4 (Light Sage)
backgroundTertiary: #D4DCD7 (Muted Gray-Green)
border: #C5CFC8 (Subtle divider)
```

**Dark Theme (Forest Premium):**
```
text: #F5F7F3 (Soft White)
textSecondary: #9AAB9E (Muted Sage)
primary: #3CB371 (Medium Sea Green - refined)
primaryMuted: #3CB37133 (20% opacity)
secondary: #C4956A (Warm Taupe)
accent: #7BA3C4 (Muted Steel Blue)
success: #5D9C6F (Forest Success)
error: #D47570 (Muted Coral)
warning: #DAA520 (Goldenrod)
backgroundRoot: #121A15 (Deep Forest)
backgroundDefault: #1A2820 (Dark Forest)
backgroundSecondary: #243530 (Forest Gray)
backgroundTertiary: #2E443A (Muted Forest)
border: #3D5446 (Subtle divider)
```

**Accent Palette (Refined - No Neon):**
```
coral: #C4806A (Muted Coral)
electricBlue: #6B8BA4 (Muted Blue)
purple: #9B7AB8 (Muted Purple)
pink: #B87090 (Muted Rose)
```

### 1.4 Card System
- **Corner Radius**: 16px (lg) standard, 24px (2xl) for large cards
- **Shadow**: Light, elevated but subtle - never heavy
- **Padding**: 16px (lg) minimum internal
- **Margin Bottom**: 12px between cards
- **Background**: Use backgroundDefault or backgroundSecondary

### 1.5 Button Hierarchy
**Primary Button:**
- Solid background (primary color)
- Clear emphasis, full height (48px)
- Border radius: 12px (md)

**Secondary Button:**
- Outline or soft fill
- Border: 1px solid border color
- Background: backgroundSecondary
- Height: 44px

**Tertiary Button:**
- Text-only
- No background, no border
- Subtle text color

### 1.6 Floating Action Button
- Reduced visual weight (smaller size: 56px)
- Positioned with 24px bottom margin
- Subtle shadow, not prominent

---

## 2. SCREEN-SPECIFIC REQUIREMENTS

### 2.1 Today Screen
- **Progress Container**: Calm background, clear percentage display
- **Habit Cards**: 
  - Title at top
  - Streak/small stat below
  - Completion indicator prominent
  - Increased vertical breathing room (16px between elements)
  - No unnecessary borders
- **Empty State**: Elegant, centered, calm iconography
- **FAB**: Reduced weight, improved bottom margin

### 2.2 Reports Screen
- **Calendar Grid**:
  - Maintain 7-column layout
  - Improve circle alignment (32px circles)
  - Increased row spacing
  - Clear highlight for selected day without overwhelming
- **Stats Cards**:
  - Reduced visual heaviness
  - Metric value prominent
  - Label clear, secondary context muted

### 2.3 Habit Detail Screen
- **Content Zones**: Summary, Analytics, History separated clearly
- **Weekly Rows**: Increased spacing
- **Monthly Grid**: Improved breathing room
- **Modals**: Aligned with rest of application styling
- **NO time-spent emphasis**: Focus purely on completion, streak, consistency

### 2.4 Add/Edit Habit Screen
- **Form Section Grouping**: Organized fieldsets with clear labels
- **Icon Picker**: Grid layout, clean spacing
- **Color Picker**: Aligned elements, refined appearance
- **Toggle Alignment**: Precise, consistent
- **Save/Cancel Hierarchy**: Clear primary vs tertiary distinction
- **Reminders**: Subtle, optional appearance

### 2.5 Settings Screen
- **Card Separation**: Consistent 24px spacing
- **Toggle Alignment**: Precise
- **Section Grouping**: Logical
- **Footer**: Refined spacing

---

## 3. CONSISTENCY ENFORCEMENT

**Across ALL screens:**
- Identical header alignment
- Identical card corner radius (16px/24px)
- Identical shadow depth
- Identical section spacing (24px minimum)
- Identical modal styling
- Identical button hierarchy
- Identical toggle design

---

## 4. PROHIBITED ELEMENTS

- ❌ Timers, stopwatches, session duration displays
- ❌ Focus mode interfaces
- ❌ Neon colors or aggressive gradients
- ❌ Heavy shadows
- ❌ Flashy animations
- ❌ Excessive borders or visual noise

---

## 5. EMOTIONAL TONE

- Stable
- Premium
- Intentional
- Calm
- Mature
- Not experimental
- Notion-level clarity
- Linear-style minimalism
- Apple Health spacing discipline
