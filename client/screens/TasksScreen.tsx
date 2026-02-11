import React, { useState, useCallback, useMemo, memo, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useDatabase, useOneTimeTasks } from "@/hooks/useDatabase";
import { OneTimeTask } from "@/database/DatabaseService";
import { db } from "@/database/DatabaseService";
import { Spacing, BorderRadius } from "@/constants/theme";
import { scheduleOneTimeNotification, cancelNotification, ensurePostNotificationsPermission } from '@/services/NotificationService';
import { registerNotificationCategories } from '@/services/HabitNotificationService';
import { ensureNotificationPermissions } from '@/services/NotificationService';

import AlarmNative from '../native/AlarmNative';

async function ensureAndroidAlarmChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // Ensure channels exist and are configured (sound controlled by channel on Android 8+)
  await ensureNotificationPermissions();
}

// Canonical alarm stop function
const stopAlarmSafely = async () => {
  try {
    await AlarmNative.stopAlarm();
  } catch (e) {
    console.warn('Stop alarm failed:', e);
  }
};

async function scheduleTaskNotification(
  title: string,
  date: Date,
  taskId?: number
): Promise<string | null> {
  try {
    await ensureAndroidAlarmChannel();
    const hasPostPerm = await ensurePostNotificationsPermission();
    if (!hasPostPerm) {
      console.warn('POST_NOTIFICATIONS permission denied - notifications may not be delivered');
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task Reminder 🔔",
        body: title,
        // Android: sound is controlled by channelId. Keep 'default' for iOS.
        sound: 'default',
        categoryIdentifier: 'timer-actions', // Link to stop-alarm action
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
        data: { 
          type: 'task_alarm',
          taskId,
          taskTitle: title
        },
        ...(Platform.OS === 'android' && {
          channelId: 'timer-alarms'
        })
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });

    if (!id) {
      Alert.alert("Notifications", "Please enable notifications to set task alarms.");
      return null;
    }
    return id;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
}

