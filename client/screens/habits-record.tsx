import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Dimensions,
  Platform,
  FlatList,
  Text,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { HabitRecordCard } from "@/components/HabitRecordCard";
import { useTheme } from "@/hooks/useTheme";
import { useDatabase } from "@/hooks/useDatabase";
import { Habit } from "@/database/DatabaseService";
import { db } from "@/database/DatabaseService";
import { Spacing, BorderRadius } from "@/constants/theme";

// Generate last 31 days to ensure we see month transitions clearly
function getDaysRange(): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  // Show past 31 days
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split("T")[0];
    dates.push(dateString);
  }
  
  return dates;
}

// Format date for display
function formatDate(dateString: string): { day: string; month: string } {
  const date = new Date(dateString + "T12:00:00");
  return {
    day: date.getDate().toString(),
    month: date.toLocaleString("default", { month: "short" }),
  };
}

// Get full date string for modal
function getFullDateString(dateString: string): string {
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Get current month for highlighting
function getCurrentMonth(): string {
  return new Date().toLocaleString("default", { month: "short" });
}

interface HabitData {
  habit: Habit;
  completions: Map<string, boolean>;
}

interface DayDetailModalProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  habit: Habit | null;
  completed: boolean | null;
}

function DayDetailModal({ visible, onClose, date, habit, completed }: DayDetailModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  if (!habit || completed === null) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.backgroundRoot,
              paddingBottom: insets.bottom + Spacing.lg,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHandle} />
          <ThemedText type="h4" style={styles.modalTitle}>
            {getFullDateString(date)}
          </ThemedText>
          
          <View style={[styles.modalHabitItem, { backgroundColor: theme.backgroundDefault }]}> 
            <View style={styles.modalHabitContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: habit?.color + "20" },
                ]}
              >
                <Feather name={(habit?.icon || 'activity') as any} size={18} color={habit?.color} />
              </View>
              <ThemedText type="body" style={{ fontWeight: '600' }}>{habit?.name || 'Unknown Habit'}</ThemedText>
            </View>
            <View style={styles.statusBadge}>
              {completed ? (
                <View style={[styles.badge, { backgroundColor: theme.success + '15' }]}> 
                  <Feather name="check" size={14} color={theme.success} />
                  <ThemedText type="caption" style={{ color: theme.success, marginLeft: 4, fontWeight: 'bold' }}>
                    Done
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: theme.error + '15' }]}> 
                  <Feather name="x" size={14} color={theme.error} />
                  <ThemedText type="caption" style={{ color: theme.error, marginLeft: 4, fontWeight: 'bold' }}>
                    Missed
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function HabitsRecordScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { isInitialized } = useDatabase();
  const navigation = useNavigation();
  const [habitsData, setHabitsData] = useState<HabitData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [selectedCompleted, setSelectedCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  const screenWidth = Dimensions.get('window').width;
  
  // Calculate responsive dot size
  const dotSize = useMemo(() => {
    if (screenWidth <= 380) return 26;
    return 30; // Slightly larger for better readability of numbers
  }, [screenWidth]);
  
  // Spacing between dots
  const dotSpacing = useMemo(() => 8, []); // Increased spacing for cleaner look

  // Generate date range
  const dateRange = useMemo(() => getDaysRange(), []);

  const loadData = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      setLoading(true);
      const habits = await db.getActiveHabits();
      const habitData: HabitData[] = [];
      
      for (const habit of habits) {
        const completions = new Map<string, boolean>();
        dateRange.forEach(date => completions.set(date, false));
        
        const habitCompletions = await db.getCompletionsForHabitInRange(
          habit.id,
          dateRange[0],
          dateRange[dateRange.length - 1]
        );
        
        habitCompletions.forEach(({ date, completed }: { date: string; completed: boolean }) => {
          completions.set(date, completed);
        });
        
        habitData.push({ habit, completions });
      }
      
      setHabitsData(habitData);
    } catch (error) {
      console.error("Error loading habits record:", error);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, dateRange]);

  // Group dates by month for the header
  const monthGroups = useMemo(() => {
    const groups: { month: string; dates: string[]; isCurrentMonth: boolean }[] = [];
    let currentMonth = "";
    let currentGroup: string[] = [];
    const currentMonthName = getCurrentMonth();
    
    dateRange.forEach(date => {
      const { month } = formatDate(date);
      if (month !== currentMonth) {
        if (currentGroup.length > 0) {
          groups.push({ 
            month: currentMonth, 
            dates: currentGroup,
            isCurrentMonth: currentMonth === currentMonthName
          });
        }
        currentMonth = month;
        currentGroup = [date];
      } else {
        currentGroup.push(date);
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push({ 
        month: currentMonth, 
        dates: currentGroup,
        isCurrentMonth: currentMonth === currentMonthName
      });
    }
    
    return groups;
  }, [dateRange]);

  useFocusEffect(
    useCallback(() => {
      if (isInitialized) loadData();
    }, [isInitialized, loadData])
  );

  const handleDotPress = useCallback((date: string, habit: Habit, completed: boolean) => {
    setSelectedDate(date);
    setSelectedHabit(habit);
    setSelectedCompleted(completed);
  }, []);

  // Render the habit cards using FlatList for better performance
  const renderHabitCard = useCallback(({ item, index }: { item: HabitData; index: number }) => {
    return (
      <HabitRecordCard 
        key={item.habit.id} 
        habitData={item} 
        dateRange={dateRange} 
        monthGroups={monthGroups}
        dotSize={dotSize}
        handleDotPress={handleDotPress}
      />
    );
  }, [dateRange, monthGroups, dotSize, handleDotPress, theme.isDark]);

  if (loading || !isInitialized) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Fixed Main Header */}
      <View style={[styles.topHeader, { paddingTop: insets.top }]}>
        <View style={styles.navRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h4">Habit Records</ThemedText>
        </View>
      </View>

      {/* Main Body - FlatList for better performance */}
      <FlatList 
        data={habitsData}
        renderItem={renderHabitCard}
        keyExtractor={(item) => `${item.habit.id}-${theme.isDark ? 'dark' : 'light'}`}
        contentContainerStyle={{ 
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 80 
        }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        updateCellsBatchingPeriod={50}
      />

      <DayDetailModal
        visible={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        date={selectedDate || ""}
        habit={selectedHabit}
        completed={selectedCompleted}
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
  topHeader: {
    paddingBottom: Spacing.sm,
    backgroundColor: 'transparent', 
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  backButton: {
    marginRight: Spacing.md,
    padding: 4,
  },
  
  // Main Content
  mainScrollView: {
    flex: 1,
  },
  
  // Card Styling
  habitCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 2,
  },
  miniStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  
  // Month Labels
  monthLabels: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  monthLabelContainer: {
    marginRight: Spacing.md,
  },
  monthLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Dots Grid - Wrapped Layout
  dotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dotWrapper: {
    width: '14.28%', // 7 columns (100 / 7 = 14.28%)
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  firstDayLabel: {
    fontSize: 10,
    marginBottom: 2,
    alignSelf: 'center',
  },
  dayDot: {
    justifyContent: "center",
    alignItems: "center",
  },
  dayNumber: {
    fontWeight: "600",
    textAlign: 'center',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#555",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
    opacity: 0.5,
  },
  modalTitle: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  modalHabitItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  modalHabitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});