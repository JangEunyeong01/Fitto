import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../../theme/useTheme';
import { alpha, motion, typography } from '../../../theme/tokens';

const CUP_W = 86;
const CUP_H = 112;

interface WaterCupProps {
  progress: number; // 0..1
  percent: number;
  onPress: () => void;
}

/**
 * 물 카드 컵(86×112, 모서리 14 14 22 22). 아래에서 위로 옅은 파랑 단색이 차오르고 가운데 퍼센트.
 * 예전엔 파랑 그라데이션 물 + 수면 물결 애니메이션이었는데, 홈에서 혼자 요란해서 장식을 걷었다.
 * 채워지는 높이만 부드럽게 움직인다.
 */
export default function WaterCup({ progress, percent, onPress }: WaterCupProps) {
  const { colors, brand } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: clamped * CUP_H,
      duration: motion.gaugeFill,
      easing: Easing.bezier(...motion.gaugeEasing),
      useNativeDriver: false, // height 애니메이션
    }).start();
  }, [clamped]);

  return (
    <Pressable onPress={onPress} style={styles.press} accessibilityRole="button" accessibilityLabel={`물 ${percent}%, 눌러서 한 잔 기록`}>
      <View style={[styles.cup, { borderColor: colors.borderInput, backgroundColor: colors.surfaceSubtle }]}>
        {/* 퍼센트 글씨가 물 위에서도 읽히도록 옅게 칠한다. */}
        <Animated.View style={[styles.fill, { height: fill, backgroundColor: alpha(brand.blue, 0.45) }]} />
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
    borderWidth: 1.5,
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
