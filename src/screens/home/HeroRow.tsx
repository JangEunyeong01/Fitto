import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { timeSlots, typography, weight } from '../../theme/tokens';
import { getTimeSlot } from '../../utils/timeOfDay';
import { useAppStore } from '../../store/useAppStore';
import { dateKey } from '../../utils/timeOfDay';
import { sumMealKcal } from '../../utils/health';
import { personaCopy, personaLabel } from '../../copy/persona';
import FittoCharacter from '../../components/FittoCharacter';

export default function HeroRow() {
  const { colors } = useTheme();
  const persona = useAppStore((s) => s.persona);
  const goals = useAppStore((s) => s.goals);
  const record = useAppStore((s) => s.dailyRecords[dateKey()]);

  const water = record?.water ?? 0;
  const consumedKcal = record ? sumMealKcal(record.meals) : 0;
  const remainKcal = Math.max(0, goals.kcal - consumedKcal);
  const remainWater = Math.max(0, goals.water - water);
  const slot = getTimeSlot();

  const greetingFn = personaCopy.homeGreeting[persona] as (v: {
    remainKcal: number;
    remainWater: number;
    consumedKcal: number;
    currentWater: number;
  }) => string;
  const greeting = greetingFn({ remainKcal, remainWater, consumedKcal, currentWater: water });

  return (
    <View style={styles.row}>
      <FittoCharacter current={water} goal={goals.water} size={78} glowSize={92} />
      <View style={styles.textCol}>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {timeSlots[slot].greeting} · {personaLabel[persona]}
        </Text>
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>{greeting}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
    marginBottom: 18,
    marginHorizontal: 2,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  meta: typography.label,
  greeting: {
    fontSize: 17,
    ...weight(700),
    lineHeight: 16.5 * 1.42,
  },
});
