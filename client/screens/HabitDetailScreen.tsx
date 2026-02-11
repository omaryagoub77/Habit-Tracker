import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
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
  withSpring,
  withTiming,
  FadeInUp,
  FadeIn,
  Layout,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useDatabase } from "@/hooks/useDatabase";
import { db } from '@/database/DatabaseService';
import { Habit, HabitCompletion } from '@/database/DatabaseService';
import { TimeTrackingService } from '@/services/TimeTrackingService';
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
  duration?: number;
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
  
  // Get the first day of the month
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay();
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push('');
  }
  
  // Add all days of the month
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
  
  // Get all days in the current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  
  return (
    <View style={styles.dotsGrid}>
      {daysInMonth.map((date, index) => {
        if (!date) {
          // Empty cell for days before the first day of the month
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
                <Feather name="check" size={16} color={theme.success} />
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
          <View style={[styles.habitInfo, { backgroundColor: theme.backgroundSecondary }]}>
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
            <ThemedText type="h4" style={styles.monthGridTitle}>Monthly Progress</ThemedText>
            <ScrollView style={{ marginTop: Spacing.md }}>
              <MonthDetailGrid habit={habit} completions={completions} />
            </ScrollView>
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

// Animated Components
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Main Component
export default function HabitDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, "HabitDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { isInitialized } = useDatabase();
  
  const { habitId } = route.params;
  
  // State
  const [habit, setHabit] = useState<Habit | null>(null);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [sessions, setSessions] = useState<CompletionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [dayDetailVisible, setDayDetailVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCompleted, setSelectedCompleted] = useState<boolean | null>(null);
  const [habitCompletionsMap, setHabitCompletionsMap] = useState<Map<string, boolean>>(new Map());
  
  // Animated values
  const headerScale = useSharedValue(1);
  const statsOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  
  // Get today's date string
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  
  // Fetch habit data
  const fetchHabitData = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      setLoading(true);
      
      // Fetch habit
      const habitData = await db.getHabitById(habitId);
      if (!habitData) {
        navigation.goBack();
        return;
      }
      setHabit(habitData);
      
      // Fetch completions for stats calculation
      // Get all completions for this habit in the last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const completions = await db.getCompletionsForHabitInRange(
        habitId, 
        ninetyDaysAgo.toISOString().split("T")[0],
        new Date().toISOString().split("T")[0]
      );
      
      // Create a map of all completions for the month
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
      
      // Fill in missing days with false values
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
      
      // Calculate stats
      const calculatedStats = calculateStats(completions, habitData);
      setStats(calculatedStats);
      
      // Process sessions for history log
      // Fetch actual session data from TimeTrackingService
      const sessionData = await TimeTrackingService.getSessionHistory(habitId, 10);
      
      // Map session data to completion sessions
      const mappedSessions = sessionData.map(session => ({
        id: session.id || Math.random(),
        date: session.createdDate,
        duration: session.durationSeconds,
        completed: true, // All saved sessions are completed
        createdAt: session.endedAt,
        mode: session.mode
      })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setSessions(mappedSessions);
      
      // Animate in stats
      setTimeout(() => {
        statsOpacity.value = withTiming(1, { duration: 500 });
      }, 300);
      
    } catch (error) {
      console.error("Error fetching habit data:", error);
    } finally {
      setLoading(false);
    }
  }, [habitId, isInitialized, navigation, today, statsOpacity]);
  
  // Calculate habit statistics
  const calculateStats = (completions: { date: string; completed: boolean }[], habit: Habit): HabitStats => {
    // Current streak calculation
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
    
    // Last 30 days consistency
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCompletions = completions.filter((c: any) => 
      new Date(c.date) >= thirtyDaysAgo && c.completed
    );
    const consistency = Math.round((recentCompletions.length / 30) * 100);
    
    // Weekly completions (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyCompletions = completions
      .filter((c: any) => new Date(c.date) >= weekAgo && c.completed)
      .map((c: any) => {
        const dayIndex = (new Date(c.date).getDay() + 6) % 7; // Monday = 0
        return dayIndex;
      });
    
    // Monthly completions grouped by calendar week of the month
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
  
  // Menu actions
  const handleEdit = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate("EditHabit", { habitId });
  }, [navigation, habitId]);
  
  const handlePauseResume = useCallback(() => {
    setMenuVisible(false);
    // Implement pause/resume logic
  }, []);
  
  const handleDelete = useCallback(() => {
    setMenuVisible(false);
    // Implement delete logic
  }, []);
  
  // Handle "View All" button press - open modal with today's date
  const handleViewAllPress = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const isCompleted = habitCompletionsMap.get(today) ?? false;
    
    setSelectedDate(today);
    setSelectedCompleted(isCompleted);
    setDayDetailVisible(true);
  }, [habitCompletionsMap]);
  
  // Animated styles
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }]
  }));
  
  const statsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value
  }));
  
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));
  
  // Effects
  useEffect(() => {
    fetchHabitData();
  }, [fetchHabitData]);
  
  // Loading state
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
  
  // Calculate max completions for scaling the monthly chart
  const maxMonthlyCompletions = Math.max(
    ...Object.values(stats.monthlyCompletions),
    1 // Avoid division by zero
  );
  
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">Detail</ThemedText>
        <Pressable onPress={() => setMenuVisible(!menuVisible)}>
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
          <Pressable style={styles.menuItem} onPress={handlePauseResume}>
            <Feather name="pause" size={16} color={theme.text} />
            <ThemedText style={styles.menuText}>Pause / Resume</ThemedText>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={handleDelete}>
            <Feather name="trash-2" size={16} color={theme.error} />
            <ThemedText style={[styles.menuText, { color: theme.error }]}>Delete Habit</ThemedText>
          </Pressable>
        </Animated.View>
      )}
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Habit Hero Section */}
        <Animated.View 
          style={headerAnimatedStyle}
          entering={FadeInUp.delay(100)}
        >
          <View style={[styles.heroSection, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.habitIconContainer, { backgroundColor: habit.color + "20" }]}>
              <Feather name={habit.icon as any} size={32} color={habit.color} />
            </View>
            
            <View style={styles.statusPill}>
              <View style={[styles.statusIndicator, { backgroundColor: 
                habit.active ? theme.success : theme.textSecondary
              }]} />
              <ThemedText type="small" style={{ textTransform: 'capitalize' }}>
                {habit.active ? 'active' : 'inactive'}
              </ThemedText>
            </View>
            
            <ThemedText type="h2" style={styles.habitName}>
              {habit.name}
            </ThemedText>
            
            <View style={styles.goalInfo}>
              <Feather name="target" size={16} color={theme.textSecondary} />
              <ThemedText type="body" secondary style={{ marginLeft: Spacing.xs }}>
                {`Daily Habit: ${habit.name}`}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
        
        {/* Stats Cards */}
        <Animated.View 
          style={[styles.statsSection, statsAnimatedStyle]}
          entering={FadeInUp.delay(300)}
        >
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="trending-up" size={24} color={theme.primary} />
              <ThemedText type="small" secondary style={styles.statLabel}>
                Streak
              </ThemedText>
              <ThemedText type="h3" style={styles.statValue}>
                {stats.streak}
              </ThemedText>
              <ThemedText type="small" secondary>
                days
              </ThemedText>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="bar-chart-2" size={24} color={theme.primary} />
              <ThemedText type="small" secondary style={styles.statLabel}>
                Consistency
              </ThemedText>
              <ThemedText type="h3" style={styles.statValue}>
                {stats.consistency}%
              </ThemedText>
            </View>
          </View>
        </Animated.View>
        
        {/* Total Time Spent */}
        <Animated.View 
          entering={FadeInUp.delay(600)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">Time Spent</ThemedText>
            <Pressable>
              <ThemedText type="small" style={{ color: theme.primary }}>
                View All
              </ThemedText>
            </Pressable>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}> 
            <ThemedText type="h3" style={styles.statValue}>
              {(() => {
                const totalSeconds = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
                const totalMinutes = Math.floor(totalSeconds / 60);
                const remainingSeconds = totalSeconds % 60;
                return totalMinutes > 0 ? 
                  `${totalMinutes}m ${remainingSeconds > 0 ? remainingSeconds + 's' : ''}`.trim() : 
                  `${remainingSeconds}s`;
              })()}
            </ThemedText>
            <ThemedText type="small" secondary>
              total time
            </ThemedText>
          </View>
        </Animated.View>
        
        {/* Start Button */}
        <Animated.View 
          entering={FadeInUp.delay(500)}
          style={styles.startButtonContainer}
        >
          <AnimatedPressable
            style={[
              styles.startButton,
              { 
                backgroundColor: theme.primary,
                transform: [{ scale: buttonScale.value }]
              }
            ]}
            onPressIn={() => {
              buttonScale.value = withSpring(0.98);
            }}
            onPressOut={() => {
              buttonScale.value = withSpring(1);
            }}
            onPress={() => {
              navigation.navigate('HabitTimer', { 
                habitId: habitId.toString(), 
                habitName: habit.name 
              });
            }}
          >
            <Feather name="play" size={24} color="#FFFFFF" />
            <ThemedText style={styles.startButtonText}>
              Start
            </ThemedText>
          </AnimatedPressable>
        </Animated.View>
        
        {/* Weekly Progress */}
        <Animated.View 
          entering={FadeInUp.delay(700)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">This Week</ThemedText>
            <Pressable onPress={handleViewAllPress}>
              <ThemedText type="small" style={{ color: theme.primary }}>
                View All
              </ThemedText>
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
                    <Feather name="check" size={16} color={theme.success} />
                  ) : (
                    <ThemedText type="small" secondary={!isToday}>
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
          entering={FadeInUp.delay(900)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Monthly Overview</ThemedText>
              <ThemedText type="small" secondary>
                Last 30 Days
              </ThemedText>
            </View>
            <View style={styles.trendBadge}>
              <ThemedText type="small" style={{ color: theme.success }}>
                +12%
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.chartContainer}>
            {Object.entries(stats.monthlyCompletions).map(([week, count], index) => (
              <View key={week} style={styles.chartBarContainer}>
                <View 
                  style={[
                    styles.chartBar,
                    { 
                      height: `${(count / maxMonthlyCompletions) * 100}%`,
                      backgroundColor: theme.primary + (0.3 + (index * 0.15))
                    }
                  ]}
                />
                <ThemedText type="small" secondary>
                  {week}
                </ThemedText>
              </View>
            ))}
          </View>
        </Animated.View>
        
        {/* History Log */}
        <Animated.View 
          entering={FadeInUp.delay(1100)}
          style={styles.section}
        >
          <ThemedText type="h4" style={styles.sectionTitle}>
            History
          </ThemedText>
          
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="clock" size={48} color={theme.textSecondary} />
              <ThemedText type="body" secondary style={{ textAlign: 'center', marginTop: Spacing.md }}>
                No sessions recorded yet
              </ThemedText>
            </View>
          ) : (
            sessions.slice(0, 10).map((session) => (
              <View 
                key={session.id}
                style={[styles.historyItem, { backgroundColor: theme.backgroundSecondary }]}
              >
                <View style={styles.historyIcon}>
                  {session.completed ? (
                    <Feather name="check-circle" size={20} color={theme.success} />
                  ) : (
                    <Feather name="x-circle" size={20} color={theme.error} />
                  )}
                </View>
                
                <View style={styles.historyContent}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>
                    Time spent
                  </ThemedText>
                  <ThemedText type="small" secondary>
                    {getTimeAgo(session.createdAt)}
                  </ThemedText>
                </View>
                
                <View style={styles.historyDuration}>
                  {session.duration ? (
                    <ThemedText type="small">
                      {Math.floor(session.duration / 60)}m {session.duration % 60}s
                    </ThemedText>
                  ) : (
                    <ThemedText type="small" secondary>
                      —
                    </ThemedText>
                  )}
                </View>
              </View>
            ))
          )}
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuDropdown: {
    position: 'absolute',
    right: Spacing.lg,
    top: 60,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  menuText: {
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: Spacing.xl,
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  habitIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    marginBottom: Spacing.lg,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  habitName: {
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statLabel: {
    marginBottom: Spacing.xs,
  },
  statValue: {
    marginBottom: Spacing.xs,
  },
  startButtonContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    width: '50%',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  weeklyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: Spacing.lg,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 30,
    borderRadius: 4,
    marginBottom: Spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  historyIcon: {
    marginRight: Spacing.md,
  },
  historyContent: {
    flex: 1,
  },
  historyDuration: {
    alignItems: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  habitDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  monthGridContainer: {
    marginBottom: Spacing.lg,
  },
  monthGridTitle: {
    marginBottom: Spacing.md,
  },
  // Month grid styles
  dotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginTop: Spacing.sm,
  },
  dotWrapper: {
    width: '14.28%', // 7 columns
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dayDot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
});