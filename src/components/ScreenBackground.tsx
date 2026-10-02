import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/useTheme';
import { alpha, timeSlots } from '../theme/tokens';
import { getTimeSlot } from '../utils/timeOfDay';

interface ScreenBackgroundProps {
  children?: React.ReactNode;
  /**
   * 시간대 색을 깔지. **홈에서만 켠다**(시안 규칙 10). 식단·헬스·설정·상세 화면은 바탕색 그대로다.
   * 탭마다 색이 깔리면 화면을 옮길 때마다 인상이 바뀌어서, 시간대 색은 "홈에 들어왔다"는 신호로만 쓴다.
   */
  showTimeGradient?: boolean;
}

/** 홈: 로고 + 인사 + 브리핑이 들어가는 높이. */
const GRADIENT_HEIGHT = 260;

/**
 * 화면 바탕.
 *
 * 색은 **위쪽 한 덩어리에만** 깐다. 아래는 고정 배경 + 흰 카드다.
 * 예전에는 화면 위 300px에 옅은 그라데이션을 깔았는데, 카드가 그 위를 지나면서
 * 같은 회색 글씨가 카드 위치마다 다르게 보였다. 시간대 색(피또의 인상)은 그대로 살리되
 * 대비가 흔들리는 구간을 없앴다.
 */
export default function ScreenBackground({ children, showTimeGradient = true }: ScreenBackgroundProps) {
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
          style={styles.headerGradient}
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
    height: GRADIENT_HEIGHT,
    top: 0,
    left: 0,
    right: 0,
  },
});
