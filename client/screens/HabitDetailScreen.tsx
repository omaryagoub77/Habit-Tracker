import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Text,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInUp,
  FadeIn,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useDatabase } from "@/hooks/useDatabase";
import { db } from '@/database/DatabaseService';
import { Habit, HabitCompletion } from '@/database/DatabaseService';
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

// Types
interface HabitStats {
  streak: number;
  consistency: number;
  totalCompletions: number;
  weeklyCompletions: number[];
  monthlyCompletions: Record<string, number>;
}

interface CompletionSession {
  id: number;
  date: string;
  completed: boolean;
  createdAt: string;
}

interface DayDetailModalProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  habit: Habit | null;
  completed: boolean | null;
  completions?: Map<string, boolean>;
}

// Utility Functions
function formatDate(dateString: string): { day: number; month: string; formatted: string } {
  const date = new Date(dateString);
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    formatted: date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  };
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateString).formatted;
}

// Get week of month (1-5)
function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const offsetDate = date.getDate() + firstDayOfWeek - 1;
  return Math.ceil(offsetDate / 7);
}

// Get all days in a month
function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const date = new Date(year, month, 1);
  
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay();
  
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push('');
  }
  
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= lastDay; i++) {
    days.push(new Date(year, month, i).toISOString().split("T")[0]);
  }
  
  return days;
}

