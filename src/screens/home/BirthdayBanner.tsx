import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';

interface BirthdayBannerProps {
  name: string;
  onPress: () => void;
}

/**
 * 생일 당일 홈 헤더 아래 한 줄. 누르면 축하 알림창이 열린다.
 * 예전엔 라벤더→피치 그라데이션 + 색 네모였는데, 그라데이션은 홈 배경에만 둔다(시안 규칙 10).
 * 다른 카드와 같은 면에 글씨와 › 하나 — 목록 줄처럼 읽힌다.
 */
export default function BirthdayBanner({ name, onPress }: BirthdayBannerProps) {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.wrap} noPadding>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.fillMuted }]}
      >
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            오늘은 {name}님의 생일이에요
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            피또의 축하 메시지 열어보기
          </Text>
        </View>
        <Icon name="chevronRight" size={16} color={colors.textSecondary} />
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: typography.value,
  sub: {
    ...typography.caption,
    marginTop: 2,
  },
});
