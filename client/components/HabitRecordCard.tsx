import React, { memo, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Habit } from "@/database/DatabaseService";
import { Spacing, BorderRadius } from "@/constants/theme";

interface HabitData {
  habit: Habit;
  completions: Map<string, boolean>;
}

interface HabitCardProps {
  habitData: HabitData;
  dateRange: string[];
  monthGroups: { month: string; dates: string[]; isCurrentMonth: boolean }[];
  dotSize: number;
  handleDotPress: (date: string, habit: Habit, completed: boolean) => void;
}

// Helper functions
function formatDate(dateString: string): { day: string; month: string } {
  const date = new Date(dateString + "T12:00:00");
  return {
    day: date.getDate().toString(),
    month: date.toLocaleString("default", { month: "short" }),
  };
}

function getCurrentMonth(): string {
  return new Date().toLocaleString("default", { month: "short" });
}

// Memoized Habit Card Component
const HabitCardComponent: React.FC<HabitCardProps> = ({
  habitData,
  dateRange,
  monthGroups,
  dotSize,
  handleDotPress,
}) => {
  const { theme } = useTheme();

  // Helper to get subtitle (placeholder logic based on image)
  const getHabitSubtitle = (habit: Habit) => {
    // Fallbacks to make the UI look populated like the screenshot
    const placeholders = ["Stay consistent", "Every day", "Keep it up", "Focus on this"];
    return placeholders[habit.id % placeholders.length];
  };

  return (
    <View 
      style={[styles.habitCard, { backgroundColor: theme.backgroundSecondary }]}
    >
      {/* Card Header (Icon + Text) */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: habitData.habit?.color + '20' }]}> 
          <Feather name={(habitData.habit?.icon || 'activity') as any} size={20} color={habitData.habit?.color} />
        </View>
        <View style={styles.cardText}>
          <ThemedText type="body" style={styles.cardTitle}>{habitData.habit?.name || 'Unknown Habit'}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {getHabitSubtitle(habitData.habit)}
          </ThemedText>
        </View>
      
      </View>
            
      {/* Month Label Under Habit */}
      <View style={styles.monthUnderHabitContainer}>
        <ThemedText 
          type="caption" 
          style={[
            styles.monthLabel, 
            { 
              color: theme.textSecondary,
              fontWeight: '500',
              textAlign: 'center'
            }
          ]}
        >
          {'Last 31 Days'} {/* Show generic label instead of specific month */}
        </ThemedText>
        {/* the current month */}
        <ThemedText 
          type="caption" 
          style={[
            styles.monthLabel, 
            { 
              color: theme.textSecondary,
              fontWeight: '500',
              textAlign: 'center'
            }
          ]}
        >
          {getCurrentMonth()} {/* Show current month */}
        </ThemedText>
      </View>



      {/* Dots Grid - Wrapped Layout */}
      <View style={styles.dotsGrid}>
        {dateRange.map((date) => {
          const completed = habitData.completions.get(date) ?? false;
          const { day, month } = formatDate(date);
          
          // Check if this is the first day of a month
          const isFirstOfMonth = dateRange.indexOf(date) === 0 || 
            formatDate(dateRange[dateRange.indexOf(date) - 1]).month !== month;
          
          // Styling logic based on prompt
          const bgColor = completed ? habitData.habit?.color : (theme.isDark ? '#000000' : '#E5E5EA');
          const txtColor = completed ? '#FFFFFF' : theme.textSecondary;
          const borderColor = completed ? habitData.habit?.color : 'transparent';

          return habitData.habit ? (
            <View key={`${habitData.habit.id}-${date}`} style={styles.dotWrapper}>

              <Pressable
                style={[
                  styles.dayDot,
                  {
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => habitData.habit && handleDotPress(date, habitData.habit, completed)}
              >
                <ThemedText
                  style={[
                    styles.dayNumber,
                    { color: txtColor, fontSize: dotSize * 0.45 }
                  ]}
                >
                  {day}
                </ThemedText>
              </Pressable>
            </View>
          ) : null;
        })}
      </View>
    </View>
  );
};

export const HabitRecordCard = memo(HabitCardComponent);

const styles = StyleSheet.create({
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
  monthUnderHabitContainer: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
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
});