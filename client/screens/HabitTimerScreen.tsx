import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, AppState, Alert, TouchableOpacity, Dimensions, FlatList, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  useDerivedValue,
  type SharedValue
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { TimeTrackingService } from '@/services/TimeTrackingService';
import { db } from '@/database/DatabaseService';
import { format } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { 
  scheduleAlarm,
  cancelAlarm,
  stopAlarm,
  addAlarmTriggeredListener 
} from '@/native/AlarmNative';
import alarmNativeModule from '@/native/AlarmNative';

// ============================================================================
// ALARMEE INTEGRATION
// ============================================================================
// The useAlarmee hook provides a unified interface for scheduling alarms using
// the Alarmee library. This integration ensures:
// 1. Alarms work reliably even when app is backgrounded/closed
// 2. Sound + haptic feedback when alarm fires
// 3. Proper integration with habit dropdown selection
// ============================================================================

// Check if native module is available
if (!alarmNativeModule) {
  console.warn('[HabitTimer] WARNING: Native alarm module is missing - falling back to JS timer');
} else {
  console.log('[HabitTimer] Native alarm module loaded successfully');
}

// Constants
const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width * 0.6, 220);
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ITEM_HEIGHT = Math.min(37, Math.floor(width * 0.05));
const VISIBLE_ITEMS = 3;

// ============================================================================
// CANONICAL ALARM STOP FUNCTION (using Alarmee)
// ============================================================================
// This function stops the alarm using the native module.
// The alarm sound and haptic feedback are handled by native AlarmService.kt.
// ============================================================================
const stopAlarmSafely = async () => {
  if (!alarmNativeModule) return;
  try {
    await stopAlarm();
  } catch (e) {
    console.warn('[HabitTimer] stopAlarm failed:', e);
  }
};

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeSwitchContainer: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
    marginHorizontal: 15,
  },
  modeSwitchBg: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary || colors.backgroundDefault,
    borderRadius: 30,
    width: Math.min(240, width * 0.7),
    height: 44,
    padding: 4,
    position: 'relative',
  },
  modeSwitchActive: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 25,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.18)',
  },
  modeOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  modeTextActive: {
    color: colors.buttonText || '#FFFFFF',
  },
  habitChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary || colors.backgroundDefault,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border || colors.backgroundTertiary,
    marginBottom: 20,
  },
  habitChipText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 10,
  },
  habitInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
    marginHorizontal: 15,
  },
  todayTotalText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: CIRCLE_SIZE,
    marginBottom: 15,
    position: 'relative',
    marginHorizontal: 15,
    marginTop: 10,
  },
  circleWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.3,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: Math.min(CIRCLE_SIZE * 0.75, width * 0.75),
    zIndex: 10,
  },
  pickerContainer: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
    width: 70,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 71,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  colon: {
    color: colors.textSecondary,
    fontSize: 20,
    marginBottom: 4,
    marginHorizontal: 2,
    opacity: 0.5,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 'auto',
    marginHorizontal: 15,
    paddingBottom: 45,
  },
  // Habit dropdown: make the chip absolute so opening the list won't shift layout.
  habitChipAbsolute: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 30,
  },
  habitDropdownAbsolute: {
    position: 'absolute',
    left: 15,
    right: 15,
    top: 44,
    zIndex: 40,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  stopButton: {
    backgroundColor: '#FF4444',
    shadowColor: '#FF4444',
  },
  secondaryControl: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  controlIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundSecondary || '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  controlLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  topTimeBox: {
    alignSelf: 'center',
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary || colors.backgroundDefault,
    minWidth: Math.min(200, width * 0.65),
    maxWidth: Math.min(480, width * 0.9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTimeBoxAlert: {
    backgroundColor: '#D32F2F',
  },
  timeText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  timeTextAlert: {
    color: colors.buttonText || '#FFFFFF',
  },
  countdownText: {
    fontSize: 41,
    fontWeight: 'bold',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  label: {
     color: colors.textSecondary,
     fontSize: 10,
     fontWeight: '600',
     marginBottom: 10
  }
});

// --- Animated SVG Component ---
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface PickerItemProps {
  item: any;
  index: number;
  scrollY: SharedValue<number>;
  textColor: string;
  themedStyles: any;
}

const PickerItem: React.FC<PickerItemProps> = React.memo(({ item, index, scrollY, textColor, themedStyles }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 2) * ITEM_HEIGHT,
      (index - 1) * ITEM_HEIGHT,
      index * ITEM_HEIGHT,
      (index + 1) * ITEM_HEIGHT,
      (index + 2) * ITEM_HEIGHT,
    ];

    const opacity = interpolate(
      scrollY.value,
      inputRange,
      [0, 0.3, 1, 0.3, 0],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      inputRange,
      [0.8, 0.9, 1.05, 0.9, 0.8],
      Extrapolation.CLAMP
    );

    const rotateX = interpolate(
      scrollY.value,
      inputRange,
      [30, 15, 0, -15, -30],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ perspective: 600 }, { rotateX: `${rotateX}deg` }, { scale }],
    };
  });

  return (
    <Animated.View style={[themedStyles.pickerItem, animatedStyle]}>
      <Text
        style={[
          themedStyles.pickerText,
          { 
            fontSize: Math.min(40, Math.floor(ITEM_HEIGHT * 0.9) + 8), 
            lineHeight: Math.floor(ITEM_HEIGHT * 0.95) + 2,
            color: textColor
          }
        ]}
      >
        {typeof item === 'number' ? item.toString().padStart(2, '0') : item}
      </Text>
    </Animated.View>
  );
});

