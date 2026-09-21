import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/useTheme';
import { motion, typography } from '../../../theme/tokens';

const CUP_W = 86;
const CUP_H = 112;
const WAVE_H = 18;
const BUMP = 24; // 물결 한 주기 폭 (원본 background-size: 24px 18px)

interface WaterCupProps {
  progress: number; // 0..1
  percent: number;
  onPress: () => void;
}

/**
 * README 물 카드 B안: 86×112 컵, r `14 14 22 22`, 아래에서 위로 채워지고
 * 수면에 물결 애니메이션(fwave 2.6s linear infinite), 중앙에 퍼센트.
 * 원본의 repeat-x radial-gradient 수면은 RN에 없어 SVG 원을 반복해 같은 모양을 만든다.
 */
export default function WaterCup({ progress, percent, onPress }: WaterCupProps) {
  const { colors, brand } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));

  const fill = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: clamped * CUP_H,
      duration: motion.gaugeFill,
      easing: Easing.bezier(...motion.gaugeEasing),
      useNativeDriver: false, // height 애니메이션
    }).start();
  }, [clamped]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: motion.wave,
        easing: Easing.linear,
        useNativeDriver: true, // 수면은 translateX만 움직이므로 네이티브 드라이버로 돌린다
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const waveX = wave.interpolate({ inputRange: [0, 1], outputRange: [0, -BUMP] });
  const bumps = Math.ceil((CUP_W * 2) / BUMP) + 1;

  return (
    <Pressable onPress={onPress} style={styles.press}>
      <View style={[styles.cup, { borderColor: colors.borderGlass, backgroundColor: colors.surfaceSubtle }]}>
        <Animated.View style={[styles.fill, { height: fill }]}>
          <LinearGradient
            colors={[brand.blue, brand.blueDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.wave, { transform: [{ translateX: waveX }] }]}>
            <Svg width={CUP_W * 2} height={WAVE_H}>
              {Array.from({ length: bumps }).map((_, i) => (
                <Circle key={i} cx={i * BUMP + 12} cy={WAVE_H / 2} r={9} fill="rgba(255,255,255,0.75)" />
              ))}
            </Svg>
          </Animated.View>
        </Animated.View>

        <View style={styles.pctWrap} pointerEvents="none">
          <Text style={[styles.pct, { color: colors.textPrimary }]}>{percent}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    width: CUP_W,
    height: CUP_H,
  },
  cup: {
    width: CUP_W,
    height: CUP_H,
    borderWidth: 1,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
  },
  wave: {
    position: 'absolute',
    top: -WAVE_H / 2,
    left: 0,
    width: CUP_W * 2,
    height: WAVE_H,
  },
  pctWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: typography.value,
});
