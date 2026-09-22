import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/useTheme';
import { alpha, timeSlots } from '../theme/tokens';
import { getTimeSlot } from '../utils/timeOfDay';

interface ScreenBackgroundProps {
  children?: React.ReactNode;
  showTimeGradient?: boolean;
  /**
   * 색이 깔리는 높이. 홈은 인사·브리핑까지(기본값), 다른 탭은 제목 줄까지만 쓴다.
   * 상세 화면은 `showTimeGradient={false}`로 아예 끈다.
   */
  gradientHeight?: number;
}

/** 홈: 로고 + 인사 + 브리핑이 들어가는 높이. */
export const HEADER_GRADIENT_HEIGHT = 260;
/** 식단·헬스·설정: 화면 제목 줄만 덮는다. */
export const TITLE_GRADIENT_HEIGHT = 130;

/**
 * 화면 바탕.
 *
 * 색은 **위쪽 한 덩어리에만** 깐다. 아래는 고정 배경 + 흰 카드다.
 * 예전에는 화면 위 300px에 옅은 그라데이션을 깔았는데, 카드가 그 위를 지나면서
 * 같은 회색 글씨가 카드 위치마다 다르게 보였다. 시간대 색(피또의 인상)은 그대로 살리되
 * 대비가 흔들리는 구간을 없앴다.
 */
export default function ScreenBackground({
  children,
  showTimeGradient = true,
  gradientHeight = HEADER_GRADIENT_HEIGHT,
}: ScreenBackgroundProps) {
  const { colors, mode } = useTheme();
  const slot = getTimeSlot();
  const color = timeSlots[slot].color;

  // 다크 모드에서는 같은 색을 옅게 쓴다. 밝은 면이 넓으면 어두운 화면에서 눈이 부시다.
  const top = mode === 'dark' ? 0.22 : 0.5;
  const mid = mode === 'dark' ? 0.12 : 0.28;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {showTimeGradient && (
        <LinearGradient
          pointerEvents="none"
          // 끝에서 배경색으로 떨어뜨린다. 투명으로 끝내면 경계가 어디인지 흐려진다.
          colors={[alpha(color, top), alpha(color, mid), colors.bg]}
          locations={[0, 0.55, 1]}
          style={[styles.headerGradient, { height: gradientHeight }]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
