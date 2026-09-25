import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GlassCard from '../../../components/GlassCard';
import Icon from '../../../components/Icon';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/tokens';
import { useAppStore } from '../../../store/useAppStore';
import { dateKey } from '../../../utils/timeOfDay';
import { getCycleDayNumber, getDaysUntilFertile } from '../../../utils/periodCycle';

export default function PeriodCard() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const settings = useAppStore((s) => s.periodSettings);

  const today = dateKey();
  const cycleDay = getCycleDayNumber(today, settings);
  const untilFertile = getDaysUntilFertile(today, settings);
  const subtitle = untilFertile === 0 ? `${cycleDay}일차 · 가임기` : `${cycleDay}일차 · 가임기까지 ${untilFertile}일`;

  return (
    <Pressable onPress={() => navigation.navigate('PeriodDetail')} accessibilityRole="button">
      <GlassCard>
        <View style={styles.row}>
          {/* 아이콘은 색 칸 없이 선만(시안 규칙 6). 예전의 그라데이션 D+ 배지는 아래 "N일차"와 같은 정보였다. */}
          <Icon name="moon" size={24} color={colors.textPrimary} />
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>생리 주기</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>{subtitle}</Text>
          </View>
          <Icon name="chevronRight" size={16} color={colors.textSecondary} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: typography.cardTitle,
  sub: typography.bodySm,
});
