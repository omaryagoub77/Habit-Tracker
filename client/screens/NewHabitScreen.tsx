import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  Alert,
  Platform,
  PanResponder,
  GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useDatabase } from "@/hooks/useDatabase";
import { db } from "@/database/DatabaseService";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import AlarmNative from '../native/AlarmNative';

// Expanded Icon Set
const DISPLAY_ICONS = [
  "book-open", "activity", "droplet", "sun", "moon", "zap",
  "coffee", "monitor", "music", "camera", "gift", "heart",
  "anchor", "briefcase", "award", "target", "map", "star"
];

// Helper: HSL to Hex conversion for the Color Picker
const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export default function NewHabitScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, isDark } = useTheme();
  const { isInitialized } = useDatabase();

  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(DISPLAY_ICONS[0]);
  
  // Start with Red to match the gradient start position (0)
  const [selectedColor, setSelectedColor] = useState("#FF0000");
  const [thumbX, setThumbX] = useState(0); // Tracks the visual slider position
  
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(false);
  // Time goal (minutes/day). Persisted to DB as `time_goal`.
  const [timeGoal, setTimeGoal] = useState<number>(30);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Icon Picker Expansion State
  const [isIconsExpanded, setIsIconsExpanded] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Sync navigation header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // --- Logic: Notification & Alarms (PRESERVED) ---

  const scheduleDailyReminder = async (habitId: string, time: Date, name: string) => {
    try {
      const existingHabit = await db.getHabitById(parseInt(habitId));
      if (existingHabit?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(existingHabit.notificationId);
      }

      const now = new Date();
      const firstTrigger = new Date();
      firstTrigger.setHours(time.getHours(), time.getMinutes(), 0, 0);
      if (firstTrigger.getTime() <= now.getTime()) {
        firstTrigger.setDate(firstTrigger.getDate() + 1);
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Habit Reminder',
          body: `Time to ${name}!`,
          // Android channel determines sound; passing a bundled asset here is unreliable.
          // Use a safe string so production builds don't silently ignore sound config.
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'habit_reminder', habitId },
          ...(Platform.OS === 'android' && {
            channelId: 'general-notifications'
          })
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: firstTrigger.getHours(),
          minute: firstTrigger.getMinutes(),
        },
      });

      return notificationId;
    } catch (error) {
      console.warn('Failed to schedule daily notification', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a habit name.");
      return;
    }
    if (!isInitialized) return;

    setIsSaving(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const newHabit = {
        name,
        timeSection: 'morning' as const,
        icon: selectedIcon,
        color: selectedColor,
        reminderTime: reminderEnabled ? reminderTime.toISOString() : undefined,
        timeGoal,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
        createdAt: new Date().toISOString(),
      };
      
      const habitRecord = await db.createHabit(newHabit);

      if (reminderEnabled) {
        try {
          const notificationId = await scheduleDailyReminder(
            habitRecord.toString(),
            reminderTime,
            name
          );
          await db.updateHabit(parseInt(habitRecord.toString()), { notificationId: notificationId });
        } catch (e) {
          console.warn('Failed to schedule daily notification', e);
        }
      }

      // Hard-reset: native alarms are used ONLY for timer completion.
      // Habit reminders remain notification-based and should not schedule native alarms.

      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to create habit.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (t: Date) => {
    const hours = t.getHours();
    const minutes = t.getMinutes();
    // Correct AM/PM mapping:
    // - 00:xx => 12:xx AM
    // - 12:xx => 12:xx PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return { time: `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, ampm };
  };

  const timeData = formatTime(reminderTime);

  // --- Logic: Color Picker (Fixed) ---
  const pickerWidthRef = useRef(0); // Use ref to avoid stale closures in PanResponder

  const handleGradientPress = (evt: GestureResponderEvent) => {
    const width = pickerWidthRef.current;
    if (width <= 0) return;

    const x = evt.nativeEvent.locationX;
    // Clamp X to bounds
    const safeX = Math.max(0, Math.min(x, width));

    // Update visual thumb
    setThumbX(safeX);

    // Calculate percentage (0 to 1)
    const ratio = safeX / width;
    
    // Map to Hue (0-360)
    const hue = ratio * 360;
    const newColor = hslToHex(hue, 100, 50); // Saturation 100%, Lightness 50%
    setSelectedColor(newColor);
  };

  const panResponder = useRef(
    PanResponder.create({
      // IMPORTANT: Capture touches so ScrollView doesn't steal them
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      
      onPanResponderGrant: (evt) => handleGradientPress(evt),
      onPanResponderMove: (evt) => handleGradientPress(evt),
    })
  ).current;


  // --- Logic: Icon Picker ---
  // Show 5 icons by default
  const visibleIcons = isIconsExpanded ? DISPLAY_ICONS : DISPLAY_ICONS.slice(0, 5);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Create Habit</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Name Input Card (Preview) */}
        <View style={[styles.nameCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.mainIconCircle, { backgroundColor: selectedColor }]}>
            <Feather name={selectedIcon as any} size={28} color="#000" />
          </View>
          <View style={styles.nameInputContainer}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>HABIT NAME</ThemedText>
            <TextInput
              style={[
                styles.textInput, 
                { color: theme.text, backgroundColor: theme.backgroundDefault, borderColor: theme.border }, 
                !isDark ? { borderWidth: 1, borderRadius: 8 } : null
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Read 10 pages"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </View>

        {/* Appearance Section */}
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Appearance</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          
          {/* 1. Icon Picker */}
          <ThemedText style={[styles.subLabel, { color: theme.textSecondary }]}>Icon</ThemedText>
          <View style={styles.iconGridContainer}>
            {visibleIcons.map((icon) => (
              <Pressable
                key={icon}
                onPress={() => setSelectedIcon(icon)}
                style={[
                  styles.selectionCircle,
                  { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                  selectedIcon === icon && { 
                    borderColor: selectedColor, 
                    borderWidth: 2, 
                    backgroundColor: isDark ? '#142119' : selectedColor + '20' 
                  }
                ]}
              >
                <Feather 
                  name={icon as any} 
                  size={22} 
                  color={selectedIcon === icon ? selectedColor : theme.textSecondary} 
                />
              </Pressable>
            ))}

            {/* Expand/Collapse Arrow Button */}
            <Pressable
              onPress={() => setIsIconsExpanded(!isIconsExpanded)}
              style={[
                styles.selectionCircle,
                styles.expandBtn,
                { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }
              ]}
            >
              <Feather 
                name={isIconsExpanded ? "chevron-up" : "chevron-down"} 
                size={22} 
                color={theme.text} 
              />
            </Pressable>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* 2. Gradient Color Picker */}
          <ThemedText style={[styles.subLabel, { color: theme.textSecondary }]}>Color</ThemedText>
          <View 
            style={styles.gradientContainer}
            // Update the width ref on layout
            onLayout={(event) => pickerWidthRef.current = event.nativeEvent.layout.width}
            {...panResponder.panHandlers}
          >
            <LinearGradient
              colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientWheel}
            />
            {/* Movable Thumb Indicator */}
            <View 
              pointerEvents="none" // Pass touches through to parent
              style={[
                styles.thumb, 
                { 
                  backgroundColor: selectedColor,
                  // Use thumbX state to move the indicator
                  transform: [{ translateX: thumbX - 18 }] // -18 to center the 36px thumb
                } 
              ]} 
            />
          </View>
        </View>

        {/* Goal Section */}
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Goal</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.miniIcon, { backgroundColor: theme.primary + '20' }]}>
                <Feather name="clock" size={16} color={theme.primary} />
              </View>
              <View>
                <ThemedText style={[styles.settingLabel, { color: theme.text }]}>Timer</ThemedText>
                <ThemedText style={[styles.settingSub, { color: theme.textSecondary }]}>Track duration</ThemedText>
              </View>
            </View>
            <Switch 
              value={timerEnabled} 
              onValueChange={setTimerEnabled} 
              trackColor={{ false: isDark ? '#142119' : theme.backgroundTertiary, true: selectedColor }} 
              thumbColor={isDark ? theme.text : theme.textSecondary} 
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.settingRow}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>Duration</ThemedText>
            <View style={[styles.durationBadge, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText style={[styles.durationValue, { color: theme.text }]}>
                {timeGoal}{' '}
                <ThemedText style={[styles.unitText, { color: theme.textSecondary }]}>min</ThemedText>
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Reminders Section */}
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Reminders</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.miniIcon, { backgroundColor: theme.secondary + '20' }]}>
                <Feather name="bell" size={16} color={theme.secondary} />
              </View>
              <View>
                <ThemedText style={[styles.settingLabel, { color: theme.text }]}>Alert</ThemedText>
                <ThemedText style={[styles.settingSub, { color: theme.textSecondary }]}>Daily reminder</ThemedText>
              </View>
            </View>
            <Switch 
              value={reminderEnabled} 
              onValueChange={setReminderEnabled} 
              trackColor={{ false: isDark ? '#142119' : theme.backgroundTertiary, true: selectedColor }} 
              thumbColor={isDark ? theme.text : theme.textSecondary} 
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable onPress={() => setShowTimePicker(true)} style={styles.settingRow}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>Time</ThemedText>
            <ThemedText style={[styles.timeDisplay, { color: theme.text }]}>
              {timeData.time} <ThemedText style={[styles.unitText, { color: theme.textSecondary }]}>{timeData.ampm}</ThemedText>
            </ThemedText>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <Pressable 
          style={({ pressed }) => [
            styles.saveBtn, 
            { backgroundColor: selectedColor, opacity: pressed ? 0.9 : 1 }
          ]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
             <ThemedText style={[styles.saveBtnText, { color: '#000' }]}>Saving...</ThemedText>
          ) : (
            <>
              <Feather name="check" size={20} color={'#000'} style={{ marginRight: 8 }} />
              <ThemedText style={[styles.saveBtnText, { color: '#000' }]}>Save Habit</ThemedText>
            </>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <ThemedText style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</ThemedText>
        </Pressable>
      </KeyboardAwareScrollViewCompat>

      {showTimePicker && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          display="spinner"
          onChange={(e, date) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (date) setReminderTime(date);
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.lg },
  headerBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  nameCard: { 
    flexDirection: 'row', 
    padding: Spacing.lg, 
    borderRadius: BorderRadius.lg,
    alignItems: 'center'
  },
  mainIconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  nameInputContainer: { flex: 1 },
  inputLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  textInput: { fontSize: 20, marginTop: 4, paddingVertical: 4, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: Spacing.xl, marginBottom: Spacing.md },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.lg },
  subLabel: { fontSize: 12, fontWeight: '600', marginBottom: Spacing.md },
  
  // Icon Picker Styles
  iconGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectionCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    borderWidth: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  expandBtn: {
    borderStyle: 'dashed',
  },

  // Color Picker Styles
  gradientContainer: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    marginBottom: 8,
  },
  gradientWheel: {
    width: '100%',
    height: 44,
    borderRadius: 22,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },

  divider: { height: 1, marginVertical: Spacing.lg },
  
  // Settings Rows
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  settingSub: { fontSize: 12 },
  durationBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  durationValue: { fontWeight: '700' },
  unitText: { fontSize: 12 },
  timeDisplay: { fontSize: 22, fontWeight: '700' },
  
  saveBtn: { 
    marginTop: Spacing.xl, 
    height: 56, 
    borderRadius: 28, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  saveBtnText: { fontWeight: '700', fontSize: 16 },
  cancelBtn: { marginTop: Spacing.lg, alignItems: 'center', padding: 10 },
  cancelText: { fontWeight: '600' }
});
