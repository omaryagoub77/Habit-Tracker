import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useDatabase, useHabits } from "@/hooks/useDatabase";
import { db, Habit } from "@/database/DatabaseService";
import { Spacing, BorderRadius } from "@/constants/theme";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

interface DayData {
  day: number;
  date: string;
  total: number;
  completed: number;
}

interface DayDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  habits: Habit[];
  completedIds: number[];
}

function DayDetailsModal({ visible, onClose, date, habits, completedIds }: DayDetailsModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.backgroundRoot,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={[styles.modalHandle, { backgroundColor: theme.textSecondary }]} />
          <ThemedText type="h4" style={styles.modalTitle}>
            {formattedDate}
          </ThemedText>
          
          {habits.length === 0 ? (
            <ThemedText type="body" secondary style={styles.noData}>
              No habits tracked this day
            </ThemedText>
          ) : (
            habits.map((habit) => {
              const isCompleted = completedIds.includes(habit.id);
              return (
                <View
                  key={habit.id}
                  style={[styles.modalHabitItem, { backgroundColor: theme.backgroundDefault }]}
                >
                  <View style={styles.modalHabitContent}>
                    <View
                      style={[
                        styles.habitIcon,
                        { backgroundColor: habit?.color + "20" },
                      ]}
                    >
                      <Feather name={(habit?.icon || 'activity') as any} size={16} color={habit?.color} />
                    </View>
                    <ThemedText type="body">{habit?.name || 'Unknown Habit'}</ThemedText>
                  </View>
                  {isCompleted ? (
                    <Feather name="check-circle" size={20} color={theme.success} />
                  ) : (
                    <Feather name="circle" size={20} color={theme.textSecondary} />
                  )}
                </View>
              );
            })
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ReportsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { isInitialized, isLoading: dbLoading } = useDatabase();
  const { habits, refresh: refreshHabits } = useHabits();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState<Map<string, { total: number; completed: number }>>(
    new Map()
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayCompletions, setDayCompletions] = useState<number[]>([]);
  const [streaks, setStreaks] = useState<Map<number, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadMonthData = useCallback(async () => {
    console.log("[ReportsScreen] loadMonthData called, isInitialized:", isInitialized, "habits.length:", habits.length);
    if (!isInitialized) return;
    setIsLoading(true);
    try {
      const data = await db.getCompletionsForMonth(year, month + 1);
      setMonthData(data);

      const streakMap = new Map<number, number>();
      for (const habit of habits) {
        const streak = await db.getHabitStreak(habit.id);
        streakMap.set(habit.id, streak);
      }
      setStreaks(streakMap);
    } catch (error) {
      console.error("Error loading month data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, year, month, habits]);

  useFocusEffect(
    useCallback(() => {
      refreshHabits();
    }, [refreshHabits])
  );

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData, habits]);

  const handleDayPress = async (date: string) => {
    setSelectedDate(date);
    try {
      const completions = await db.getCompletionsForDate(date);
      setDayCompletions(
        completions.filter((c) => c.completed).map((c) => c.habitId)
      );
    } catch (error) {
      console.error("Error loading day completions:", error);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const calendarDays: (DayData | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const data = monthData.get(dateStr) || { total: 0, completed: 0 };
    calendarDays.push({ day, date: dateStr, ...data });
  }

  const getIntensityColor = (total: number, completed: number): string => {
    if (total === 0) return theme.calendarNoData;
    const ratio = completed / total;
    if (ratio === 1) return theme.calendarFull;
    if (ratio > 0) return theme.calendarPartial;
    return theme.calendarNoData;
  };

  const totalCompletions = Array.from(monthData.values()).reduce(
    (sum, d) => sum + d.completed,
    0
  );
  const totalPossible = Array.from(monthData.values()).reduce(
    (sum, d) => sum + d.total,
    0
  );
  const completionRate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;

  if (dbLoading || isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: 60 + Spacing.xl, // Adjusted padding to account for standard tab bar
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <ThemedText type="display" style={styles.title}>
             Reports
          </ThemedText>
        </View>

        <View style={styles.monthNav}>
          <Pressable onPress={handlePrevMonth} style={styles.navButton}>
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h4">
            {MONTHS[month]} {year}
          </ThemedText>
          <Pressable onPress={handleNextMonth} style={styles.navButton}>
            <Feather name="chevron-right" size={24} color={theme.text} />
          </Pressable>
          

        </View>

        <View style={[styles.calendar, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.weekDays}>
            {DAYS.map((day) => (
              <ThemedText key={day} type="caption" secondary style={styles.weekDay}>
                {day}
              </ThemedText>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((dayData, index) => (
              <Pressable
                key={index}
                style={styles.dayCell}
                onPress={() => dayData && handleDayPress(dayData.date)}
                disabled={!dayData}
              >
                {dayData ? (
                  <View
                    style={[
                      styles.dayCircle,
                      {
                        backgroundColor: getIntensityColor(
                          dayData.total,
                          dayData.completed
                        ),
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        color: dayData.total > 0 && dayData.completed > 0 ? "#FFFFFF" : theme.text,
                      }}
                    >
                      {dayData.day}
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.stats}>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h2">{completionRate}%</ThemedText>
            <ThemedText type="small" secondary>
              Completion Rate
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h2">{totalCompletions}</ThemedText>
            <ThemedText type="small" secondary>
              Completed
            </ThemedText>
          </View>
        </View>

        {habits.length > 0 ? (
          <View style={styles.streaksSection}>
            <ThemedText type="h4" style={styles.streaksTitle}>
              Current Streaks
            </ThemedText>
            {habits.map((habit) => (
              <View
                key={habit.id}
                style={[styles.streakItem, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={styles.streakContent}>
                  <View
                    style={[styles.habitIcon, { backgroundColor: habit?.color + "20" }]}
                  >
                    <Feather name={(habit?.icon || 'activity') as any} size={16} color={habit?.color} />
                  </View>
                  <ThemedText type="body">{habit?.name || 'Unknown Habit'}</ThemedText>
                </View>
                <View style={styles.streakBadge}>
                  <Feather name="zap" size={14} color={theme.warning} />
                  <ThemedText type="body" style={{ color: theme.warning }}>
                    {streaks.get(habit.id) || 0}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <DayDetailsModal
        visible={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        date={selectedDate || ""}
        habits={habits}
        completedIds={dayCompletions}
      />
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    marginBottom: 0,
  },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  navButton: {
    padding: Spacing.sm,
  },
  calendar: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  weekDays: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.md,
  },
  weekDay: {
    width: 40,
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  stats: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  streaksSection: {
    marginBottom: Spacing.xl,
  },
  streaksTitle: {
    marginBottom: Spacing.md,
  },
  streakItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  streakContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  habitIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    marginBottom: Spacing.lg,
  },
  modalHabitItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  modalHabitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  noData: {
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
});
