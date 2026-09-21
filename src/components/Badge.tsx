import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { typography } from '../theme/tokens';

interface BadgeProps {
  label: string;
  /** 배경색. 안 주면 카드 위 중립 배경(ink)을 쓴다. */
  color?: string;
  /** 글씨색. 안 주면 보조 텍스트색. */
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * 작은 알약 라벨. V2 표시, "룰 기반", 알레르기 태그, 권장 대비 차이(%p) 등에 쓴다.
 * 화면마다 패딩과 radius가 조금씩 달랐어서 하나로 모았다.
 */
export default function Badge({ label, color, textColor, style }: BadgeProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: color ?? colors.fillMuted }, style]}>
      <Text style={[typography.badge, { color: textColor ?? colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
});