interface WheelPickerProps {
  data: any[];
  value: any;
  onChange: (value: any) => void;
  disabled: boolean;
  textColor: string;
  themedStyles: any;
}

const WheelPicker: React.FC<WheelPickerProps> = React.memo(({ data, value, onChange, disabled, textColor, themedStyles }) => {
  const scrollY = useSharedValue(0);
  const flatListRef = useRef<FlatList<number>>(null);
  const [localValue, setLocalValue] = useState(value);

  // Sync initial scroll position and handle value changes
  useEffect(() => {
    if (flatListRef.current) {
      const index = data.findIndex((d: number) => d === value);
      if (index !== -1) {
        flatListRef.current.scrollToOffset({
          offset: index * ITEM_HEIGHT,
          animated: true
        });
        scrollY.value = index * ITEM_HEIGHT;
        setLocalValue(value);
      }
    }
  }, [value, data]);

  const onScroll = useCallback((event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }, [scrollY]);

  const onMomentumScrollEnd = useCallback((event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ITEM_HEIGHT);
    
    // Ensure index is within bounds
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
    const newValue = data[clampedIndex];
    
    if (newValue !== undefined && newValue !== localValue) {
      Haptics.selectionAsync();
      setLocalValue(newValue);
      onChange(newValue);
    }
  }, [data, localValue, onChange]);

  if (disabled) {
    return (
      <View style={themedStyles.pickerContainer}>
        <View style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={[
              themedStyles.pickerText,
              { 
                fontSize: Math.min(40, Math.floor(ITEM_HEIGHT * 0.9) + 8), 
                lineHeight: Math.floor(ITEM_HEIGHT * 0.95) + 2,
                color: textColor
              }
            ]}
          >{value.toString().padStart(2, '0')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themedStyles.pickerContainer}>
      <FlatList 
        // Ensure wheel is scrollable (it was getting "stuck" on some devices when
        // another view stole the responder)
        scrollEnabled={!disabled}
        keyboardShouldPersistTaps="handled"
        pointerEvents={disabled ? 'none' : 'auto'}
        // showsVerticalScrollIndicator already set above
        nestedScrollEnabled={true}
        ref={flatListRef}
        data={data}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item, index }) => (
          <PickerItem item={item} index={index} scrollY={scrollY} textColor={textColor} themedStyles={themedStyles} />
        )}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="center"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * ((VISIBLE_ITEMS - 1) / 2),
        }}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
    </View>
  );
});

