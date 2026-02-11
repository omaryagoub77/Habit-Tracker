import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

export const ModeSwitch = ({ 
  mode, 
  setMode, 
  disabled 
}: { 
  mode: 'timer' | 'stopwatch'; 
  setMode: (mode: 'timer' | 'stopwatch') => void; 
  disabled?: boolean;
}) => {
  const { theme } = useTheme();
  
  const handlePress = (newMode: 'timer' | 'stopwatch') => {
    if (disabled || mode === newMode) return;
    Haptics.selectionAsync();
    setMode(newMode);
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <TouchableOpacity 
        style={[styles.button, mode === 'stopwatch' && { backgroundColor: theme.backgroundRoot }]} 
        onPress={() => handlePress('stopwatch')}
      >
        <Text style={[styles.text, { color: theme.textSecondary }, mode === 'stopwatch' && { color: theme.text }]}>
          Stopwatch
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.button, mode === 'timer' && { backgroundColor: theme.backgroundRoot }]} 
        onPress={() => handlePress('timer')}
      >
        <Text style={[styles.text, { color: theme.textSecondary }, mode === 'timer' && { color: theme.text }]}>
          Timer
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexDirection: 'row', 
    borderRadius: 12, 
    padding: 4, 
    margin: 20 
  },
  button: { 
    flex: 1, 
    padding: 10, 
    alignItems: 'center', 
    borderRadius: 10 
  },
  text: { 
    fontWeight: '600' 
  },
});