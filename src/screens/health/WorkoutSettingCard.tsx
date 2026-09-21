import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import SelectChip from '../../components/SelectChip';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import {
  EQUIPMENT_OPTIONS,
  FOCUS_OPTIONS,
  INTENSITY_OPTIONS,
  labelOf,
  type TagOption,
} from '../../constants/codes';
import type { WorkoutPreference } from '../../utils/workoutRecommend';

/**
 * 명세 F-031: 강도 / 환경 / 오늘 목적. 기본은 접어두고 "편집"을 눌러야 펼친다.
 * 매일 바꾸는 값이 아니라서, 펼쳐두면 아래 추천 카드가 화면 밖으로 밀린다.
 */
export default function WorkoutSettingCard() {
  const { colors } = useTheme();
  const preference = useAppStore((s) => s.workoutPreference);
  const setPreference = useAppStore((s) => s.setWorkoutPreference);
  const [open, setOpen] = useState(false);

  const summary = [
    labelOf(INTENSITY_OPTIONS, preference.intensity),
    labelOf(EQUIPMENT_OPTIONS, preference.equipment),
    labelOf(FOCUS_OPTIONS, preference.focus),
  ].join(' · ');

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>운동 설정</Text>
          {!open && <Text style={[styles.summary, { color: colors.textSecondary }]}>{summary}</Text>}
        </View>
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8}>
          <Text style={[styles.editLabel, { color: colors.textSecondary }]}>{open ? '접기' : '편집'}</Text>
        </Pressable>
      </View>

      {open && (
        <View style={styles.body}>
          <Row
            label="강도"
            options={INTENSITY_OPTIONS}
            value={preference.intensity}
            onChange={(v) => setPreference({ intensity: v as WorkoutPreference['intensity'] })}
            colors={colors}
          />
          <Row
            label="환경"
            options={EQUIPMENT_OPTIONS}
            value={preference.equipment}
            onChange={(v) => setPreference({ equipment: v as WorkoutPreference['equipment'] })}
            colors={colors}
          />
          <Row
            label="오늘 목적"
            options={FOCUS_OPTIONS}
            value={preference.focus}
            onChange={(v) => setPreference({ focus: v as WorkoutPreference['focus'] })}
            colors={colors}
          />
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            바꾸면 아래 추천이 바로 다시 계산돼요.
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

function Row({
  label,
  options,
  value,
  onChange,
  colors,
}: {
  label: string;
  options: readonly TagOption[];
  value: string;
  onChange: (code: string) => void;
  colors: { textSecondary: string };
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((o) => (
          <SelectChip
            key={o.code}
            label={o.label}
            selected={value === o.code}
            onPress={() => onChange(o.code)}
            size="sm"
            fill
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: typography.sectionTitle,
  summary: typography.bodySm,
  editLabel: typography.unit,
  body: {
    marginTop: 14,
    gap: 12,
  },
  row: {
    gap: 8,
  },
  rowLabel: typography.label,
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  note: typography.caption,
});