// Custom hook to get previous value
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// Main Component
export default function HabitTimerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'HabitTimer'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'HabitTimer'>>();
  const params = route.params || {};
  const habitId = typeof params.habitId === 'string' ? parseInt(params.habitId) : (typeof params.habitId === 'number' ? params.habitId : null);
  const habitName = typeof params.habitName === 'string' ? params.habitName : 'Reading';
  
  const insets = useSafeAreaInsets();
  const { theme: colors, isDark } = useTheme();
  
  // Memoize styles to prevent unnecessary re-renders of children
  const themedStyles = useMemo(() => makeStyles(colors), [colors]);

  // Dropdown & current habit state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [availableHabits, setAvailableHabits] = useState<any[]>([]);
  const [currentHabitId, setCurrentHabitId] = useState<number | null>(habitId);
  const [currentHabitName, setCurrentHabitName] = useState<string>(habitName);
  const [currentHabitColor, setCurrentHabitColor] = useState<string>('#4CAF50');
  
  // State
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer');
  const [isRunning, setIsRunning] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(25 * 60);
  const [todayTotal, setTodayTotal] = useState(0);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Refs
  const originalDurationRef = useRef(25 * 60);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  const scheduledAlarmIdRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const finishTimerRef = useRef<(() => void) | null>(null);
  const hasCompletedRef = useRef(false);

  // Expo notification channels + Alarmee permission helpers removed in hard-reset migration.
  
  // Animations
  const modeAnim = useSharedValue(0);
  const playButtonScale = useSharedValue(1);
  const topPulse = useSharedValue(1);
  
  // Progress Animation
  const progressValue = useSharedValue(1);

  // Data arrays
  const hoursData = useMemo(() => Array.from({ length: 13 }, (_, i) => i), []);
  const minutesData = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const secondsData = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const getSessionKey = (id: number | null) => `habit_timer_session_${id}`;

  const formatDisplayTime = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds < 0) return '00:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const saveSessionToStorage = useCallback(async () => {
    if (!currentHabitId || !isRunning || !startTimeRef.current) return;
    const data = { 
      mode, 
      startTime: startTimeRef.current, 
      hours, 
      minutes, 
      seconds,
      habitId: currentHabitId,
      elapsed,
      remaining,
      originalDuration: originalDurationRef.current,
      notificationId: notificationIdRef.current,
      scheduledAlarmId: scheduledAlarmIdRef.current,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(getSessionKey(currentHabitId), JSON.stringify(data));
  }, [currentHabitId, isRunning, mode, hours, minutes, seconds, elapsed, remaining]);

  const clearSessionFromStorage = useCallback(async () => {
    if (currentHabitId) await AsyncStorage.removeItem(getSessionKey(currentHabitId));
  }, [currentHabitId]);

  const loadHabitData = useCallback(async (id?: number | null) => {
    const useId = id ?? currentHabitId;
    if (useId) {
      const total = await TimeTrackingService.getTodayTotalDuration(useId);
      setTodayTotal(total);
      try {
        const habit = await db.getHabitById(useId);
        if (habit) {
          setCurrentHabitColor(habit.color);
          setCurrentHabitName(habit.name);
        }
      } catch (error) {
        console.error('Failed to load habit data:', error);
      }
    }
  }, [currentHabitId]);

  const loadAvailableHabits = useCallback(async () => {
    try {
      const habits = await db.getActiveHabits();
      setAvailableHabits(habits || []);
      if (!currentHabitId && habits && habits.length > 0) {
        setCurrentHabitId(habits[0].id);
        setCurrentHabitName(habits[0].name);
        setCurrentHabitColor(habits[0].color);
      }
    } catch (e) {
      console.error('Failed to load habits', e);
    }
  }, [currentHabitId]);

  const restoreSession = useCallback(async (id?: number | null) => {
    const useId = id ?? currentHabitId;
    if (!useId || sessionRestored) return;
    
    console.log(`Restoring session for habit: ${useId}`); // Debug log
    
    try {
      const sessionData = await AsyncStorage.getItem(getSessionKey(useId));
      if (sessionData) {
        const { 
          mode: savedMode, 
          startTime,
          hours: savedHours = 0,
          minutes: savedMinutes = 0,
          seconds: savedSeconds = 0,
          elapsed: savedElapsed = 0,
          remaining: savedRemaining = 0,
          originalDuration,
          notificationId,
          scheduledAlarmId
        } = JSON.parse(sessionData);

        console.log('Found session data:', { savedMode, startTime, savedHours, savedMinutes, savedSeconds, savedElapsed, savedRemaining }); // Debug log

        setMode(savedMode);
        setHours(savedHours || 0);
        setMinutes(savedMinutes || 0);
        setSeconds(savedSeconds || 0);

        const now = Date.now();
        const timeSinceStart = startTime ? Math.floor((now - startTime) / 1000) : 0;

        if (savedMode === 'stopwatch') {
          const computedElapsed = startTime ? Math.floor((now - startTime) / 1000) : savedElapsed;
          setElapsed(computedElapsed);
          startTimeRef.current = startTime || (Date.now() - (computedElapsed * 1000));
          setIsRunning(true);
          
           if (intervalRef.current) clearInterval(intervalRef.current);
           // Allow the main tick effect (driven by `isRunning`) to create the interval.
           // Call one immediate UI update after state/refs are set.
           setTimeout(() => {
             // Uses latest refs/state via the main tick effect once running.
           }, 0);
           console.log(`Restored stopwatch with ${computedElapsed}s elapsed`); // Debug log
        } else {
          const totalDuration = (originalDuration !== undefined) ? originalDuration : ((savedHours * 3600) + (savedMinutes * 60) + (savedSeconds || 0));
          originalDurationRef.current = totalDuration;

          const newRemaining = startTime ? Math.max(0, totalDuration - timeSinceStart) : savedRemaining || totalDuration;
          setRemaining(newRemaining);

          if (newRemaining <= 0) {
            console.log('Timer already completed, finishing...'); // Debug log
            // Call finishTimer directly without dependency
            finishTimerRef.current?.();
          } else {
            startTimeRef.current = startTime || Date.now();
            setIsRunning(true);
            if (intervalRef.current) clearInterval(intervalRef.current);
            // Let the main tick effect recreate interval.
            console.log(`Restored timer with ${newRemaining}s remaining`); // Debug log
          }
        }

        if (notificationId) {
          notificationIdRef.current = notificationId;
        }
        if (scheduledAlarmId) {
          scheduledAlarmIdRef.current = scheduledAlarmId;
        }

        setSessionRestored(true);
      } else {
        console.log('No session data found'); // Debug log
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  }, [currentHabitId, sessionRestored]);

  const tick = useCallback(() => {
    if (!isRunning) return;
    const startTime = startTimeRef.current;
    if (!startTime) return;

    const now = Date.now();

    if (mode === 'stopwatch') {
      const newElapsed = Math.floor((now - startTime) / 1000);
      setElapsed(newElapsed);
      return;
    }

    const elapsedSinceStart = Math.floor((now - startTime) / 1000);
    const totalDuration = originalDurationRef.current;
    const newRemaining = Math.max(0, totalDuration - elapsedSinceStart);
    setRemaining(newRemaining);

    if (newRemaining === 0 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      finishTimerRef.current?.();
    }
  }, [isRunning, mode]);

  useEffect(() => {
    if (!isRunning) return;
    hasCompletedRef.current = false;
    tick();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, tick]);

  const ensureAlarmPreconditions = useCallback(async () => {
    // Precondition prompting is handled natively (SCHEDULE_EXACT_ALARM, battery optimizations guidance, etc.).
    return;
  }, []);

  const scheduleCompletionAlarm = useCallback(async (durationSeconds: number) => {
    if (!alarmNativeModule) return;
    const alarmId = `timer_${currentHabitId ?? 'unknown'}_${Date.now()}`;
    scheduledAlarmIdRef.current = alarmId;
    const triggerAtMillis = Date.now() + durationSeconds * 1000;
    console.log('[HabitTimer] Scheduling native alarm', { alarmId, triggerAtMillis, durationSeconds });
    await scheduleAlarm(triggerAtMillis, currentHabitName, currentHabitId?.toString() || 'unknown');
  }, [currentHabitId, currentHabitName]);

  const cancelCompletionAlarm = useCallback(async () => {
    if (!alarmNativeModule) return;
    const alarmId = scheduledAlarmIdRef.current;
    if (!isNonEmptyString(alarmId)) return;
    scheduledAlarmIdRef.current = null;
    try {
      console.log('[HabitTimer] Cancelling native alarm', { alarmId });
      await cancelAlarm(alarmId);
    } catch (e) {
      console.warn('[HabitTimer] cancelAlarm failed', e);
    }
  }, []);

  const pause = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Alarm scheduling is native; UI pause just pauses countdown.
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Expo notification-based alarm fallbacks removed.
    // FIX: Do not stop alarm visually on pause, only on explicit stop/reset
    // stopAlarmSafely(); 
    setIsRunning(false);
    clearSessionFromStorage();
  }, [clearSessionFromStorage]);

  const start = useCallback(async () => {
    if (isRunning) {
      pause();
      return;
    }

    if (mode === 'timer' && ((hours * 3600) + (minutes * 60) + seconds === 0)) {
      Alert.alert("Set Time", "Please set a duration first.");
      return;
    }

    // If native module is missing (Expo Go/dev client), allow JS-only timer.
    const canUseNative = !!alarmNativeModule;

    stopAlarmSafely();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Set the original duration before starting the timer
      const durationSeconds = mode === 'timer' ? (hours * 3600) + (minutes * 60) + seconds : 0;
      originalDurationRef.current = durationSeconds;

      await ensureAlarmPreconditions();
      
      if (!canUseNative) {
        console.warn('[HabitTimer] Native module missing: alarm will not fire when app is killed');
      }

      if (mode === 'timer') {
        if (canUseNative) {
          await scheduleCompletionAlarm(durationSeconds);
        }

        // No Expo notification scheduling fallback.
      }

      // Set start time
      startTimeRef.current = Date.now();
      
      // Initialize the timer values
      if (mode === 'timer') {
        setRemaining(durationSeconds);
      } else {
        setElapsed(0);
      }

      setIsRunning(true);
      saveSessionToStorage();
      
      console.log(`[HabitTimer] Timer started successfully: ${durationSeconds}s for habit ${currentHabitName}`);
    } catch (error) {
      console.error('[HabitTimer] Failed to start native timer:', error);
      Alert.alert(
        'Alarm System Error',
        "Failed to start alarm system. Please ensure you're using a production build."
      );
      return;
    }
  }, [isRunning, mode, hours, minutes, seconds, elapsed, currentHabitId, currentHabitName, pause, ensureAlarmPreconditions, scheduleCompletionAlarm, saveSessionToStorage]);


  const reset = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    // Reset is UI-only; native alarm cancel handled via cancelCompletionAlarm().
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Expo notification-based alarm fallbacks removed.

    await cancelCompletionAlarm();
    
    stopAlarmSafely();
    setIsAlarmPlaying(false);
    setIsRunning(false);
    
    startTimeRef.current = null;
    clearSessionFromStorage();

    if (mode === 'stopwatch') {
      setElapsed(0);
    } else {
      const currentPickerValue = (hours * 3600) + (minutes * 60) + seconds;
      setRemaining(currentPickerValue);
      originalDurationRef.current = currentPickerValue;
    }
  }, [mode, hours, minutes, seconds, clearSessionFromStorage, cancelCompletionAlarm]);

  const stopAlarmFromButton = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    stopAlarmSafely();
    setIsAlarmPlaying(false);
    reset();
  }, [reset]);

  // Removed unused startAlarmSequence to avoid dead code.

  const finishTimer = useCallback(async () => {
    if (mode === 'timer') setRemaining(0);

    await cancelCompletionAlarm();
    
    // Expo notification-based alarm fallbacks removed.
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Native foreground playback is handled by native AlarmService; JS finishes UI.
    
    setIsRunning(false);
    clearSessionFromStorage();
    startTimeRef.current = null;

    // Save session data first
    if (currentHabitId) {
      const endTime = Date.now();
      const durationSeconds = mode === 'timer' ? originalDurationRef.current : elapsed;
        
      try {
        await TimeTrackingService.saveSession({
          habitId: currentHabitId,
          durationSeconds,
          mode,
          startedAt: new Date(endTime - (durationSeconds * 1000)).toISOString(),
          endedAt: new Date(endTime).toISOString(),
          createdDate: format(new Date(), 'yyyy-MM-dd')
        });
          
        const newTotal = await TimeTrackingService.getTodayTotalDuration(currentHabitId);
        setTodayTotal(newTotal);
          
        Alert.alert(
          'Session Completed',
          `You spent ${Math.floor(durationSeconds / 60)} minutes on ${currentHabitName}`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('[HabitTimer] Failed to save session:', error);
      }
    }

    // Alarm feedback is handled by native alarm/notification systems.
    // Keep haptic feedback only to avoid exposing an unused sound toggle in the UI.
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('[HabitTimer] Haptic feedback failed', e);
    }

    // Foreground reliability: trigger haptic feedback immediately.
    // Background/killed reliability: ensured by the scheduled notification channel.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  
    setRemaining(originalDurationRef.current);
  }, [mode, currentHabitId, currentHabitName, elapsed, clearSessionFromStorage, cancelCompletionAlarm]);

  // Set the ref for finishTimer
  useEffect(() => {
    finishTimerRef.current = finishTimer;
  }, [finishTimer]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - recalculate elapsed time
        if (isRunning && startTimeRef.current) {
          const now = Date.now();
          const timeSinceStart = Math.floor((now - startTimeRef.current) / 1000);
          
          if (mode === 'stopwatch') {
            setElapsed(timeSinceStart);
          } else {
            const newRemaining = Math.max(0, originalDurationRef.current - timeSinceStart);
            setRemaining(newRemaining);
            
            if (newRemaining <= 0) {
              finishTimer();
            }
          }
        }
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App went to background - save current state
        saveSessionToStorage();
      }
      appStateRef.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, [isRunning, mode, saveSessionToStorage, finishTimer]);

  // Note: native completion events are handled by the native module itself.
  // We avoid registering duplicate listeners here to prevent double-finish side effects.
  
  // Effects
  useEffect(() => {
    loadAvailableHabits();
    loadHabitData(currentHabitId);
  }, [currentHabitId, loadAvailableHabits, loadHabitData]);
  
  useEffect(() => {
    restoreSession(currentHabitId);
  }, [currentHabitId, sessionRestored, restoreSession]);
  
  useEffect(() => {
    modeAnim.value = withSpring(mode === 'timer' ? 0 : 1, { damping: 15 });
    
    // FIX: Do NOT call reset() here as it triggers native side effects.
    // Instead, perform a local UI reset only if not running.
    if (!isRunning) {
        startTimeRef.current = null;
        if (mode === 'timer') {
            setHours(0);
            setMinutes(25);
            setSeconds(0);
            setRemaining(25 * 60);
            originalDurationRef.current = 25 * 60;
        } else {
            setElapsed(0);
        }
    }
  }, [mode, isRunning]);

  useEffect(() => {
    if (mode === 'timer') {
      const total = originalDurationRef.current || 1;
      const current = remaining;
      progressValue.value = withTiming(current / total, { duration: 1000 });
    } else {
        progressValue.value = 1; 
    }
  }, [remaining, mode]);
  
  useEffect(() => {
    // Only update remaining if timer is NOT running and NOT just restored
    // This ensures the picker updates the duration preview
    if (!isRunning && mode === 'timer' && startTimeRef.current === null) {
      const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
      setRemaining(totalSeconds);
      originalDurationRef.current = totalSeconds;
    }
  }, [hours, minutes, seconds, isRunning, mode]);

  const isAlmostDone = mode === 'timer' && remaining > 0 && remaining <= 10;
  const timerReachedZero = mode === 'timer' && remaining <= 0;
  
  const canReset = isRunning || startTimeRef.current !== null || elapsed > 0 || isAlarmPlaying;

  useEffect(() => {
    if (timerReachedZero) {
      topPulse.value = withTiming(1, { duration: 0 });
    } else if (isAlmostDone && isRunning) {
      topPulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 300 }),
          withTiming(1, { duration: 300 })
        ),
        -1,
        true
      );
    } else {
      topPulse.value = withTiming(1);
    }
  }, [isAlmostDone, isRunning, timerReachedZero]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelCompletionAlarm();
      stopAlarmSafely();
      // Avoid setState during unmount.
    };
  }, [cancelCompletionAlarm]);

  // Animated Styles
  const topBoxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: topPulse.value }]
  }));

  const strokeDashoffset = useDerivedValue(() => {
    'worklet';
    return interpolate(
      progressValue.value,
      [0, 1],
      [CIRCUMFERENCE, 0]
    );
  });

  const isTimerActive = isRunning || (mode === 'timer' && startTimeRef.current !== null) || (mode === 'stopwatch' && elapsed > 0);

  // Memoize picker handlers to prevent re-creating WheelPicker
  const handleHoursChange = useCallback((val: number) => setHours(val), []);
  const handleMinutesChange = useCallback((val: number) => setMinutes(val), []);
  const handleSecondsChange = useCallback((val: number) => setSeconds(val), []);

  return (
    <LinearGradient
      colors={[colors.backgroundRoot || '#FFFFFF', colors.backgroundDefault || '#F8F9FA']}
      style={themedStyles.container}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, paddingBottom: insets.bottom + 30 }}>
        <View>
          {/* APP BAR */}
          <View style={[themedStyles.appBar, { marginTop: insets.top }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={themedStyles.iconButton}>
              <Feather name="chevron-down" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={themedStyles.title}>{currentHabitName}</Text>
            <TouchableOpacity style={themedStyles.iconButton}>
              <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* TOP TIME DISPLAY */}
          <Animated.View style={[themedStyles.topTimeBox, isAlmostDone ? themedStyles.topTimeBoxAlert : null, topBoxAnimatedStyle]}>
            <Text style={[themedStyles.timeText, isAlmostDone ? themedStyles.timeTextAlert : null]} numberOfLines={1} ellipsizeMode="clip">
              {formatDisplayTime(mode === 'stopwatch' ? elapsed : remaining)}
            </Text>
            <Text style={[themedStyles.todayTotalText, isAlmostDone ? themedStyles.timeTextAlert : null]} numberOfLines={1} ellipsizeMode="clip">
              {currentHabitName} - Today: {Math.floor(todayTotal / 60)}m {todayTotal % 60}s
            </Text>
          </Animated.View>

          {/* MODE SWITCH */}
          <View style={themedStyles.modeSwitchContainer}>
            <View style={themedStyles.modeSwitchBg}>
              <Animated.View style={[themedStyles.modeSwitchActive, {
                left: mode === 'timer' ? 4 : '50%',
                width: '48%'
              }]} />
              <TouchableOpacity 
                style={themedStyles.modeOption} 
                onPress={() => !isRunning && setMode('timer')}
                activeOpacity={0.8}
              >
                <Text style={[themedStyles.modeText, mode === 'timer' && themedStyles.modeTextActive]}>Timer</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={themedStyles.modeOption} 
                onPress={() => !isRunning && setMode('stopwatch')}
                activeOpacity={0.8}
              >
                <Text style={[themedStyles.modeText, mode === 'stopwatch' && themedStyles.modeTextActive]}>Stopwatch</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* HABIT INFO WITH DROPDOWN */}
          <View style={themedStyles.habitInfoContainer}>
            <TouchableOpacity style={[themedStyles.habitChip, themedStyles.habitChipAbsolute]} activeOpacity={0.8} onPress={() => setIsDropdownOpen(prev => !prev)}>
              <Feather name="book" size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={themedStyles.habitChipText}>{currentHabitName}</Text>
              <Feather name="chevron-down" size={14} color={colors.primary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            
            <Text style={themedStyles.todayTotalText}>Today: {formatMinutes(Math.floor(todayTotal / 60))}</Text>
          </View>
          {isDropdownOpen && (
            <View style={[
              {
                backgroundColor: colors.backgroundDefault || '#FFF',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border || '#DDD',
                maxHeight: 220,
                paddingVertical: 6,
              },
              themedStyles.habitDropdownAbsolute,
            ]}>
              <FlatList
                data={availableHabits}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{ paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}
                    onPress={async () => {
                      console.log('Selecting habit:', item.id, item.name); // Debug log
                      setCurrentHabitId(item.id);
                      setCurrentHabitName(item.name);
                      setCurrentHabitColor(item.color || colors.primary);
                      setIsDropdownOpen(false);
                      
                      // Load habit data and restore session sequentially
                      try {
                        await loadHabitData(item.id);
                        await restoreSession(item.id);
                        console.log('Habit selection completed'); // Debug log
                      } catch (error) {
                        console.error('Error selecting habit:', error);
                      }
                    }}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color || colors.primary, marginRight: 10 }} />
                    <Text style={{ color: colors.text }}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* MAIN TIMER CIRCLE */}
          <View style={themedStyles.timerContainer}>
            <View style={themedStyles.circleWrapper}>
                <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                    <Circle
                        cx={CIRCLE_SIZE / 2}
                        cy={CIRCLE_SIZE / 2}
                        r={RADIUS}
                        stroke={colors.border || '#E0E0E0'}
                        strokeWidth={STROKE_WIDTH}
                        fill="none"
                    />
                    <G rotation="-90" origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}>
                        <AnimatedCircle
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={RADIUS}
                            stroke={colors.primary}
                            strokeWidth={STROKE_WIDTH}
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                            strokeDashoffset={strokeDashoffset.value}
                        />
                    </G>
                </Svg>
            </View>

            <View style={themedStyles.circleWrapper}>
                {isTimerActive ? (
                    <Text style={themedStyles.countdownText}>
                        {formatDisplayTime(mode === 'stopwatch' ? elapsed : remaining)}
                    </Text>
                ) : (
                    mode === 'timer' ? (
                        <View style={themedStyles.pickerWrapper}>
                             <View style={{ alignItems: 'center' }}>
                                <Text style={themedStyles.label}>HR</Text>
                                <WheelPicker 
                                    data={hoursData} 
                                    value={hours} 
                                    onChange={handleHoursChange} 
                                    disabled={isRunning} 
                                    textColor={colors.text}
                                    themedStyles={themedStyles}
                                />
                             </View>
                            <Text style={themedStyles.colon}>:</Text>
                            
                            <View style={{ alignItems: 'center' }}>
                                <Text style={themedStyles.label}>MIN</Text>
                                <WheelPicker 
                                    data={minutesData} 
                                    value={minutes} 
                                    onChange={handleMinutesChange} 
                                    disabled={isRunning} 
                                    textColor={colors.text}
                                    themedStyles={themedStyles}
                                />
                            </View>
                            <Text style={themedStyles.colon}>:</Text>

                             <View style={{ alignItems: 'center' }}>
                                <Text style={themedStyles.label}>SEC</Text>
                                <WheelPicker 
                                    data={secondsData} 
                                    value={seconds} 
                                    onChange={handleSecondsChange} 
                                    disabled={isRunning} 
                                    textColor={colors.text}
                                    themedStyles={themedStyles}
                                />
                             </View>
                        </View>
                    ) : (
                        <Text style={themedStyles.countdownText}>00:00:00</Text>
                    )
                )}
            </View>
          </View>

          {/* CONTROLS */}
          <View style={themedStyles.controlsContainer}>
             <TouchableOpacity 
                activeOpacity={0.8}
                onPress={isAlarmPlaying ? stopAlarmFromButton : start}
                style={[themedStyles.playButton, isAlarmPlaying && themedStyles.stopButton]}
              >
                <Ionicons 
                    name={isAlarmPlaying ? "square" : (isRunning ? "pause" : "play")} 
                    size={32} 
                    color="#FFFFFF" 
                    style={{ marginLeft: (isRunning || isAlarmPlaying) ? 0 : 4 }}
                />
             </TouchableOpacity>

             <TouchableOpacity 
                style={[themedStyles.secondaryControl, { opacity: canReset ? 1 : 0.5 }]} 
                onPress={reset}
                disabled={!canReset}
              >
                <View style={themedStyles.controlIconCircle}>
                    <Ionicons name="refresh" size={22} color={colors.text} />
                </View>
                <Text style={themedStyles.controlLabel}>Reset</Text>
              </TouchableOpacity>
          </View>

        </View>
      </View>
    </LinearGradient>
  );
}
