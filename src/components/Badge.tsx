import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { alpha, brand, semantic, typography } from '../theme/tokens';

/** 상태 배지(UI 기준서 5-6). 면은 상태 색 16%, 글씨는 같은 상태의 글씨 색. */
export type BadgeTone = 'neutral' | 'info' | 'good' | 'warn' | 'danger';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** 상태가 아닌 장식 배지(카테고리 색 등)에서만 직접 넘긴다. */
  color?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * 작은 알약 라벨. "룰 기반", 알레르기 태그, 준비 중 표시 등에 쓴다.
 * 예전에는 배경과 글씨 색을 호출부가 제각각 넘겨서 대비가 들쭉날쭉했다. 상태는 tone으로 고른다.
 */
export default function Badge({ label, tone = 'neutral', color, textColor, style }: BadgeProps) {
  const { colors } = useTheme();

  const toneStyle: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.fillMuted, fg: colors.textSecondary },
    info: { bg: alpha(brand.blue, 0.18), fg: colors.textAccent },
    good: { bg: alpha(semantic.good, 0.16), fg: colors.textGood },
    warn: { bg: alpha(semantic.warn, 0.16), fg: colors.textWarn },
    danger: { bg: alpha(semantic.danger, 0.16), fg: colors.textDanger },
  };

  return (
    <View style={[styles.wrap, { backgroundColor: color ?? toneStyle[tone].bg }, style]}>
      <Text style={[typography.badge, { color: textColor ?? toneStyle[tone].fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
});
