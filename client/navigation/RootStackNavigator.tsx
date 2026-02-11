import React, { memo, useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";

// Lazy load screens to reduce initial bundle size
const MainTabNavigator = React.lazy(() => import("@/navigation/MainTabNavigator"));
const NewHabitScreen = React.lazy(() => import("@/screens/NewHabitScreen"));
const EditHabitScreen = React.lazy(() => import("@/screens/EditHabitScreen"));
const HabitTimerScreen = React.lazy(() => import("@/screens/HabitTimerScreen"));
const FocusSessionScreen = React.lazy(() => import("@/screens/FocusSessionScreen"));
const HabitDetailScreen = React.lazy(() => import("@/screens/HabitDetailScreen"));

export type RootStackParamList = {
  Main: undefined;
  NewHabit: undefined;
  EditHabit: { habitId: number };
  HabitTimer: { habitId: string; habitName: string };
  FocusSession: undefined;
  HabitDetail: { habitId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  
  // Memoize screen options to prevent unnecessary re-renders
  const screenOptionsMemo = useMemo(() => screenOptions, [screenOptions]);
  
  // Memoize static screen options to prevent re-creation on each render
  const mainScreenOptions = useMemo(() => ({ headerShown: false }), []);
  const newHabitScreenOptions = useMemo(() => ({
    presentation: "modal" as const,
    headerTitle: "New Habit",
  }), []);
  const editHabitScreenOptions = useMemo(() => ({
    presentation: "modal" as const,
    headerTitle: "Edit Habit",
  }), []);
  const habitTimerScreenOptions = useMemo(() => ({
    headerTitle: "Habit Timer",
  }), []);
  const focusSessionScreenOptions = useMemo(() => ({
    headerTitle: "Focus Session",
  }), []);
  const habitDetailScreenOptions = useMemo(() => ({
    headerTitle: "Habit Detail",
  }), []);

  return (
    <Stack.Navigator 
      screenOptions={screenOptionsMemo}
      screenListeners={{
        // Prevent unnecessary re-renders by avoiding inline functions
        state: () => {},
        focus: () => {},
      }}
      // Performance optimizations

    >
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={mainScreenOptions}
      />
      <Stack.Screen
        name="NewHabit"
        component={NewHabitScreen}
        options={newHabitScreenOptions}
      />
      <Stack.Screen
        name="EditHabit"
        component={EditHabitScreen}
        options={editHabitScreenOptions}
      />
      <Stack.Screen
        name="HabitTimer"
        component={HabitTimerScreen}
        options={habitTimerScreenOptions}
      />
      <Stack.Screen
        name="FocusSession"
        component={FocusSessionScreen}
        options={focusSessionScreenOptions}
      />
      <Stack.Screen
        name="HabitDetail"
        component={HabitDetailScreen}
        options={habitDetailScreenOptions}
      />
    </Stack.Navigator>
  );
}
