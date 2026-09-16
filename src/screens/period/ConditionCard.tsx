import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import SelectChip from '../../components/SelectChip';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';
import { useAppStore, type DailyRecord } from '../../store/useAppStore';
import { SYMPTOM_TAGS } from '../../constants/codes';

const CONDITIONS: { value: NonNullable<DailyRecord['periodCondition']>; label: string }[] = [
  { value: 'good', label: '좋음' },
  { value: 'normal', label: '보통' },
  { value: 'bad', label: '나쁨' },
];


interface ConditionCardProps {
  dateKey: string;
  label: string;
}

// README: 컨디션 카드 — {선택일} 컨디션 + 3택 + 증상 칩(복수 선택) + 메모 안내.
export default function ConditionCard({ dateKey, label }: ConditionCardProps) {
  const { colors } = useTheme();
  const record = useAppStore((s) => s.dailyRecords[dateKey]);
  const setDayCondition = useAppStore((s) => s.setDayCondition);
  const toggleDaySymptom = useAppStore((s) => s.toggleDaySymptom);

  const condition = record?.periodCondition;
  const symptoms = record?.periodSymptoms ?? [];

  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.title, { color: colors.txt }]}>{label} 컨디션</Text>
      <Text style={[styles.desc, { color: colors.sub }]}>그날의 몸 상태를 남겨두면 다음 주기를 예측할 때 참고해요.</Text>

      <View style={styles.conditionRow}>
        {CONDITIONS.map((c) => {
          const on = condition === c.value;
          return (
            <SelectChip
              key={c.value}
              label={c.label}
              selected={on}
              onPress={() => setDayCondition(dateKey, on ? undefined : c.value)}
              size="lg"
              fill
            />
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.sub }]}>증상</Text>
      <View style={styles.symptomWrap}>
        {SYMPTOM_TAGS.map((s) => (
          <SelectChip
            key={s.code}
            label={s.label}
            selected={symptoms.includes(s.code)}
            onPress={() => toggleDaySymptom(dateKey, s.code)}
          />
        ))}
      </View>

      <View style={[styles.memoBlock, { backgroundColor: colors.card2 }]}>
        <Text style={[styles.memoText, { color: colors.sub }]}>
          메모 기능은 준비 중이에요. 지금은 컨디션과 증상만 기록돼요.
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  title: typography.sectionTitle,
  desc: {
    ...typography.bodySm,
    marginTop: 6,
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  sectionLabel: {
    ...typography.label,
    marginTop: 16,
    marginBottom: 8,
  },
  symptomWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memoBlock: {
    borderRadius: 15,
    padding: 12,
    marginTop: 14,
  },
  memoText: {
    ...typography.caption,
    lineHeight: 11 * 1.5,
  },
});
