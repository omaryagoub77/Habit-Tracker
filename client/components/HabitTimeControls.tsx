import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

export const HabitTimeControls = ({ 
  isRunning, 
  onStart, 
  onPause, 
  onReset, 
  canStart 
}: { 
  isRunning: boolean; 
  onStart: () => void; 
  onPause: () => void; 
  onReset: () => void; 
  canStart: boolean;
}) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.btn, styles.reset, { backgroundColor: theme.backgroundSecondary }]} 
        onPress={() => { 
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); 
          onReset(); 
        }}
      >
        <Ionicons name="stop" size={24} color={theme.error} />
      </TouchableOpacity>
      
      {isRunning ? (
        <TouchableOpacity 
          style={[styles.mainBtn, { backgroundColor: theme.primary }]} 
          onPress={() => { 
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
            onPause(); 
          }}
        >
          <Ionicons name="pause" size={40} color={theme.buttonText} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[styles.mainBtn, !canStart && { backgroundColor: theme.textSecondary }, { backgroundColor: canStart ? theme.primary : undefined }]} 
          disabled={!canStart} 
          onPress={() => { 
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
            onStart(); 
          }}
        >
          <Ionicons name="play" size={40} color={theme.buttonText} />
        </TouchableOpacity>
      )}
      
      <View style={{ width: 60 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexDirection: 'row', 
    justifyContent: 'space-evenly', 
    alignItems: 'center', 
    width: '100%', 
    marginBottom: 30 
  },
  mainBtn: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  btn: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  reset: { 
  },
  disabled: { 
  }
});