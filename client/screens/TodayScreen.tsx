import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  BackHandler,
  TouchableOpacity
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useDatabase, useHabits, useHabitCompletions, useUserSettings } from "@/hooks/useDatabase";
import { Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { Habit } from '@/database/DatabaseService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

function getCurrentDateInfo(): { formattedDate: string } {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
  return { formattedDate };
}

function getGreetingMessage(): string {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good Evening';
  } else {
    return 'Good Night';
  }
}

function getEncouragementText(completionPercentage: number): string {
  // Be defensive against NaN / weird values
  const pct = Number.isFinite(completionPercentage) ? completionPercentage : 0;
  if (pct <= 0) return "Let's get started. You've got this.";
  if (pct >= 100) return "Well done. You've completed all your goals.";
  if (pct <= 50) return "Great start. One step at a time.";
  return "You're making progress. Keep going.";
}

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggle: () => void;
  onViewDetail: () => void;
  onSelect: () => void;
  onEnterSelectionMode: () => void;
}

const HabitCard = memo(({ 
  habit, 
  isCompleted, 
  isSelected,
  isSelectionMode,
  onToggle, 
  onViewDetail,
  onSelect,
  onEnterSelectionMode
}: HabitCardProps) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.99, { damping: 15, stiffness: 150 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const handlePress = useCallback(async () => {
    if (isSelectionMode) {
      onSelect();
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggle();
    }
  }, [isSelectionMode, onSelect, onToggle]);

  const handleLongPress = useCallback(async () => {
    if (isSelectionMode) {
      onSelect();
    } else {
      await Haptics.selectionAsync();
      onEnterSelectionMode();
    }
  }, [isSelectionMode, onSelect, onEnterSelectionMode]);

  return (
    <AnimatedPressable
      style={[
        styles.habitCard,
        { backgroundColor: theme.backgroundDefault },
        isSelected && styles.habitCardSelected,
        animatedStyle,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={300}
    >
      <View style={styles.habitContent}>
        <View
          style={[
            styles.habitIconContainer,
            { backgroundColor: (habit?.color || '#4A7C59') + "20" },
          ]}
        >
          <Feather name={(habit?.icon || 'activity') as any} size={20} color={habit?.color || '#4A7C59'} />
        </View>
        <View style={styles.habitInfo}>
          <ThemedText
            type="body"
            style={[styles.habitName, isCompleted && styles.habitCompleted]}
          >
            {habit?.name || 'Unknown Habit'}
          </ThemedText>
        </View>
      </View>
      <View style={styles.habitActions}>
        <Pressable
          style={[styles.detailButton, { backgroundColor: theme.backgroundSecondary }]}
          onPress={onViewDetail}
          hitSlop={8}
        >
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </Pressable>
        <Pressable
          style={[
            styles.checkbox,
            {
              borderColor: isCompleted ? theme.primary : theme.border,
              backgroundColor: isCompleted ? theme.primary : "transparent",
            },
          ]}
          onPress={handlePress}
        >
          {isCompleted ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
        </Pressable>
      </View>
    </AnimatedPressable>
  );
});

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, isDark } = useTheme();
  const { isInitialized, isLoading: dbLoading } = useDatabase();
  const { habits, isLoading: habitsLoading, refresh: refreshHabits, deleteHabit } = useHabits();
  const { settings } = useUserSettings();
  const today = getTodayString();
  const {
    completions,
    isLoading: completionsLoading,
    toggleCompletion,
    refresh: refreshCompletions,
  } = useHabitCompletions(today);

  // --- Selection State ---
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedHabitIds, setSelectedHabitIds] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      if (isInitialized) {
        refreshHabits();
        refreshCompletions();
      }
    }, [isInitialized, refreshHabits, refreshCompletions])
  );

  const isLoading = dbLoading || habitsLoading || completionsLoading;

  const completedCount = useMemo(() => Array.from(completions.values()).filter(Boolean).length, [completions]);
  const total = habits.length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const encourageText = getEncouragementText(percentage);

  // --- Selection Helpers ---

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedHabitIds(new Set());
  }, []);

  const enterSelectionMode = useCallback((habitId: number) => {
    setIsSelectionMode(true);
    setSelectedHabitIds(new Set([habitId]));
  }, []);

  const toggleHabitSelection = useCallback((habitId: number) => {
    Haptics.selectionAsync();
    setSelectedHabitIds(prev => {
      const next = new Set(prev);
      next.has(habitId) ? next.delete(habitId) : next.add(habitId);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const count = selectedHabitIds.size;
    Alert.alert(
      'Delete Habits',
      `Are you sure you want to delete ${count} habit(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedHabitIds) {
                await deleteHabit(id);
              }
              exitSelectionMode();
            } catch (e) {
              console.error("Failed to delete habits", e);
              Alert.alert("Error", "Failed to delete habits.");
            }
          }
        }
      ]
    );
  }, [selectedHabitIds, deleteHabit, exitSelectionMode]);

  const handleEditSelected = useCallback(() => {
    if (selectedHabitIds.size === 1) {
      const habitId = Array.from(selectedHabitIds)[0];
      navigation.navigate("EditHabit", { habitId });
      exitSelectionMode();
    }
  }, [selectedHabitIds, navigation, exitSelectionMode]);

  // --- Back Handler (Android) ---
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isSelectionMode) {
          exitSelectionMode();
          return true;
        }
        return false;
      };
      
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [isSelectionMode, exitSelectionMode])
  );

  // --- Existing Handlers ---

  const handleViewDetail = useCallback((habitId: number) => {
    if (isSelectionMode) return;
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
      Alert.alert('Error', 'Habit not found. Please try again.');
      return;
    }
    navigation.navigate('HabitDetail', { habitId });
  }, [navigation, habits, isSelectionMode]);

  const memoizedToggleCompletion = useCallback(toggleCompletion, [toggleCompletion]);
  
  const habitCards = useMemo(() => habits.map((habit) => (
    <HabitCard
      key={habit.id}
      habit={habit}
      isCompleted={completions.get(habit.id) || false}
      isSelected={selectedHabitIds.has(habit.id)}
      isSelectionMode={isSelectionMode}
      onToggle={() => memoizedToggleCompletion(habit.id)}
      onViewDetail={() => handleViewDetail(habit.id)}
      onSelect={() => toggleHabitSelection(habit.id)}
      onEnterSelectionMode={() => enterSelectionMode(habit.id)}
    />
  )), [
    habits, 
    completions, 
    memoizedToggleCompletion,
    handleViewDetail, 
    selectedHabitIds, 
    isSelectionMode, 
    toggleHabitSelection, 
    enterSelectionMode
  ]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: insets.top }}>
        {/* Fixed Header - Always visible */}
        <View style={[styles.header, { paddingHorizontal: Spacing.lg, backgroundColor: theme.backgroundRoot }]}> 
          {isSelectionMode ? (
            <View style={styles.selectionBar}>
              <TouchableOpacity onPress={exitSelectionMode} hitSlop={10}>
                <ThemedText style={{fontWeight: '500', color: theme.text}}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <ThemedText type="body" style={{fontWeight: '500'}}>
                {selectedHabitIds.size} Selected
              </ThemedText>

              <View style={styles.selectionActions}>
                <TouchableOpacity 
                  onPress={handleEditSelected}
                  disabled={selectedHabitIds.size !== 1}
                  style={{ opacity: selectedHabitIds.size === 1 ? 1 : 0.3 }}
                >
                  <Feather name="edit-2" size={20} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleDeleteSelected}
                  disabled={selectedHabitIds.size === 0}
                  style={{ opacity: selectedHabitIds.size > 0 ? 1 : 0.3 }}
                >
                  <Feather name="trash-2" size={20} color={theme.error} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.topBar}>
              <ThemedText type="caption" secondary style={styles.dateText}>
                {getCurrentDateInfo().formattedDate}
              </ThemedText>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                hitSlop={10}
                onPress={() => navigation.navigate('SettingsTab' as any)}
                style={styles.settingsButton}
              >
                <Feather name="settings" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {!isSelectionMode && (
            <View style={styles.greetingContainer}>
              <ThemedText style={[styles.greetingText, { color: theme.text }]}>
                {getGreetingMessage()},{' '}
                <ThemedText style={{ color: theme.primary }}>{settings?.displayName || 'User'}</ThemedText>
              </ThemedText>
            </View>
          )}
        </View>
      </View>
      
      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: 100 + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
      >

        {/* Progress Section - Emotional Anchor */}
        <View style={[styles.progressContainer, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.progressHeader}>
            <ThemedText type="small" secondary>Today's Focus</ThemedText>
            <ThemedText style={[styles.percentage, { color: theme.primary }]}>{percentage}%</ThemedText>
          </View>
          <ThemedText type="h3" style={styles.encourageText}>{encourageText}</ThemedText>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: theme.primary }]} />
            </View>
          </View>
          <View style={styles.progressStats}>
            <ThemedText type="caption" secondary>{completedCount} of {total} completed</ThemedText>
            {total - completedCount > 0 && (
              <ThemedText type="caption" secondary>{total - completedCount} remaining</ThemedText>
            )}
          </View>
        </View>

        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="check-circle" size={48} color={theme.textSecondary} />
            </View>
            <ThemedText type="body" secondary style={styles.emptyText}>
              No habits yet
            </ThemedText>
            <ThemedText type="small" secondary style={styles.emptySubtext}>
              Tap + to create your first habit
            </ThemedText>
          </View>
        ) : (
          <>
            <ThemedText type="caption" secondary style={styles.sectionTitle}>
              Your Habits
            </ThemedText>
            <View style={styles.habitsList}>
              {habitCards}
            </View>
          </>
        )}
      </ScrollView>
      
      {!isSelectionMode && (
        <View style={[styles.fabContainer, { bottom: 130 }]}>
          <Pressable
            style={[
              styles.floatingAddButton,
              { backgroundColor: theme.primary },
              {
                shadowColor: isDark ? theme.shadowDark : theme.shadowLight,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.4 : 0.15,
                shadowRadius: 8,
                elevation: isDark ? 8 : 4,
              },
            ]}
            onPress={() => navigation.navigate("NewHabit")}
          >
            <Feather name="plus" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    
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
  header: {
    zIndex: 10,
    marginBottom: Spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  dateText: {
    letterSpacing: 1,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  greetingContainer: {
    marginTop: Spacing.xs,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  selectionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  selectionActions: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  // Progress Section
  progressContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  percentage: {
    fontSize: 24,
    fontWeight: "600",
  },
  encourageText: {
    marginBottom: Spacing.lg,
  },
  progressBarContainer: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  // Habits Section
  sectionTitle: {
    letterSpacing: 1,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
  },
  habitsList: {
    gap: Spacing.md,
  },
  // Habit Card - Refined Design
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  habitCardSelected: {
    borderWidth: 2,
    borderColor: undefined, // Will use theme primary
  },
  habitContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  habitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: "500",
  },
  habitCompleted: {
    opacity: 0.6,
  },
  habitActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  detailButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  // Empty State - Elegant
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyText: {
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    opacity: 0.7,
  },
  // FAB - Reduced weight
  fabContainer: {
    position: "absolute",
    right: Spacing.lg,
  },
  floatingAddButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
