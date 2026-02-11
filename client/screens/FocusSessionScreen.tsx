import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Modal,
  FlatList,
  Dimensions,
  AppState,
  Alert,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, BorderRadius } from '@/constants/theme';
import { format } from 'date-fns';
import { TimeTrackingService } from '@/services/TimeTrackingService';
import { HabitNotificationService } from '@/services/HabitNotificationService';
import { db } from '@/database/DatabaseService';
import { WheelPicker } from '@/components/WheelPicker';
import { stopAlarmSound } from '@/services/EnhancedAlarmService';
import AlarmNative from '../native/AlarmNative';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Canonical alarm stop function
const stopAlarmSafely = async () => {
  try {
    await AlarmNative.stopAlarm();
  } catch (e) {
    console.warn('Stop alarm failed:', e);
  }
};

// FocusSessionScreen component
export default function FocusSessionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'FocusSession'>>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [showHourPicker, setShowHourPicker] = useState(false);
  const [showMinutePicker, setShowMinutePicker] = useState(false);
  const [showSecondPicker, setShowSecondPicker] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [showHabitSelector, setShowHabitSelector] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<{ id: number; name: string; color: string } | null>(null);
  const [habits, setHabits] = useState<Array<{ id: number; name: string; color: string }>>([]);
  
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);
  const ringPulse = useSharedValue(0);
  const playButtonScale = useSharedValue(1);
  const modeSwitchTranslateX = useSharedValue(0);
  
  // Load habits from database
  useEffect(() => {
    const loadHabits = async () => {
      try {
        const allHabits = await db.getAllHabits();
        setHabits(allHabits.map(habit => ({
          id: habit.id,
          name: habit.name,
          color: habit.color || '#21F38C'
        })));
        
        if (allHabits.length > 0 && !selectedHabit) {
          setSelectedHabit({
            id: allHabits[0].id,
            name: allHabits[0].name,
            color: allHabits[0].color || '#21F38C'
          });
        }
      } catch (error) {
        console.error('Failed to load habits:', error);
      }
    };
    
    loadHabits();
  }, []);
  
  // Update mode switch position when mode changes
  useEffect(() => {
    modeSwitchTranslateX.value = withTiming(
      mode === 'timer' ? 0 : SCREEN_WIDTH * 0.4 - Spacing.xs, // Approximate position for 'Stopwatch'
      { duration: 300 }
    );
  }, [mode]);
  
  // Calculate total seconds for timer mode
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const remainingSeconds = Math.max(0, totalSeconds - elapsed);
  
  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (isRunning && startTimeRef.current) {
          // Recalculate elapsed time
          const now = Date.now();
          const timeSinceStart = Math.floor((now - startTimeRef.current) / 1000);
          
          if (mode === 'stopwatch') {
            setElapsed(timeSinceStart);
          } else {
            const newElapsed = Math.max(0, timeSinceStart);
            setElapsed(newElapsed);
            
            if (newElapsed >= totalSeconds) {
              finishTimer();
            }
          }
        }
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App went to background
        // Stop any playing alarm when going to background
        if (isAlarmPlaying) {
          stopAlarmSafely();
          setIsAlarmPlaying(false); // Update state to hide stop alarm button
        }
      }
      appState.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, totalSeconds, isAlarmPlaying]);
  
  // Timer tick function
  const tick = useCallback(() => {
    if (mode === 'stopwatch') {
      setElapsed(prev => prev + 1);
    } else {
      setElapsed(prev => {
        const newElapsed = prev + 1;
        if (newElapsed >= totalSeconds) {
          finishTimer();
          // Native alarm is triggered by AlarmManager
          // JS only sets UI state to show stop alarm button
          if (soundEnabled) {
            setIsAlarmPlaying(true); // Set state to show stop alarm button
          }
          return totalSeconds;
        }
        return newElapsed;
      });
    }
  }, [mode, totalSeconds, soundEnabled, isAlarmPlaying])
  
  // Start the timer/stopwatch
  const start = async () => {
    if (!selectedHabit) {
      Alert.alert('No Habit Selected', 'Please select a habit to start the focus session');
      return;
    }
    
    if (mode === 'timer' && totalSeconds === 0) {
      Alert.alert('Invalid Duration', 'Please set a duration greater than 0 seconds');
      return;
    }
    
    if (isRunning) return;
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Set start time
    startTimeRef.current = Date.now() - (elapsed * 1000);
    
    // Start interval
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000);
    
    // Schedule notification for timer mode
    if (mode === 'timer') {
      const remainingTime = totalSeconds - elapsed;
      if (remainingTime > 0) {
        const notificationId = await HabitNotificationService.scheduleTimerNotification(
          remainingTime,
          selectedHabit.name
        );
        notificationIdRef.current = notificationId || null;
      }
    }
    
    setIsRunning(true);
  };
  
  // Pause the timer/stopwatch
  const pause = () => {
    if (!isRunning) return;
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Cancel notification
    if (notificationIdRef.current) {
      HabitNotificationService.cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
    
    // Stop any playing alarm when pausing
    stopAlarmSafely();
    setIsAlarmPlaying(false); // Update state to hide stop alarm button
    
    setIsRunning(false);
  };
  
  // Reset the timer/stopwatch
  const reset = () => {
    // Trigger haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Cancel notification
    if (notificationIdRef.current) {
      HabitNotificationService.cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
    
    // Stop any playing alarm when resetting
    stopAlarmSafely();
    setIsAlarmPlaying(false); // Update state to hide stop alarm button
    
    // Reset times
    setElapsed(0);
    startTimeRef.current = null;
    setIsRunning(false);
  };
  
  // Finish timer and save session
  const finishTimer = async () => {
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Cancel notification
    if (notificationIdRef.current) {
      HabitNotificationService.cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
    
    // Trigger haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Save session
    if (selectedHabit && startTimeRef.current) {
      const endTime = Date.now();
      const durationSeconds = Math.floor((endTime - startTimeRef.current) / 1000);
      
      try {
        await TimeTrackingService.saveSession({
          habitId: selectedHabit.id,
          durationSeconds,
          mode,
          startedAt: new Date(startTimeRef.current).toISOString(),
          endedAt: new Date(endTime).toISOString(),
          createdDate: format(new Date(), 'yyyy-MM-dd')
        });
        
        Alert.alert(
          'Session Completed',
          `Focus session completed! You spent ${Math.floor(durationSeconds / 60)} minutes on ${selectedHabit.name}`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Failed to save session:', error);
        Alert.alert('Error', 'Failed to save session data');
      }
    }
    
    // Reset
    setElapsed(0);
    startTimeRef.current = null;
    setIsRunning(false);
    setIsAlarmPlaying(false); // Update state to hide stop alarm button
  };
  
  // Toggle sound
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Handle play button press
  const handlePlayPress = () => {
    // Scale animation for button press
    playButtonScale.value = withTiming(0.95, { duration: 100 }, (finished) => {
      if (finished) {
        playButtonScale.value = withTiming(1, { duration: 100 });
      }
    });
    
    if (isRunning) {
      pause();
    } else {
      start();
    }
  };
  
  // Format time for display
  const formatTime = (time: number) => {
    const hrs = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = time % 60;
    
    return {
      hours: hrs.toString().padStart(2, '0'),
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0')
    };
  };
  
  // Get current time based on mode
  const currentTime = mode === 'stopwatch' 
    ? formatTime(elapsed) 
    : formatTime(remainingSeconds);
  
  // Animated styles for ring pulse
  const ringPulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      ringPulse.value,
      [0, 1],
      [1, 1.05],
      Extrapolate.CLAMP
    );
    
    const opacity = interpolate(
      ringPulse.value,
      [0, 1],
      [0.7, 0.3],
      Extrapolate.CLAMP
    );
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });
  
  // Animate ring pulse when timer is running
  useEffect(() => {
    if (isRunning) {
      ringPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 1000 })
        ),
        -1
      );
    } else {
      ringPulse.value = withTiming(0, { duration: 500 });
    }
  }, [isRunning]);
  
  // Animated styles for play button
  const playButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: playButtonScale.value }],
    };
  });
  
  // Render habit item in selector
  const renderHabitItem = ({ item }: { item: { id: number; name: string; color: string } }) => (
    <TouchableOpacity
      style={[styles.habitItem, { backgroundColor: theme.backgroundSecondary }]}
      onPress={() => {
        setSelectedHabit(item);
        setShowHabitSelector(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <View style={[styles.habitColor, { backgroundColor: item.color }]} />
      <Text style={[styles.habitItemText, { color: theme.text }]}>{item.name}</Text>
    </TouchableOpacity>
  );
  
  // Format time for display
  const displayTime = mode === 'stopwatch' ? elapsed : remainingSeconds;
  const timeParts = formatTime(displayTime);
  
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.navIcon}>←</Text>
        </TouchableOpacity>
        
        <ThemedText type="title" style={styles.topBarTitle}>
          Focus Session
        </ThemedText>
        
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navIcon}>⋮</Text>
        </TouchableOpacity>
      </View>
      
      {/* Mode Switch */}
      <View style={styles.modeSwitchContainer}>
        <View style={styles.modeSwitchBackground}>
          <Animated.View style={[styles.modeSwitchIndicator, { transform: [{ translateX: modeSwitchTranslateX.value }] }]} />
          <TouchableOpacity
            style={[styles.modeButtonContainer, mode === 'timer' && styles.modeButtonActive]}
            onPress={() => {
              setMode('timer');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <ThemedText 
              style={[
                styles.modeButtonText,
                mode === 'timer' && styles.modeButtonTextActive
              ]}
            >
              Timer
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modeButtonContainer, mode === 'stopwatch' && styles.modeButtonActive]}
            onPress={() => {
              setMode('stopwatch');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <ThemedText 
              style={[
                styles.modeButtonText,
                mode === 'stopwatch' && styles.modeButtonTextActive
              ]}
            >
              Stopwatch
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Habit Selector Chip */}
      <TouchableOpacity 
        style={styles.habitSelector}
        onPress={() => {
          setShowHabitSelector(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Text style={[styles.habitSelectorText, { color: selectedHabit?.color || '#21F38C' }]}>
          {selectedHabit?.name || 'Select Habit'} 
        </Text>
        <Text style={[styles.habitSelectorIcon, { color: selectedHabit?.color || '#21F38C' }]}>
          ▼
        </Text>
      </TouchableOpacity>
      
      {/* Circular Timer Dial */}
      <View style={styles.timerDialContainer}>
        <Animated.View style={[styles.ringPulse, ringPulseStyle]} />
        <View style={styles.timerDial}>
          {/* Ghost numbers above and below */}
          <View style={styles.ghostNumbersTop}>
            <Text style={styles.ghostNumber}>00</Text>
            <Text style={styles.ghostNumber}>25</Text>
            <Text style={styles.ghostNumber}>00</Text>
          </View>
          
          {/* Center focus row */}
          <View style={styles.focusRow}>
            <View style={styles.timeUnitContainer}>
              <Text style={styles.timeUnitLabel}>HOURS</Text>
              {mode === 'timer' ? (
                <TouchableOpacity 
                  style={styles.timeValueContainer}
                  onPress={() => {
                    setShowHourPicker(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.timeValue}>{timeParts.hours}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.timeValueContainer}>
                  <Text style={styles.timeValue}>{timeParts.hours}</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.colon}>:</Text>
            
            <View style={styles.timeUnitContainer}>
              <Text style={styles.timeUnitLabel}>MIN</Text>
              {mode === 'timer' ? (
                <TouchableOpacity 
                  style={styles.timeValueContainer}
                  onPress={() => {
                    setShowMinutePicker(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.timeValue}>{timeParts.minutes}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.timeValueContainer}>
                  <Text style={styles.timeValue}>{timeParts.minutes}</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.colon}>:</Text>
            
            <View style={styles.timeUnitContainer}>
              <Text style={styles.timeUnitLabel}>SEC</Text>
              {mode === 'timer' ? (
                <TouchableOpacity 
                  style={styles.timeValueContainer}
                  onPress={() => {
                    setShowSecondPicker(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.timeValue}>{timeParts.seconds}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.timeValueContainer}>
                  <Text style={styles.timeValue}>{timeParts.seconds}</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Ghost numbers below */}
          <View style={styles.ghostNumbersBottom}>
            <Text style={styles.ghostNumber}>00</Text>
            <Text style={styles.ghostNumber}>24</Text>
            <Text style={styles.ghostNumber}>59</Text>
          </View>
        </View>
      </View>
      
      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => {
            reset();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text style={styles.controlIcon}>↺</Text>
          <Text style={styles.controlLabel}>Reset</Text>
        </TouchableOpacity>
        
        <Animated.View style={[styles.playButtonContainer, playButtonAnimatedStyle]}>
          <TouchableOpacity 
            style={styles.playButton}
            onPress={handlePlayPress}
          >
            <Text style={styles.playIcon}>
              {isRunning ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleSound}
        >
          <Text style={styles.controlIcon}>
            {soundEnabled ? '🔊' : '🔇'}
          </Text>
          <Text style={styles.controlLabel}>Sound</Text>
        </TouchableOpacity>
        
        {/* Stop Alarm Button - Only show when alarm is playing */}
        {isAlarmPlaying && (
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: '#FF5252' }]}
            onPress={() => {
              stopAlarmSafely();
              setIsAlarmPlaying(false); // Update state to hide the button
            }}
          >
            <Text style={styles.controlIcon}>⏹</Text>
            <Text style={[styles.controlLabel, { color: '#FFFFFF' }]}>Stop Alarm</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Habit Selector Modal */}
      <Modal
        visible={showHabitSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHabitSelector(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setShowHabitSelector(false)}
        >
          <View 
            style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Habit</Text>
            <FlatList
              data={habits}
              renderItem={renderHabitItem}
              keyExtractor={item => item.id.toString()}
              style={styles.habitList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Hour Picker Modal */}
      <Modal
        visible={showHourPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHourPicker(false)}
      >
        <TouchableOpacity 
          style={styles.pickerModalOverlay}
          onPress={() => setShowHourPicker(false)}
        >
          <View style={[styles.pickerModalContent, { backgroundColor: theme.backgroundDefault }]}> 
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Hours</Text>
            <View style={styles.pickerContainer}>
              <WheelPicker 
                options={Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))}
                selectedIndex={hours}
                onValueChange={(index) => {
                  setHours(index);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </View>
            <TouchableOpacity 
              style={styles.pickerDoneButton}
              onPress={() => {
                setShowHourPicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Minute Picker Modal */}
      <Modal
        visible={showMinutePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMinutePicker(false)}
      >
        <TouchableOpacity 
          style={styles.pickerModalOverlay}
          onPress={() => setShowMinutePicker(false)}
        >
          <View style={[styles.pickerModalContent, { backgroundColor: theme.backgroundDefault }]}> 
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Minutes</Text>
            <View style={styles.pickerContainer}>
              <WheelPicker 
                options={Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))}
                selectedIndex={minutes}
                onValueChange={(index) => {
                  setMinutes(index);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </View>
            <TouchableOpacity 
              style={styles.pickerDoneButton}
              onPress={() => {
                setShowMinutePicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Second Picker Modal */}
      <Modal
        visible={showSecondPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSecondPicker(false)}
      >
        <TouchableOpacity 
          style={styles.pickerModalOverlay}
          onPress={() => setShowSecondPicker(false)}
        >
          <View style={[styles.pickerModalContent, { backgroundColor: theme.backgroundDefault }]}> 
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Seconds</Text>
            <View style={styles.pickerContainer}>
              <WheelPicker 
                options={Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))}
                selectedIndex={seconds}
                onValueChange={(index) => {
                  setSeconds(index);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </View>
            <TouchableOpacity 
              style={styles.pickerDoneButton}
              onPress={() => {
                setShowSecondPicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1F16',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  navButton: {
    padding: Spacing.sm,
  },
  navIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modeSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
    marginHorizontal: Spacing.xl,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: '#1A3D2E',
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xs / 2,
  },
  modeButtonText: {
    fontSize: 16,
    color: '#6FAE91',
  },
  modeButtonTextActive: {
    color: '#0B1F16',
    fontWeight: 'bold',
  },
  modeSwitchBackground: {
    flexDirection: 'row',
    backgroundColor: '#1A3D2E',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs / 2,
  },
  modeSwitchIndicator: {
    position: 'absolute',
    top: Spacing.xs / 2,
    left: Spacing.xs / 2,
    width: (SCREEN_WIDTH * 0.4) - Spacing.xs, // Approximate width for each button
    height: 44, // Same as button height
    backgroundColor: '#21F38C',
    borderRadius: BorderRadius.lg,
    zIndex: 1,
  },
  modeButtonContainer: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    zIndex: 2,
  },
  modeButtonActive: {
    backgroundColor: '#21F38C',
  },
  habitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 61, 46, 0.6)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  habitSelectorText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: Spacing.sm,
  },
  habitSelectorIcon: {
    fontSize: 12,
  },
  timerDialContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
  },
  ringPulse: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    borderWidth: 4,
    borderColor: '#21F38C',
    opacity: 0.3,
  },
  timerDial: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    borderWidth: 3,
    borderColor: '#21F38C',
    backgroundColor: 'rgba(26, 61, 46, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#21F38C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  ghostNumbersTop: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: Spacing.md,
    opacity: 0.3,
  },
  ghostNumbersBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: Spacing.md,
    opacity: 0.3,
  },
  ghostNumber: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeUnitContainer: {
    alignItems: 'center',
  },
  timeUnitLabel: {
    fontSize: 12,
    color: '#6FAE91',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  timeValueContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  timeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  colon: {
    fontSize: 32,
    color: '#6FAE91',
    marginHorizontal: Spacing.sm,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing.xl + 20, // Add extra padding for safe area
  },
  controlButton: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  controlIcon: {
    fontSize: 24,
    color: '#6FAE91',
    marginBottom: Spacing.xs,
  },
  controlLabel: {
    fontSize: 12,
    color: '#6FAE91',
  },
  playButtonContainer: {
    alignItems: 'center',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#21F38C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#21F38C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 15,
  },
  playIcon: {
    fontSize: 30,
    color: '#0B1F16',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  habitList: {
    flex: 1,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  habitColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: Spacing.md,
  },
  habitItemText: {
    fontSize: 16,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  pickerDoneButton: {
    backgroundColor: '#21F38C',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  pickerDoneText: {
    color: '#0B1F16',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
