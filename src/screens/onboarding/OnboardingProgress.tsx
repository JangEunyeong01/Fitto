import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ProgressBar from '../../components/ProgressBar';
import { useTheme } from '../../theme/useTheme';
import { accentGradient, tabularNums, typography } from '../../theme/tokens';

interface OnboardingProgressProps {
  /** 0..1. 인트로·완료를 포함한 전체 화면 기준이라 바는 끊김 없이 찬다. */
  progress: number;
  /** 번호가 붙는 단계일 때만. 인트로와 완료 화면은 STEP 번호가 없어 비운다. */
  stepNumber?: number;
  stepTotal: number;
}

/**
 * 온보딩 진행 표시.
 * 원래는 화면 수만큼 칸을 나눴는데 9칸이면 폭 375px에서 한 칸이 35px밖에 안 돼
 * 몇 번째인지 읽히지 않았다. 채워지는 바 하나(비율)와 숫자(정확한 위치)로 나눈다.
 */
export default function OnboardingProgress({ progress, stepNumber, stepTotal }: OnboardingProgressProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.barWrap}>
        <ProgressBar progress={progress} height={5} radius={3} gradientColors={accentGradient} />
      </View>
      {/* 숫자가 없는 화면에서도 자리는 남겨둬야 바 길이가 안 흔들린다. */}
      <Text style={[styles.count, { color: colors.textSecondary }]}>
        {stepNumber ? `${stepNumber} / ${stepTotal}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barWrap: {
    flex: 1,
  },
  count: {
    ...typography.label,
    // 단계를 넘길 때 숫자 폭이 흔들리지 않게 고정폭 숫자를 쓴다.
    fontVariant: tabularNums,
    minWidth: 34,
    textAlign: 'right',
  },
});
