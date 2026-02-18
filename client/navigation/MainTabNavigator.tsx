import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";

// --- LAZY LOAD SCREENS ---
// (Ensure these paths match your project structure)
const TodayScreen = React.lazy(() => import("@/screens/TodayScreen"));
const ReportsStackNavigator = React.lazy(() => import("@/navigation/ReportsStackNavigator"));
const HabitsRecordScreen = React.lazy(() => import("@/screens/habits-record"));
const SettingsScreen = React.lazy(() => import("@/screens/SettingsScreen"));

// --- TYPES ---
export type MainTabParamList = {
  TodayTab: undefined;
  ReportsTab: undefined;
  HabitsRecordTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// --- CONFIGURATION ---
const TAB_CONFIG = [
  { name: "TodayTab", title: "Home", icon: "home" },
  { name: "ReportsTab", title: "Reports", icon: "bar-chart-2" },
  { name: "HabitsRecordTab", title: "Records", icon: "database" },
  { name: "SettingsTab", title: "Settings", icon: "settings" },
] as const;

// --- ANIMATED COMPONENTS ---

/**
 * The sliding background pill.
 */
function ActiveTabIndicator({
  focusedIndex,
  tabWidth,
  colors,
}: {
  focusedIndex: number;
  tabWidth: number;
  colors: typeof Colors.light;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inset = 4; // Gap between indicator and container edge
    return {
      transform: [
        {
          translateX: withTiming(focusedIndex * tabWidth, {
            duration: 250,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
        },
      ],
      width: tabWidth - (inset * 2),
      left: inset,
      backgroundColor: colors.tabActiveBackground, // <--- Animate color change
    };
  }, [focusedIndex, tabWidth, colors.tabActiveBackground]);

  return <Animated.View style={[styles.activeIndicator, animatedStyle]} />;
}

/**
 * The Main Floating Tab Bar Component
 */
function CustomFloatingTabBar({ state, descriptors, navigation, insets }: any) {
  const { width: windowWidth } = useWindowDimensions();
  
  // Use the centralized theme system
  const { theme, isDark } = useTheme();
  const colors = theme;

  // 2. Calculate Dimensions
  const MARGIN_H = 16; // Left/Right margin
  const containerWidth = windowWidth - (MARGIN_H * 2);
  const tabWidth = containerWidth / state.routes.length;

  return (
    <View pointerEvents="box-none" style={styles.floatingOverlay}>
      <View
        style={[
          styles.container,
          {
            width: containerWidth,
            bottom: insets.bottom + 6, // Float above safe area
            backgroundColor: colors.tabContainerBackground,
            shadowColor: isDark ? colors.shadowDark : colors.shadowLight,
            shadowOpacity: isDark ? 0.4 : 0.1,
            // Android Elevation
            elevation: isDark ? 8 : 4,
          },
        ]}
      >
        {/* Animated Background Layer */}
        <ActiveTabIndicator 
          focusedIndex={state.index} 
          tabWidth={tabWidth} 
          colors={colors} 
        />

        {/* Tab Items Layer */}
        <View style={styles.tabsLayer}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const tabConfig = TAB_CONFIG[index];

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
              >
                <Feather
                  name={tabConfig.icon as any}
                  size={20}
                  color={isFocused ? colors.tabActiveIcon : colors.tabInactiveIcon}
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={[
                    styles.label,
                    { 
                      color: isFocused ? colors.tabActiveIcon : colors.tabInactiveIcon,
                      fontWeight: isFocused ? "600" : "500"
                    },
                  ]}
                >
                  {tabConfig.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// --- MAIN NAVIGATOR ---

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarShowLabel: false,
    tabBarStyle: { display: "none" as const }, // Hide default system bar
  }), []);

  return (
    <Tab.Navigator
      initialRouteName="TodayTab"
      screenOptions={screenOptions}
      tabBar={(props) => (
        <CustomFloatingTabBar {...props} insets={insets} />
      )}
    >
      <Tab.Screen name="TodayTab" component={TodayScreen} />
      <Tab.Screen name="ReportsTab" component={ReportsStackNavigator} />
      <Tab.Screen name="HabitsRecordTab" component={HabitsRecordScreen} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  floatingOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  container: {
    height: 64, // Comfortable touch height
    flexDirection: "row",
    borderRadius: 32, // Full Pill Shape
    position: "absolute",
    // Base shadow props (Opacity and Color handled dynamically)
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
  },
  activeIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    borderRadius: 28, // Matches container radius minus padding
  },
  tabsLayer: {
    flexDirection: "row",
    flex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  label: {
    fontSize: 9,
    letterSpacing: 0.2,
  },
});