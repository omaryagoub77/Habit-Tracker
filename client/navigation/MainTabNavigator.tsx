import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, Platform } from "react-native";
import { useTheme } from "@/hooks/useTheme";

// Lazy load screens to reduce initial bundle size
const TodayScreen = React.lazy(() => import("@/screens/TodayScreen"));
const TasksScreen = React.lazy(() => import("@/screens/TasksScreen"));
const ReportsStackNavigator = React.lazy(() => import("@/navigation/ReportsStackNavigator"));
// I've added this import based on your new Tab.Screen
const HabitsRecordScreen = React.lazy(() => import("@/screens/habits-record"));
const HabitTimerScreen = React.lazy(() => import("@/screens/HabitTimerScreen"));
const SettingsScreen = React.lazy(() => import("@/screens/SettingsScreen"));

export type MainTabParamList = {
  TodayTab: undefined;
  ReportsTab: undefined;
  TaskTab: undefined;
  HabitsRecordTab: undefined; // Added the new type
  HabitTimerTab: undefined; // Added Habit Timer tab
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme } = useTheme();
  
  // Memoize the tab bar style to prevent unnecessary re-renders
  const tabBarStyle = useMemo(() => ({
    position: "absolute" as const,
    backgroundColor: theme.backgroundRoot,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 15,
        shadowColor: "#000",
      },
      default: {
        boxShadow: "0px 10px 15px rgba(0, 0, 0, 0.2)",
      },
    }),
    height: 114, // Increased height to accommodate labels
    // bottom: 35,
    // left: 20,
    // right: 20,
    // borderRadius: 30,
    borderTopWidth: 0,
  }), [theme.backgroundRoot]);
  
  // Memoize common tab bar icon components to prevent re-creation
  const tabIconComponents = useMemo(() => ({
    home: ({ color, size }: { color: string; size: number }) => (
      <Feather name="home" size={size} color={color} />
    ),
    // Changed from calendar to chart-bar for reports
    chartBar: ({ color, size }: { color: string; size: number }) => (
      <Feather name="bar-chart" size={size} color={color} />
    ),
    clock: ({ color, size }: { color: string; size: number }) => (
      <Feather name="clock" size={size} color={color} />
    ),
    // Changed from list to check-circle for tasks
    checkCircle: ({ color, size }: { color: string; size: number }) => (
      <Feather name="check-circle" size={size} color={color} />
    ),
    // Changed from list to database for records
    database: ({ color, size }: { color: string; size: number }) => (
      <Feather name="database" size={size} color={color} />
    ),
    settings: ({ color, size }: { color: string; size: number }) => (
      <Feather name="settings" size={size} color={color} />
    ),
  }), []);
  
  // Memoize screen options to prevent re-creation on each render
  const todayTabOptions = useMemo(() => ({
    title: "Home",
    tabBarIcon: tabIconComponents.home,
  }), [tabIconComponents.home]);
  

  
  const reportsTabOptions = useMemo(() => ({
    title: "Reports",
    tabBarIcon: tabIconComponents.chartBar, // Changed to chart-bar icon
    headerShown: false,
  }), [tabIconComponents.chartBar]);
  
  const taskTabOptions = useMemo(() => ({
    title: "Tasks",
    tabBarIcon: tabIconComponents.checkCircle, // Changed to check-circle icon
  }), [tabIconComponents.checkCircle]);
  
  const habitsRecordTabOptions = useMemo(() => ({
    title: "Records",
    tabBarIcon: tabIconComponents.database, // Changed to database icon
  }), [tabIconComponents.database]);
  
  const habitTimerTabOptions = useMemo(() => ({
    title: "Timer",
    tabBarIcon: tabIconComponents.clock,
  }), [tabIconComponents.clock]);
  
  const settingsTabOptions = useMemo(() => ({
    title: "Settings",
    tabBarIcon: tabIconComponents.settings,
  }), [tabIconComponents.settings]);
  
  // Memoize the main screen options object
  const screenOptions = useMemo(() => ({
    tabBarShowLabel: true, // Show labels on Android
    tabBarActiveTintColor: theme.tabIconSelected,
    tabBarInactiveTintColor: theme.tabIconDefault,
    tabBarStyle: tabBarStyle,
    tabBarItemStyle: {
      justifyContent: "center" as "center",
      alignItems: "center" as "center",
      flex: 1,
      paddingVertical: 8, // Add some padding
    },
    tabBarLabelStyle: {
      fontSize: 9, // Changed from 7 to 9
      marginTop: 4, // Add space between icon and label
      fontWeight: "500" as "500",
    },
    headerShown: false,
  }), [theme.tabIconSelected, theme.tabIconDefault, tabBarStyle]);

  return (
    <Tab.Navigator
      initialRouteName="TodayTab"
      screenOptions={screenOptions}

    >
      <Tab.Screen
        name="TodayTab"
        component={TodayScreen}
        options={todayTabOptions}
      />

      <Tab.Screen
        name="ReportsTab"
        component={ReportsStackNavigator}
        options={reportsTabOptions}
      />
      <Tab.Screen
        name="TaskTab"
        component={TasksScreen}
        options={taskTabOptions}
      />
      <Tab.Screen
        name="HabitTimerTab"
        component={HabitTimerScreen}
        options={habitTimerTabOptions}
      />
       <Tab.Screen
        name="HabitsRecordTab"
        component={HabitsRecordScreen}
        options={habitsRecordTabOptions}
      />
       <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={settingsTabOptions}
      />
    </Tab.Navigator>
  );
}