async function cancelTaskNotification(notificationId: string): Promise<void> {
  try {
    await cancelNotification(notificationId);
  } catch (error) {
    console.error("Error canceling notification:", error);
  }
}

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { isInitialized, isLoading: dbLoading } = useDatabase();
  const { tasks, isLoading: tasksLoading, refresh } = useOneTimeTasks();

  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [currentAlarmTask, setCurrentAlarmTask] = useState<OneTimeTask | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      if (isInitialized) {
        refresh();
      }
    }, [isInitialized, refresh])
  );

  // Register notification categories and setup listeners
  useEffect(() => {
    registerNotificationCategories();

    // Listen for notification responses (e.g., user taps the stop-alarm button)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      if (response.actionIdentifier === 'stop-alarm') {
        handleStopAlarm();
      }
    });

    // Listen for notifications received while app is in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      // Check if this is a task alarm notification
      const isTaskAlarm = notification.request.content.data?.type === 'task_alarm';
      
      if (isTaskAlarm && !isAlarmPlaying) {
        // Trigger alarm sound and show overlay
        startAlarmSequence(notification.request.content.data);
      }
    });

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [isAlarmPlaying]);

  // Pulsing animation for alarm overlay
  useEffect(() => {
    if (isAlarmPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isAlarmPlaying, pulseAnim]);

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title.");
      return;
    }

    setIsSaving(true);
    try {
      const taskDateTime = new Date(date);
      taskDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

      if (taskDateTime <= new Date()) {
        Alert.alert("Error", "Please select a future date and time.");
        setIsSaving(false);
        return;
      }

      const notificationId = await scheduleTaskNotification(title, taskDateTime, undefined);

       // Hard-reset: only HabitTimer uses native alarms; Tasks use notifications only.
       const nativeAlarmId: string | null = null;

      await db.createOneTimeTask({
        title: title.trim(),
        date: date.toISOString().split("T")[0],
        time: `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`,
        notificationId: notificationId || undefined,
        nativeAlarmId: nativeAlarmId || undefined,
      });

      setIsCreating(false);
      setTitle("");
      setDate(new Date());
      setTime(new Date());
      refresh();
    } catch (error) {
      console.error("Error creating task:", error);
      Alert.alert("Error", "Failed to create task. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (task: OneTimeTask) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (task.notificationId) {
                await cancelTaskNotification(task.notificationId);
              }
              if (Platform.OS === 'android' && task.nativeAlarmId) {
                try {
                  if (AlarmNative && typeof AlarmNative.cancelAlarm === 'function') {
                    await AlarmNative.cancelAlarm(task.nativeAlarmId);
                  }
                } catch (e) {
                  console.warn('Failed to cancel native alarm', e);
                }
              }
              await db.deleteOneTimeTask(task.id);
              refresh();
            } catch (error) {
              console.error("Error deleting task:", error);
            }
          },
        },
      ]
    );
  };

  const handleStopAlarm = async () => {
    try {
      await stopAlarmSafely();
      setIsAlarmPlaying(false);
      setCurrentAlarmTask(null);
      refresh();
    } catch (error) {
      console.error("Error stopping alarm:", error);
    }
  };

  const startAlarmSequence = (taskData: any) => {
    try {
      // Foreground: provide immediate haptic feedback. Background/killed: channel sound/vibration.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

      // Tasks use notifications, not native alarms - no-op for alarms
      // Alarm sound is handled by the notification system
      setIsAlarmPlaying(true);
      
      // If we have task info, set it
      if (taskData?.taskId) {
        const task = tasks.find(t => t.id === taskData.taskId);
        if (task) {
          setCurrentAlarmTask(task);
        }
      }
    } catch (error) {
      console.error("Error starting alarm sequence:", error);
    }
  };

  const formatDate = (d: Date): string => {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (t: Date): string => {
    return t.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderTask = useCallback(({ item }: { item: OneTimeTask }) => {
    return (
      <View style={[styles.taskCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.taskHeader}>
          <View style={[styles.alarmIcon, { backgroundColor: theme.accent + "20" }]}>
            <Feather name="bell" size={24} color={theme.accent} />
          </View>
          <View style={styles.taskInfo}>
            <ThemedText type="h4">{item.title}</ThemedText>
            <View style={styles.taskMeta}>
              <Feather name="calendar" size={14} color={theme.textSecondary} />
              <ThemedText type="small" secondary>
                {formatDate(new Date(item.date + "T12:00:00"))}
              </ThemedText>
              <Feather name="clock" size={14} color={theme.textSecondary} />
              <ThemedText type="small" secondary>
                {item.time}
              </ThemedText>
            </View>
          </View>
        </View>
        <Pressable
          style={[styles.deleteButton, { backgroundColor: theme.error + "15" }]}
          onPress={() => handleDeleteTask(item)}
        >
          <Feather name="trash-2" size={20} color={theme.error} />
          <ThemedText type="body" style={{ color: theme.error }}>
            Delete Task
          </ThemedText>
        </Pressable>
      </View>
    );
  }, [theme]);

  const isLoading = dbLoading || tasksLoading;

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  // Alarm Playing Overlay
  if (isAlarmPlaying && currentAlarmTask) {
    return (
      <ThemedView style={[styles.alarmOverlay, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.alarmContent}>
          <Animated.View
            style={[
              styles.alarmIconLarge,
              { 
                backgroundColor: theme.error + "20",
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Feather name="bell" size={80} color={theme.error} />
          </Animated.View>

          <ThemedText type="display" style={styles.alarmTitle}>
            {currentAlarmTask.title}
          </ThemedText>

          <ThemedText type="body" secondary style={styles.alarmSubtitle}>
            Task Alarm
          </ThemedText>

          <Pressable
            style={[styles.stopAlarmButton, { backgroundColor: theme.error }]}
            onPress={handleStopAlarm}
          >
            <ThemedText type="body" style={{ color: 'white', fontWeight: '700' }}>
              STOP ALARM
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View
        style={{
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: 60 + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          flex: 1,
        }}
      >
        <ThemedText type="display" style={styles.title}>
          One-Time Tasks
        </ThemedText>

        {!isCreating && tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="clock" size={64} color={theme.textSecondary} />
            <ThemedText type="body" secondary style={styles.emptyText}>
              No tasks yet. Create your first task!
            </ThemedText>
            <Button onPress={() => setIsCreating(true)} style={styles.createButton}>
              Create Task
            </Button>
          </View>
        ) : null}

        {isCreating ? (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ThemedText type="small" secondary style={styles.label}>
                Task Title
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
                value={title}
                onChangeText={setTitle}
                placeholder="Enter task title"
                placeholderTextColor={theme.textSecondary}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" secondary style={styles.label}>
                Date
              </ThemedText>
              <Pressable
                style={[
                  styles.pickerButton,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={20} color={theme.textSecondary} />
                <ThemedText type="body">{formatDate(date)}</ThemedText>
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" secondary style={styles.label}>
                Time
              </ThemedText>
              <Pressable
                style={[
                  styles.pickerButton,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <Feather name="clock" size={20} color={theme.textSecondary} />
                <ThemedText type="body">{formatTime(time)}</ThemedText>
              </Pressable>
            </View>

            <View style={styles.formButtons}>
              <Pressable
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => {
                  setIsCreating(false);
                  setTitle("");
                }}
              >
                <ThemedText type="body">Cancel</ThemedText>
              </Pressable>
              <Button
                onPress={handleCreateTask}
                disabled={isSaving}
                style={styles.saveButton}
              >
                {isSaving ? "Saving..." : "Set Alarm"}
              </Button>
            </View>

            {showDatePicker ? (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            ) : null}

            {showTimePicker ? (
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedTime) => {
                  setShowTimePicker(Platform.OS === "ios");
                  if (selectedTime) setTime(selectedTime);
                }}
              />
            ) : null}
          </View>
        ) : null}

        {tasks.length > 0 && !isCreating ? (
          <>
            <FlatList
              data={tasks}
              renderItem={renderTask}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.tasksList}
              ListHeaderComponent={
                <Button 
                  onPress={() => setIsCreating(true)} 
                  style={styles.createTaskButton}
                >
                  Create Another Task
                </Button>
              }
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              initialNumToRender={5}
              maxToRenderPerBatch={3}
              windowSize={5}
              updateCellsBatchingPeriod={50}
            />
          </>
        ) : null}
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
  title: {
    marginBottom: Spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyText: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  createButton: {
    paddingHorizontal: Spacing["2xl"],
  },
  createTaskButton: {
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  pickerButton: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  formButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    flex: 1,
  },
  tasksList: {
    paddingBottom: Spacing.xl,
  },
  taskCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  taskHeader: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  alarmIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  taskInfo: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.xs,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  // Alarm Overlay Styles
  alarmOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  alarmContent: {
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing["3xl"],
  },
  alarmIconLarge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  alarmTitle: {
    textAlign: "center",
    maxWidth: "80%",
  },
  alarmSubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  stopAlarmButton: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
