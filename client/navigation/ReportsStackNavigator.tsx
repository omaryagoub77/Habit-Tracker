import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";

// Lazy load screens to reduce initial bundle size
const ReportsScreen = React.lazy(() => import("@/screens/ReportsScreen"));

export type ReportsStackParamList = {
  Calendar: undefined;
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export default function ReportsStackNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.backgroundRoot,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="Calendar"
        component={ReportsScreen}
        options={{
          title: "Reports",
        }}
      />
    </Stack.Navigator>
  );
}