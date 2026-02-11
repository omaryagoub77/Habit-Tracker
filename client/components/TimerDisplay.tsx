import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export const TimerDisplay = ({ seconds }: { seconds: number }) => {
  const { theme } = useTheme();
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)} : ${pad(m)} : ${pad(s)}`;
  };
  
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: theme.text }]}>{formatTime(seconds < 0 ? 0 : seconds)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    paddingVertical: 40, 
    alignItems: 'center' 
  },
  text: { 
    fontSize: 64, 
    fontWeight: '700', 
    fontVariant: ['tabular-nums']
  },
});