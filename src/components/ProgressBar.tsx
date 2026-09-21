import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/useTheme';
import { motion } from '../theme/tokens';

interface ProgressBarProps {
  progress: number; // 0..1
  height?: number;
  radius?: number;
  gradientColors?: readonly [string, string, ...string[]];
  color?: string;
}

// Reanimated 4는 react-native-web에서 useAnimatedStyle 갱신이 반영되지 않아
// 이 앱의 단순 타이밍 애니메이션은 RN 내장 Animated를 쓴다(웹·네이티브 동일 동작).
export default function ProgressBar({ progress, height = 9, radius = 6, gradientColors, color }: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: motion.gaugeFill,
      easing: Easing.bezier(...motion.gaugeEasing),
      useNativeDriver: false, // width 애니메이션은 네이티브 드라이버 미지원
    }).start();
  }, [clamped]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, borderRadius: radius, backgroundColor: colors.fillMuted }]}>
      <Animated.View style={[styles.fill, { borderRadius: radius, width }]}>
        {gradientColors ? (
          <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color ?? colors.textPrimary }]} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
  },
});
