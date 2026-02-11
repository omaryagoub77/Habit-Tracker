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
  const [isNameDirty, setIsNameDirty] = useState(false); // Track if name has been changed
  const [isClearing, setIsClearing] = useState(false);

  // 1. Force a refresh when the screen comes into focus, but ONLY if DB is ready
  useFocusEffect(
    useCallback(() => {
      if (isInitialized) {
        refresh();
      }
    }, [isInitialized, refresh])
  );

  // 2. CRITICAL FIX: Auto-retry logic
  // If the DB is initialized but we have no settings, try to fetch them again automatically.
  // This fixes the race condition where the UI renders before data is ready.
  useEffect(() => {
    let retryTimer: NodeJS.Timeout;
    
    if (isInitialized && !settings && !settingsLoading) {
      // Wait 500ms and try again
      retryTimer = setTimeout(() => {
        console.log("Auto-retrying settings fetch...");
        refresh();
      }, 500);
    }
    
    return () => clearTimeout(retryTimer);
  }, [isInitialized, settings, settingsLoading, refresh]);

  // Sync local state with loaded settings
  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName);
      setIsNameDirty(false); // Reset dirty state when settings are loaded
    }
  }, [settings]);

  const handleNameChange = (text: string) => {
    setDisplayName(text);
    // Mark as dirty if the text is different from the saved name
    if (settings && text !== settings.displayName) {
      setIsNameDirty(true);
    } else {
      setIsNameDirty(false);
    }
  };

  const handleNameSave = () => {
    if (settings && displayName !== settings.displayName) {
      updateSettings({ displayName });
      setIsNameDirty(false); // Reset dirty state after saving
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
    // Update the theme context first for immediate visual feedback
    await setThemeContext(mode);
    // Also update the database settings
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

  // 3. ROBUST LOADING STATE
  // We keep showing the loader until we have the Settings object.
  // The useEffect above ensures we keep trying to get it.
  const isPageLoading = !isInitialized || dbLoading || settingsLoading || !settings;

  if (isPageLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        {/* Optional: Show text if it takes too long so the user knows what's happening */}
        {isInitialized && !settings && (
           <ThemedText style={{ marginTop: 20, color: theme.textSecondary }}>
             Loading profile...
           </ThemedText>
        )}
      </ThemedView>
    );
  }

  // At this point, `settings` is guaranteed to exist.
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: 60 + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="display" style={styles.title}>
          Settings
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
            Profile
          </ThemedText>
          
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.profileHeader}>
              <View style={styles.profileInfo}>
                <TextInput
                  style={[styles.nameInput, { color: theme.text }]}  
                  value={displayName}
                  onChangeText={handleNameChange} // Use the new handler
                  placeholder="Your name"
                  placeholderTextColor={theme.textSecondary}
                  onBlur={handleNameBlur}
                />
                {/* Only show the save button if the name is dirty */}
                {isNameDirty && (
                  <TouchableOpacity 
                    style={[styles.saveButton, { backgroundColor: theme.primary }]}  
                    onPress={handleNameSave} // Use the new handler
                  >
                    <ThemedText type="small" style={styles.saveButtonText}>Save Name</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
            Preferences
          </ThemedText>
          
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.settingRow, { borderBottomColor: theme.border, borderColor: theme.border }]}>
              <View style={styles.settingInfo}>
                <View style={[styles.miniIcon, { backgroundColor: theme.primary + '20' }]}>  
                  <Feather name="bell" size={20} color={theme.primary} />
                </View>
                <ThemedText type="body">Notifications</ThemedText>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border, opacity: 0.3 }]} />

            <View style={styles.settingColumn}>
              <View style={styles.settingInfo}>
                <View style={[styles.miniIcon, { backgroundColor: theme.accent + '20' }]}>  
                  <Feather name="clock" size={20} color={theme.accent} />
                </View>
                <ThemedText type="body">Default Time Section</ThemedText>
              </View>
              <View style={styles.timeSectionPicker}>
                {(Object.keys(TimeSection) as Array<keyof typeof TimeSection>).map(
                  (key) => (
                    <Pressable
                      key={key}
                      style={[
                        styles.timeSectionOption,
                        {
                          backgroundColor:
                            settings.defaultTimeSection === key
                              ? theme.primary
                              : theme.backgroundSecondary,
                        },
                      ]}
                      onPress={() => handleTimeSectionChange(key)}
                    >
                      <ThemedText
                        type="small"
                        style={{
                          color:
                            settings.defaultTimeSection === key
                              ? "#FFFFFF"
                              : theme.text,
                        }}
                      >
                        {TimeSection[key].label}
                      </ThemedText>
                    </Pressable>
                  )
                )}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border, opacity: 0.3 }]} />

            <View style={styles.settingColumn}>
              <View style={styles.settingInfo}>
                <View style={[styles.miniIcon, { backgroundColor: theme.primary + '20' }]}>  
                  <Feather name="moon" size={20} color={theme.primary} />
                </View>
                <ThemedText type="body">Theme Mode</ThemedText>
              </View>
              <View style={styles.timeSectionPicker}>
                {(["system", "light", "dark"] as UserSettings["themeMode"][]).map(
                  (mode) => (
                    <Pressable
                      key={mode}
                      style={[
                        styles.timeSectionOption,
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
                        {mode === "dark" ? "Dark Forest" : mode === "light" ? "Clean Meadow" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </ThemedText>
                    </Pressable>
                  )
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
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
              <Feather name="trash-2" size={20} color={theme.error} />
            </View>
            <View style={styles.dangerInfo}>
              <ThemedText type="body" style={{ color: theme.error }}>
                {isClearing ? "Clearing..." : "Clear All Data"}
              </ThemedText>
              <ThemedText type="small" secondary>
                Delete all habits, completions, and tasks
              </ThemedText>
            </View>
          </Pressable>
        </View>

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
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    padding: 0,
  },
  saveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
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
    borderBottomWidth: 1,
    paddingVertical: Spacing.md,
  },
  settingColumn: {
    gap: Spacing.md,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  timeSectionPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  timeSectionOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dangerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
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