import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useDatabase } from "@/hooks/useDatabase"; // Import the useDatabase hook
import { Habit } from "@/database/DatabaseService";
import { Spacing, BorderRadius, HabitIcons, HabitColors, TimeSection } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { scheduleDailyNotification, cancelNotification } from "@/services/NotificationService";

const TIME_SECTIONS = Object.keys(TimeSection) as Array<keyof typeof TimeSection>;

async function scheduleHabitReminder(
  habitName: string,
  time: Date
): Promise<string | null> {
  try {
    const id = await scheduleDailyNotification(
      "Habit Reminder",
      `Time for: ${habitName}`,
      time.getHours(),
      time.getMinutes()
    );
    return id;
  } catch (error) {
    console.error("Error scheduling reminder:", error);
    return null;
  }
}

async function cancelHabitNotification(notificationId: string): Promise<void> {
  try {
    await cancelNotification(notificationId);
  } catch (error) {
    console.error("Error canceling notification:", error);
  }
}

export default function EditHabitScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "EditHabit">>();
  const { theme, isDark } = useTheme();
  const { isInitialized } = useDatabase(); // Get database initialization status
  const { habitId } = route.params;

  const [habit, setHabit] = useState<Habit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [timeSection, setTimeSection] = useState<keyof typeof TimeSection>("morning");
  const [selectedIcon, setSelectedIcon] = useState<typeof HabitIcons[number]>(HabitIcons[0]);
  const [selectedColor, setSelectedColor] = useState<typeof HabitColors[number]>(HabitColors[0]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadHabit();
  }, [habitId, isInitialized]); // Add isInitialized as a dependency

  const loadHabit = async () => {
    // Only load habit if database is initialized
    if (!isInitialized) {
      console.log("[EditHabitScreen] Skipping load - database not initialized");
      setIsLoading(false);
      return;
    }
    
    try {
      // Use the database methods through the hook system which ensures initialization
      const h = await (await import("@/database/DatabaseService")).db.getHabitById(habitId);
      if (h) {
        setHabit(h);
        setName(h.name);
        setTimeSection(h.timeSection);
        setSelectedIcon(h.icon as typeof HabitIcons[number]);
        setSelectedColor(h.color as typeof HabitColors[number]);
        setReminderEnabled(!!h.reminderTime);
        if (h.reminderTime) {
          const [hours, minutes] = h.reminderTime.split(":").map(Number);
          const time = new Date();
          time.setHours(hours, minutes, 0, 0);
          setReminderTime(time);
        }
        setStartDate(new Date(h.startDate + "T12:00:00"));
        setIsActive(h.active);
      }
    } catch (error) {
      console.error("Error loading habit:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: false, // Using custom header
    });
  }, [navigation]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a habit name.");
      return;
    }

    if (!habit) return;

    // Check if database is initialized before saving
    if (!isInitialized) {
      Alert.alert("Error", "Database not ready. Please try again.");
      return;
    }

    setIsSaving(true);
    try {
      let notificationId: string | undefined = habit.notificationId;

      if (habit.notificationId) {
        await cancelHabitNotification(habit.notificationId);
        notificationId = undefined;
      }

      if (reminderEnabled) {
        const scheduledId = await scheduleHabitReminder(name, reminderTime);
        notificationId = scheduledId || undefined;
      }

      await (await import("@/database/DatabaseService")).db.updateHabit(habitId, {
        name: name.trim(),
        timeSection,
        icon: selectedIcon,
        color: selectedColor,
        reminderTime: reminderEnabled
          ? `${String(reminderTime.getHours()).padStart(2, "0")}:${String(reminderTime.getMinutes()).padStart(2, "0")}`
          : undefined,
        startDate: startDate.toISOString().split("T")[0],
        active: isActive,
        notificationId,
      });

      navigation.goBack();
    } catch (error) {
      console.error("Error updating habit:", error);
      Alert.alert("Error", "Failed to update habit. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Habit",
      "Are you sure you want to delete this habit? This will also delete all completion records.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Check if database is initialized before deleting
            if (!isInitialized) {
              Alert.alert("Error", "Database not ready. Please try again.");
              return;
            }
            
            try {
              if (habit?.notificationId) {
                await cancelHabitNotification(habit.notificationId);
              }
              await (await import("@/database/DatabaseService")).db.deleteHabit(habitId);
              navigation.goBack();
            } catch (error) {
              console.error("Error deleting habit:", error);
              Alert.alert("Error", "Failed to delete habit.");
            }
          },
        },
      ]
    );
  };

  const formatTime = (t: Date): string => {
    return t.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (d: Date): string => {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!habit) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText type="body">Habit not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Custom Header - Positioned absolutely to overlay content */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }]}>  
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Edit Habit</ThemedText>
        <View style={{ width: 40 }} />
      </View>
      
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.xl + 50, // Increased padding to account for header
          paddingBottom: 150, // Extra padding to account for buttons at bottom
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inputGroup}>
          <ThemedText type="small" secondary style={styles.label}>
            Habit Name
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Drink water"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" secondary style={styles.label}>
            Time Section
          </ThemedText>
          <SegmentedControl
            values={TIME_SECTIONS.map((s) => TimeSection[s].label)}
            selectedIndex={TIME_SECTIONS.indexOf(timeSection)}
            onChange={(event) => {
              setTimeSection(TIME_SECTIONS[event.nativeEvent.selectedSegmentIndex]);
            }}
            style={styles.segmentedControl}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" secondary style={styles.label}>
            Icon
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.iconScroll}
          >
            {HabitIcons.map((icon) => (
              <Pressable
                key={icon}
                style={[
                  styles.iconOption,
                  {
                    backgroundColor:
                      selectedIcon === icon
                        ? selectedColor + "20"
                        : theme.backgroundDefault,
                    borderColor:
                      selectedIcon === icon ? selectedColor : theme.border,
                  },
                ]}
                onPress={() => setSelectedIcon(icon)}
              >
                <Feather
                  name={icon as any}
                  size={24}
                  color={selectedIcon === icon ? selectedColor : theme.textSecondary}
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" secondary style={styles.label}>
            Color
          </ThemedText>
          <View style={styles.colorGrid}>
            {HabitColors.map((color) => (
              <Pressable
                key={color}
                style={[
                  styles.colorOption,
                  {
                    backgroundColor: color,
                    borderWidth: selectedColor === color ? 3 : 0,
                    borderColor: theme.text,
                  },
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="bell" size={20} color={theme.text} />
              <ThemedText type="body">Daily Reminder</ThemedText>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={async (value) => {
                const oldValue = reminderEnabled;
                setReminderEnabled(value);
                
                if (!value && habit?.notificationId) {
                  // Cancel existing notification if toggling off
                  try {
                    await cancelHabitNotification(habit.notificationId);
                    // Update the habit to remove the notification ID
                    await (await import('@/database/DatabaseService')).db.updateHabit(habitId, {
                      notificationId: undefined,
                    });
                  } catch (e) {
                    console.warn('Failed to cancel notification when disabling reminder', e);
                    // Restore the previous value if cancellation failed
                    setReminderEnabled(oldValue);
                  }
                }
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          {reminderEnabled ? (
            <Pressable
              style={[styles.timeButton, { borderColor: theme.border }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Feather name="clock" size={20} color={theme.textSecondary} />
              <ThemedText type="body">{formatTime(reminderTime)}</ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" secondary style={styles.label}>
            Start Date
          </ThemedText>
          <Pressable
            style={[
              styles.dateButton,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Feather name="calendar" size={20} color={theme.textSecondary} />
            <ThemedText type="body">{formatDate(startDate)}</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="toggle-right" size={20} color={theme.text} />
              <ThemedText type="body">Active</ThemedText>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
        </View>

        <Pressable
          style={[
            styles.deleteButton,
            { backgroundColor: theme.error + "15", borderColor: theme.error },
          ]}
          onPress={handleDelete}
        >
          <Feather name="trash-2" size={20} color={theme.error} />
          <ThemedText type="body" style={{ color: theme.error }}>
            Delete Habit
          </ThemedText>
        </Pressable>

        {showTimePicker ? (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedTime) => {
              setShowTimePicker(Platform.OS === "ios");
              if (selectedTime) setReminderTime(selectedTime);
            }}
          />
        ) : null}

        {showDatePicker ? (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === "ios");
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        ) : null}
      </KeyboardAwareScrollViewCompat>
      
      {/* Action Buttons at Bottom - Not fixed, part of normal flow */}
      <View style={styles.bottomButtonContainer}>
        <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <ThemedText style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</ThemedText>
        </Pressable>
        
        <Pressable style={[styles.saveBtn, { backgroundColor: selectedColor }]} onPress={handleSave} disabled={isSaving}>
          <Feather name="check" size={20} color={isDark ? '#000' : theme.text} style={{ marginRight: 8 }} />
          <ThemedText style={[styles.saveBtnText, { color: isDark ? '#000' : theme.text }]}>
            {isSaving ? "Saving..." : "Save Habit"}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  segmentedControl: {
    height: 40,
  },
  iconScroll: {
    flexGrow: 0,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
  },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  dateButton: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.lg }, // Background handled in JSX
  headerBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' }, // Color changed in JSX
  bottomButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    marginTop: Spacing.md,
  },
  saveBtn: { 
    flex: 1,
    marginLeft: Spacing.md,
    height: 56, 
    borderRadius: 28, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  saveBtnText: { 
    fontWeight: '700', 
    fontSize: 16 
  },
  cancelBtn: { 
    flex: 1,
    marginRight: Spacing.md,
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4A554E',
  },
  cancelText: { 
    fontWeight: '600' 
  },
});
