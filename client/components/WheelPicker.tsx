import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { Spacing, BorderRadius } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WheelPickerProps {
  options: string[];
  selectedIndex: number;
  onValueChange: (index: number) => void;
  itemHeight?: number;
  visibleItems?: number;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({
  options,
  selectedIndex,
  onValueChange,
  itemHeight = 40,
  visibleItems = 3,
}) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [selected, setSelected] = useState(selectedIndex);
  const [scrolling, setScrolling] = useState(false);
  
  const focusedIndex = useSharedValue(selectedIndex);

  useEffect(() => {
    setSelected(selectedIndex);
    focusedIndex.value = selectedIndex;
    // Scroll to the selected index when it changes
    setTimeout(() => {
      if (scrollViewRef.current && options.length > 0) {
        scrollViewRef.current.scrollTo({
          y: selectedIndex * itemHeight,
          animated: false,
        });
      }
    }, 0);
  }, [selectedIndex, options.length, itemHeight]);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);
    
    if (index >= 0 && index < options.length && !scrolling) {
      setScrolling(true);
      setSelected(index);
      focusedIndex.value = index;
    }
  };

  const handleScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(options.length - 1, index));

    // Scroll to the exact position of the selected item
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: clampedIndex * itemHeight,
        animated: true,
      });
    }

    setTimeout(() => {
      setSelected(clampedIndex);
      focusedIndex.value = clampedIndex;
      onValueChange(clampedIndex);
      setScrolling(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 100);
  };

  const getOpacity = (index: number) => {
    const diff = Math.abs(index - selected);
    if (diff === 0) return 1;
    if (diff === 1) return 0.6;
    return 0.3;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.highlight, { height: itemHeight, backgroundColor: `${theme.primary}20` }]} pointerEvents="none" />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((option, index) => {
          const animatedStyle = useAnimatedStyle(() => {
            const opacity = interpolate(
              focusedIndex.value,
              [index - 1, index, index + 1],
              [0.3, 1, 0.3],
              Extrapolate.CLAMP
            );
            
            const scale = interpolate(
              focusedIndex.value,
              [index - 1, index, index + 1],
              [0.9, 1.1, 0.9],
              Extrapolate.CLAMP
            );
            
            return {
              opacity,
              transform: [{ scale }],
            };
          });

          return (
            <Animated.View 
              key={index} 
              style={[
                styles.itemContainer, 
                { height: itemHeight },
                animatedStyle
              ]}
            >
              <Text style={[styles.itemText, { color: theme.text }]}>{option}</Text>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 120,
    width: 80,
    overflow: 'hidden',
    position: 'relative',
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 40,
  },
  highlight: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    transform: [{ translateY: -20 }],
    backgroundColor: 'transparent', // Will be set dynamically in component
    borderRadius: BorderRadius.sm,
    zIndex: 1,
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});