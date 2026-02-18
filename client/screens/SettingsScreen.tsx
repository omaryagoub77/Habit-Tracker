import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useDatabase, useUserSettings } from "@/hooks/useDatabase";
import { db, UserSettings } from "@/database/DatabaseService";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, TimeSection } from "@/constants/theme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { isInitialized, isLoading: dbLoading } = useDatabase();
  const { settings, isLoading: settingsLoading, updateSettings, refresh } = useUserSettings();
  const { setTheme: setThemeContext } = useThemeContext();
  const [displayName, setDisplayName] = useState("");
  const [isNameDirty, setIsNameDirty] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Force refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isInitialized) {
        refresh();
      }
    }, [isInitialized, refresh])
  );

  // Auto-retry logic for settings
  useEffect(() => {
    let retryTimer: NodeJS.Timeout;
    
    if (isInitialized && !settings && !settingsLoading) {
      retryTimer = setTimeout(() => {
        refresh();
      }, 500);
    }
    
    return () => clearTimeout(retryTimer);
  }, [isInitialized, settings, settingsLoading, refresh]);

  // Sync local state with loaded settings
  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName);
      setIsNameDirty(false);
    }
  }, [settings]);

  const handleNameChange = (text: string) => {
    setDisplayName(text);
    if (settings && text !== settings.displayName) {
      setIsNameDirty(true);
    } else {
      setIsNameDirty(false);
    }
  };

  const handleNameSave = () => {
    if (settings && displayName !== settings.displayName) {
      updateSettings({ displayName });
      setIsNameDirty(false);
    }
  };

  const handleNameBlur = () => {
    if (isNameDirty) {
      handleNameSave();
    }
  };

  const handleTimeSectionChange = (section: UserSettings["defaultTimeSection"]) => {
    updateSettings({ defaultTimeSection: section });
  };

  const handleNotificationsToggle = (value: boolean) => {
    updateSettings({ notificationsEnabled: value });
  };

  const handleThemeModeChange = async (mode: UserSettings["themeMode"]) => {
    await setThemeContext(mode);
    updateSettings({ themeMode: mode });
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all your habits, completions, and tasks. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you sure?",
              "This is your last chance to cancel.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Clear Everything",
                  style: "destructive",
                  onPress: async () => {
                    setIsClearing(true);
                    try {
                      await db.clearAllData();
                      refresh();
                      Alert.alert("Success", "All data has been cleared.");
                    } catch (error) {
                      console.error("Error clearing data:", error);
                      Alert.alert("Error", "Failed to clear data.");
                    } finally {
                      setIsClearing(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const isPageLoading = !isInitialized || dbLoading || settingsLoading || !settings;

  if (isPageLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        {isInitialized && !settings && (
           <ThemedText style={{ marginTop: 20, color: theme.textSecondary }}>
             Loading profile...
           </ThemedText>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: 60 + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="h1" style={styles.title}>
          Settings
        </ThemedText>

        {/* Profile Section */}
        <View style={styles.section}>
          <ThemedText type="caption" secondary style={styles.sectionTitle}>
            Profile
          </ThemedText>
          
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.profileRow}>
              <View style={styles.profileInfo}>
                <TextInput
                  style={[styles.nameInput, { color: theme.text }]}  
                  value={displayName}
                  onChangeText={handleNameChange}
                  placeholder="Your name"
                  placeholderTextColor={theme.textSecondary}
                  onBlur={handleNameBlur}
                />
                {isNameDirty && (
                  <TouchableOpacity 
                    style={[styles.saveButton, { backgroundColor: theme.primary }]}  
                    onPress={handleNameSave}
                  >
                    <ThemedText type="small" style={styles.saveButtonText}>Save</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <ThemedText type="caption" secondary style={styles.sectionTitle}>
            Preferences
          </ThemedText>
          
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            {/* Notifications Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.miniIcon, { backgroundColor: theme.primary + '20' }]}>  
                  <Feather name="bell" size={18} color={theme.primary} />
                </View>
                <ThemedText type="body">Notifications</ThemedText>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>


       

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Theme Mode Picker */}
            <View style={styles.settingColumn}>
              <View style={styles.settingInfo}>
                <View style={[styles.miniIcon, { backgroundColor: theme.primary + '20' }]}>  
                  <Feather name="moon" size={18} color={theme.primary} />
                </View>
                <ThemedText type="body">Theme</ThemedText>
              </View>
              <View style={styles.pickerRow}>
                {(["system", "light", "dark"] as UserSettings["themeMode"][]).map(
                  (mode) => (
                    <Pressable
                      key={mode}
                      style={[
                        styles.pickerOption,
                        {
                          backgroundColor:
                            settings.themeMode === mode
                              ? theme.primary
                              : theme.backgroundSecondary,
                        },
                      ]}
                      onPress={() => handleThemeModeChange(mode)}
                    >
                      <ThemedText
                        type="small"
                        style={{
                          color:
                            settings.themeMode === mode
                              ? "#FFFFFF"
                              : theme.text,
                        }}
                      >
                        {mode === "dark" ? "Dark" : mode === "light" ? "Light" : "System"}
                      </ThemedText>
                    </Pressable>
                  )
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <ThemedText type="caption" secondary style={styles.sectionTitle}>
            Data
          </ThemedText>
          
          <Pressable
            style={[
              styles.dangerCard,
              { backgroundColor: theme.error + "10", borderColor: theme.error },
            ]}
            onPress={handleClearData}
            disabled={isClearing}
          >
            <View style={[styles.miniIcon, { backgroundColor: theme.error + '20' }]}>  
              <Feather name="trash-2" size={18} color={theme.error} />
            </View>
            <View style={styles.dangerInfo}>
              <ThemedText type="body" style={{ color: theme.error }}>
                {isClearing ? "Clearing..." : "Clear All Data"}
              </ThemedText>
              <ThemedText type="caption" secondary>
                Delete all habits, completions, and tasks
              </ThemedText>
            </View>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText type="caption" secondary style={styles.footerText}>
            HabitFlow v1.0.0
          </ThemedText>
        </View>
      </ScrollView>
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
  title: {
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: "500",
    padding: 0,
  },
  saveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  settingColumn: {
    paddingVertical: Spacing.sm,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pickerOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dangerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  dangerInfo: {
    flex: 1,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  footerText: {
    textAlign: "center",
  },
});
