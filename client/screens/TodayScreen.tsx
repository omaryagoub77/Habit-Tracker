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
  if (pct <= 0) return "Let's get started! You've got this.";
  if (pct >= 100) return "Amazing work! You've crushed your goals for today!";
  if (pct <= 50) return "Great start! One step at a time.";
  return "You're over halfway there! Keep pushing.";
}

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onStartTimer: () => void;
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
  onEdit, 
  onStartTimer, 
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
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
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

  let subtitle = '';
  if (habit.name === 'Drink Water') {
    subtitle = 'Target: 2000ml';
  } else if (habit.name === 'Read for 20 mins') {
    subtitle = '5 day streak';
  } else if (habit.name === 'Morning Workout') {
    subtitle = 'High Intensity';
  } else if (isCompleted) {
    subtitle = 'Completed at 7:30 AM';
  }

  return (
    <AnimatedPressable
      style={[
        styles.habitCard,
        { backgroundColor: theme.backgroundSecondary },
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
            { backgroundColor: habit?.color + "20" },
          ]}
        >
          <Feather name={(habit?.icon || 'activity') as any} size={20} color={habit?.color} />
        </View>
        <View style={styles.habitInfo}>
          <ThemedText
            type="body"
            style={[styles.habitName, isCompleted && styles.habitCompleted]}
          >
            {habit?.name || 'Unknown Habit'}
          </ThemedText>
          {subtitle && (
            <ThemedText
              type="small"
              secondary
              style={styles.habitSubtitle}
            >
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={styles.habitActions}>
        <Pressable
          style={[styles.detailButton, { backgroundColor: theme.backgroundSecondary }]}
          onPress={onViewDetail}
        >
          <Feather name="info" size={20} color={theme.text} />
        </Pressable>
        <Pressable
          style={[styles.playButton, { backgroundColor: theme.primary }]}
          onPress={onStartTimer}
        >
          <Feather name="play" size={14} color="#FFFFFF" />
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
          {isCompleted ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
        </Pressable>
      </View>
    </AnimatedPressable>
  );
});

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
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
              // Use the deleteHabit function from the hook
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
  }, [selectedHabitIds, refreshHabits, exitSelectionMode]);

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

  const handleStartTimer = useCallback((habitId: number) => {
    if (isSelectionMode) return;
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      navigation.navigate('HabitTimer', { 
        habitId: habitId.toString(), 
        habitName: habit.name 
      });
    }
  }, [navigation, habits, isSelectionMode]);

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
  
  const handleLegacyEdit = useCallback(() => {}, []);

  const habitCards = useMemo(() => habits.map((habit) => (
    <HabitCard
      key={habit.id}
      habit={habit}
      isCompleted={completions.get(habit.id) || false}
      isSelected={selectedHabitIds.has(habit.id)}
      isSelectionMode={isSelectionMode}
      onToggle={() => memoizedToggleCompletion(habit.id)}
      onEdit={handleLegacyEdit}
      onStartTimer={() => handleStartTimer(habit.id)}
      onViewDetail={() => handleViewDetail(habit.id)}
      onSelect={() => toggleHabitSelection(habit.id)}
      onEnterSelectionMode={() => enterSelectionMode(habit.id)}
    />
  )), [
    habits, 
    completions, 
    memoizedToggleCompletion, 
    handleStartTimer, 
    handleViewDetail, 
    selectedHabitIds, 
    isSelectionMode, 
    toggleHabitSelection, 
    enterSelectionMode,
    handleLegacyEdit
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
                <ThemedText style={{fontWeight: '600', color: theme.text}}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <ThemedText type="body" style={{fontWeight: '600'}}>
                {selectedHabitIds.size} Selected
              </ThemedText>

              <View style={styles.selectionActions}>
                <TouchableOpacity 
                  onPress={handleEditSelected}
                  disabled={selectedHabitIds.size !== 1}
                  style={{ opacity: selectedHabitIds.size === 1 ? 1 : 0.3 }}
                >
                  <Feather name="edit-2" size={24} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleDeleteSelected}
                  disabled={selectedHabitIds.size === 0}
                  style={{ opacity: selectedHabitIds.size > 0 ? 1 : 0.3 }}
                >
                  <Feather name="trash-2" size={24} color={theme.statusError || '#FF3B30'} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.topBar}>
              <Feather name="grid" size={24} color={theme.text} />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                hitSlop={10}
                // Settings is a tab route (SettingsTab) in MainTabNavigator, not a RootStack route.
                // Navigate to the tab so we don't crash / miss providers.
                onPress={() => navigation.navigate('SettingsTab' as any)}
                style={styles.avatarContainer}
              >
                <Feather name="user" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
          )}

          {!isSelectionMode && (
            <>
              <ThemedText type="small" secondary style={styles.dateText}>
                {getCurrentDateInfo().formattedDate}
              </ThemedText>
              <View style={styles.greeting}>
                <ThemedText style={[styles.greetingText, { color: theme.primary }]}>{getGreetingMessage()},</ThemedText>
                <ThemedText style={styles.greetingName}> {settings?.displayName || 'User'}</ThemedText>
              </View>
            </>
          )}
        </View>
      </View>
      
      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: 120 + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
      >

        <ThemedView style={[styles.progressContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="small" secondary>Today's Focus</ThemedText>
          <View style={styles.progressInfo}>
            <ThemedText style={styles.encourageText}>{encourageText}</ThemedText>
            <ThemedText style={styles.percentage}>{percentage}%</ThemedText>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          </View>
          <View style={styles.progressStats}>
            <ThemedText type="small" secondary>{completedCount}/{total} habits completed</ThemedText>
            <ThemedText type="small" secondary>{total - completedCount} remaining</ThemedText>
          </View>
        </ThemedView>

        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="sunrise" size={64} color={theme.textSecondary} />
            <ThemedText type="body" secondary style={styles.emptyText}>
              No habits yet. Tap + to create one.
            </ThemedText>
          </View>
        ) : (
          <>
            <ThemedText type="small" secondary style={styles.sectionTitle}>
              Your Habits
            </ThemedText>
            {habitCards}
          </>
        )}
      </ScrollView>
      
      {!isSelectionMode && (
        <Pressable
          style={[styles.floatingAddButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate("NewHabit")}
        >
          <Feather name="plus" size={32} color="#FFFFFF" />
        </Pressable>
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
    marginBottom: Spacing.xl,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    height: 40,
  },
  selectionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    height: 40, 
  },
  selectionActions: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  greeting: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.xl,
  },
  greetingText: {
    fontSize: 25,
    fontWeight: "bold",
  },
  greetingName: {
    fontSize: 25,
    fontWeight: "bold",
  },
  progressContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  encourageText: {
    flex: 1,
  },
  percentage: {
    fontWeight: "bold",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#003D3D", 
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00FF7F", 
    borderRadius: 2,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent', 
  },
  habitCardSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  habitContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  habitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    marginBottom: Spacing.xs,
  },
  habitSubtitle: {},
  habitCompleted: {
    textDecorationLine: "line-through",
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
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.xs,
  },
  playButton: {
    width: 24,
    height: 24,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
      marginRight: Spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyText: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  floatingAddButton: {
    position: "absolute",
    bottom: 115,
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00FF7F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#003D3D",
  },
  navItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
});
