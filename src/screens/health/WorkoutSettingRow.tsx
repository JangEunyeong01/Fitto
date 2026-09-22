import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
 *
 * 추천 카드 안에 들어간다. 매일 바꾸는 값이 아닌데 카드 한 장을 차지하고 있어서,
 * 이 값으로 무엇이 달라지는지(= 바로 위 추천)와 붙여 뒀다.
 */
export default function WorkoutSettingRow() {
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
    <View style={[styles.wrap, { borderTopColor: colors.borderDivider }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>추천 기준</Text>
          {!open && <Text style={[styles.summary, { color: colors.textPrimary }]}>{summary}</Text>}
        </View>
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={12} accessibilityRole="button">
          <Text style={[styles.editLabel, { color: colors.textAccent }]}>{open ? '접기' : '편집'}</Text>
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
            바꾸면 위 추천이 바로 다시 계산돼요.
          </Text>
        </View>
      )}
    </View>
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
  wrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  label: typography.caption,
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