// MonthDetailGrid Component
function MonthDetailGrid({
  habit,
  completions,
}: {
  habit: Habit;
  completions: Map<string, boolean>;
}) {
  const { theme } = useTheme();
  const today = new Date().toISOString().split("T")[0];
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  
  return (
    <View style={styles.dotsGrid}>
      {daysInMonth.map((date, index) => {
        if (!date) {
          return <View key={`empty-${index}`} style={styles.dotWrapper} />;
        }
        
        const completed = completions.get(date) ?? false;
        const isToday = date === today;
        const { day } = formatDate(date);

        return (
          <Pressable key={date} style={styles.dotWrapper}>
            <View
              style={[
                styles.dayDot,
                {
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: completed
                    ? theme.success + "20"
                    : isToday
                    ? "transparent"
                    : theme.backgroundSecondary,
                  borderWidth: isToday ? 2 : 0,
                  borderColor: isToday ? theme.primary : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              {completed ? (
                <Feather name="check" size={14} color={theme.success} />
              ) : (
                <Text style={[styles.dayNumber, { color: theme.textSecondary }]}>
                  {day}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// DayDetailModal Component
function DayDetailModal({
  visible,
  onClose,
  date,
  habit,
  completed,
  completions = new Map(),
}: DayDetailModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  if (!visible || !habit) return null;
  
  const { formatted } = formatDate(date);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.modalContainer}>
        <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
          <Pressable onPress={onClose}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h4">Habit Details</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.habitInfo, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.habitIconContainer, { backgroundColor: habit.color + "20" }]}>
              <Feather name={habit.icon as any} size={24} color={habit.color} />
            </View>
            <View style={styles.habitDetails}>
              <ThemedText type="h3">{habit.name}</ThemedText>
              <ThemedText type="small" secondary>{formatted}</ThemedText>
            </View>
            <View style={[
              styles.statusIndicator, 
              { backgroundColor: completed ? theme.success : theme.error }
            ]} />
          </View>
          
          <View style={styles.monthGridContainer}>
            <ThemedText type="title" style={styles.monthGridTitle}>Monthly Progress</ThemedText>
            <ScrollView style={{ marginTop: Spacing.md }}>
              <MonthDetailGrid habit={habit} completions={completions} />
            </ScrollView>
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HabitDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, "HabitDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { isInitialized } = useDatabase();
  
  const { habitId } = route.params;
  
  const [habit, setHabit] = useState<Habit | null>(null);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [dayDetailVisible, setDayDetailVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCompleted, setSelectedCompleted] = useState<boolean | null>(null);
  const [habitCompletionsMap, setHabitCompletionsMap] = useState<Map<string, boolean>>(new Map());
  
  const statsOpacity = useSharedValue(0);
  
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  
  const fetchHabitData = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      setLoading(true);
      
      const habitData = await db.getHabitById(habitId);
      if (!habitData) {
        navigation.goBack();
        return;
      }
      setHabit(habitData);
      
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const completions = await db.getCompletionsForHabitInRange(
        habitId, 
        ninetyDaysAgo.toISOString().split("T")[0],
        new Date().toISOString().split("T")[0]
      );
      
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      
      const monthCompletions = await db.getCompletionsForHabitInRange(
        habitId,
        firstDayOfMonth,
        lastDayOfMonth
      );
      
      const completionsMap = new Map<string, boolean>();
      monthCompletions.forEach((completion: any) => {
        completionsMap.set(completion.date, completion.completed);
      });
      
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = new Date(currentYear, currentMonth, day).toISOString().split("T")[0];
        if (!completionsMap.has(dateStr)) {
          completionsMap.set(dateStr, false);
        }
      }
      
      setHabitCompletionsMap(completionsMap);
      
      const calculatedStats = calculateStats(completions, habitData);
      setStats(calculatedStats);
      
      setTimeout(() => {
        statsOpacity.value = withTiming(1, { duration: 500 });
      }, 300);
      
    } catch (error) {
      console.error("Error fetching habit data:", error);
    } finally {
      setLoading(false);
    }
  }, [habitId, isInitialized, navigation, today, statsOpacity]);
  
  const calculateStats = (completions: { date: string; completed: boolean }[], habit: Habit): HabitStats => {
    let streak = 0;
    const sortedCompletions = [...completions].sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let currentDate = new Date();
    for (const completion of sortedCompletions) {
      const completionDate = new Date(completion.date);
      const diffDays = Math.floor((currentDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0 && completion.completed) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (diffDays === 1 && completion.completed) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCompletions = completions.filter((c: any) => 
      new Date(c.date) >= thirtyDaysAgo && c.completed
    );
    const consistency = Math.round((recentCompletions.length / 30) * 100);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyCompletions = completions
      .filter((c: any) => new Date(c.date) >= weekAgo && c.completed)
      .map((c: any) => {
        const dayIndex = (new Date(c.date).getDay() + 6) % 7;
        return dayIndex;
      });
    
    const monthlyCompletions: Record<string, number> = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    completions.forEach((c: any) => {
      if (c.completed) {
        const completionDate = new Date(c.date);
        if (completionDate.getMonth() === currentMonth && completionDate.getFullYear() === currentYear) {
          const weekOfMonth = getWeekOfMonth(completionDate);
          const weekKey = `Week ${weekOfMonth}`;
          monthlyCompletions[weekKey] = (monthlyCompletions[weekKey] || 0) + 1;
        }
      }
    });
    
    return {
      streak,
      consistency,
      totalCompletions: completions.filter(c => c.completed).length,
      weeklyCompletions,
      monthlyCompletions
    };
  };
  
  const handleEdit = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate("EditHabit", { habitId });
  }, [navigation, habitId]);
  
  const handleViewAllPress = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const isCompleted = habitCompletionsMap.get(today) ?? false;
    
    setSelectedDate(today);
    setSelectedCompleted(isCompleted);
    setDayDetailVisible(true);
  }, [habitCompletionsMap]);
  
  const statsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value
  }));
  
  useEffect(() => {
    fetchHabitData();
  }, [fetchHabitData]);
  
  if (loading || !habit || !stats) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h4">Loading...</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ThemedView>
    );
  }
  
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Detail</ThemedText>
        <Pressable onPress={() => setMenuVisible(!menuVisible)} hitSlop={8}>
          <Feather name="more-vertical" size={24} color={theme.text} />
        </Pressable>
      </View>
      
      {/* Menu Dropdown */}
      {menuVisible && (
        <Animated.View 
          entering={FadeIn}
          style={[styles.menuDropdown, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Pressable style={styles.menuItem} onPress={handleEdit}>
            <Feather name="edit" size={16} color={theme.text} />
            <ThemedText style={styles.menuText}>Edit Habit</ThemedText>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => setMenuVisible(false)}>
            <Feather name="x" size={16} color={theme.text} />
            <ThemedText style={styles.menuText}>Close</ThemedText>
          </Pressable>
        </Animated.View>
      )}
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* ZONE 1: Summary - Hero Section */}
        <Animated.View 
          style={headerAnimatedStyle}
          entering={FadeInUp.delay(100)}
        >
          <View style={[styles.heroSection, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.habitIconContainerLarge, { backgroundColor: habit.color + "20" }]}>
              <Feather name={habit.icon as any} size={32} color={habit.color} />
            </View>
            
            <View style={styles.statusPill}>
              <View style={[styles.statusIndicator, { backgroundColor: 
                habit.active ? theme.success : theme.textSecondary
              }]} />
              <ThemedText type="small">
                {habit.active ? 'Active' : 'Inactive'}
              </ThemedText>
            </View>
            
            <ThemedText type="h2" style={styles.habitName}>
              {habit.name}
            </ThemedText>
          </View>
        </Animated.View>
        
        {/* ZONE 2: Analytics - Stats Cards */}
        <Animated.View 
          style={[styles.statsSection, statsAnimatedStyle]}
          entering={FadeInUp.delay(300)}
        >
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="zap" size={20} color={theme.primary} />
              <ThemedText type="caption" secondary style={styles.statLabel}>
                Streak
              </ThemedText>
              <ThemedText type="h3" style={[styles.statValue, { color: theme.primary }]}>
                {stats.streak}
              </ThemedText>
              <ThemedText type="caption" secondary>days</ThemedText>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="bar-chart-2" size={20} color={theme.success} />
              <ThemedText type="caption" secondary style={styles.statLabel}>
                Consistency
              </ThemedText>
              <ThemedText type="h3" style={[styles.statValue, { color: theme.success }]}>
                {stats.consistency}%
              </ThemedText>
              <ThemedText type="caption" secondary>30 days</ThemedText>
            </View>
          </View>
        </Animated.View>
        
        {/* Weekly Progress */}
        <Animated.View 
          entering={FadeInUp.delay(500)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <ThemedText type="title">This Week</ThemedText>
            <Pressable onPress={handleViewAllPress} hitSlop={8}>
              <ThemedText type="small" style={{ color: theme.primary }}>View All</ThemedText>
            </Pressable>
          </View>
          
          <View style={styles.weeklyGrid}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const isCompleted = stats.weeklyCompletions.includes(index);
              const isToday = index === (new Date().getDay() + 6) % 7;
              
              return (
                <View 
                  key={day}
                  style={[
                    styles.dayCircle,
                    {
                      backgroundColor: isCompleted 
                        ? theme.success + '20' 
                        : isToday 
                          ? 'transparent' 
                          : theme.backgroundSecondary,
                      borderColor: isToday ? theme.primary : 'transparent',
                      borderWidth: isToday ? 2 : 0
                    }
                  ]}
                >
                  {isCompleted ? (
                    <Feather name="check" size={14} color={theme.success} />
                  ) : (
                    <ThemedText type="caption" secondary={!isToday}>
                      {day.charAt(0)}
                    </ThemedText>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>
        
        {/* Monthly Overview */}
        <Animated.View 
          entering={FadeInUp.delay(700)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="title">Monthly Overview</ThemedText>
              <ThemedText type="caption" secondary>
                Last 30 Days
              </ThemedText>
            </View>
          </View>
          
          <View style={[styles.chartContainer, { backgroundColor: theme.backgroundDefault }]}>
            {Object.entries(stats.monthlyCompletions).map(([week, count], index) => (
              <View key={week} style={styles.chartBarContainer}>
                <View 
                  style={[
                    styles.chartBar,
                    { 
                      height: `${Math.max((count / 7) * 100, 10)}%`,
                      backgroundColor: theme.primary
                    }
                  ]}
                />
                <ThemedText type="caption" secondary>
                  {week.replace('Week ', 'W')}
                </ThemedText>
              </View>
            ))}
            {Object.keys(stats.monthlyCompletions).length === 0 && (
              <ThemedText type="body" secondary style={styles.noDataText}>
                No completions this month
              </ThemedText>
            )}
          </View>
        </Animated.View>
      </ScrollView>
      
      {/* Day Detail Modal */}
      <DayDetailModal
        visible={dayDetailVisible}
        onClose={() => setDayDetailVisible(false)}
        date={selectedDate}
        habit={habit}
        completed={selectedCompleted}
        completions={habitCompletionsMap}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  menuDropdown: {
    position: 'absolute',
    right: Spacing.lg,
    top: 60,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    elevation: 5,
    zIndex: 1000,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  menuText: { marginLeft: Spacing.sm, fontWeight: '500' },
  content: { flex: 1 },
  
  // Hero Section
  heroSection: { alignItems: 'center', padding: Spacing.xl, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.xl },
  habitIconContainerLarge: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: 20, marginBottom: Spacing.md },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.xs },
  habitName: { textAlign: 'center' },
  
  // Stats Section
  statsSection: { marginHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, padding: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center' },
  statLabel: { marginTop: Spacing.xs, marginBottom: Spacing.xs },
  statValue: { marginBottom: Spacing.xs },
  
  // Section
  section: { marginHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  
  // Weekly Grid
  weeklyGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  
  // Monthly Chart
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', padding: Spacing.lg, borderRadius: BorderRadius.lg, minHeight: 120 },
  chartBarContainer: { alignItems: 'center', flex: 1 },
  chartBar: { width: 24, borderRadius: 4, minHeight: 8 },
  noDataText: { textAlign: 'center', padding: Spacing.xl },
  
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  modalContent: { flex: 1, paddingHorizontal: Spacing.lg },
  habitInfo: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.xl },
  habitIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  habitDetails: { flex: 1 },
  modalStatusIndicator: { width: 12, height: 12, borderRadius: 6 },
  monthGridContainer: { marginBottom: Spacing.xl },
  monthGridTitle: { marginBottom: Spacing.md },
  dotsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dotWrapper: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayDot: { justifyContent: 'center', alignItems: 'center' },
  dayNumber: { fontSize: 10 },
});

const headerAnimatedStyle = {};

// Need to add proper animation import
import { useAnimatedStyle as useHeaderAnimatedStyle } from "react-native-reanimated";
