import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import SelectChip from '../../components/SelectChip';
import TextField from '../../components/TextField';
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
  const setDayPeriodNote = useAppStore((s) => s.setDayPeriodNote);

  const condition = record?.periodCondition;
  const symptoms = record?.periodSymptoms ?? [];

  const [medication, setMedication] = useState(record?.periodMedication ?? '');
  const [memo, setMemo] = useState(record?.periodMemo ?? '');
  // 달력에서 다른 날짜를 고르면 같은 카드가 그 날 값을 보여줘야 한다.
  useEffect(() => {
    setMedication(record?.periodMedication ?? '');
    setMemo(record?.periodMemo ?? '');
  }, [dateKey, record?.periodMedication, record?.periodMemo]);

  const commit = (key: 'medication' | 'memo', value: string, saved?: string) => {
    if (value.trim() !== (saved ?? '')) setDayPeriodNote(dateKey, { [key]: value });
  };

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

      {/* 명세 F-036: 복용약과 메모. 입력칸을 벗어날 때 저장한다. */}
      <Text style={[styles.sectionLabel, { color: colors.sub }]}>복용약</Text>
      <TextField
        size="sm"
        clearable
        value={medication}
        onChangeText={setMedication}
        onEndEditing={() => commit('medication', medication, record?.periodMedication)}
        onBlur={() => commit('medication', medication, record?.periodMedication)}
        placeholder="선택 · 예: 이부프로펜"
        maxLength={50}
      />

      <Text style={[styles.sectionLabel, { color: colors.sub }]}>메모</Text>
      <TextField
        size="sm"
        clearable
        value={memo}
        onChangeText={setMemo}
        onEndEditing={() => commit('memo', memo, record?.periodMemo)}
        onBlur={() => commit('memo', memo, record?.periodMemo)}
        placeholder="선택 · 그날 몸 상태를 적어두세요"
        maxLength={200}
      />
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
});
