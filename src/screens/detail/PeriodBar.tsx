import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import SelectChip from '../../components/SelectChip';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';
import { YearMonth, ymAdd, ymFromIndex, ymIndex, ymRangeLabel } from '../../utils/yearMonth';

export type MonthPreset = '1m' | '3m' | '6m' | 'custom';

const PRESETS: { key: MonthPreset; label: string }[] = [
  { key: '1m', label: '한 달' },
  { key: '3m', label: '최근 3개월' },
  { key: '6m', label: '최근 6개월' },
  { key: 'custom', label: '직접 선택' },
];

const MAX_MONTHS = 12;

interface PeriodBarProps {
  preset: MonthPreset;
  onPresetChange: (p: MonthPreset) => void;
  start: YearMonth;
  end: YearMonth;
  onShift: (delta: number) => void;
  onCustomChange: (start: YearMonth, end: YearMonth) => void;
  currentMonth: YearMonth;
}

// README: 월간 선택 시 기간 바. ‹ › 로 월 이동, 프리셋 칩, 직접 선택은 시작·종료 월 입력(최대 12개월).
export default function PeriodBar({
  preset,
  onPresetChange,
  start,
  end,
  onShift,
  onCustomChange,
  currentMonth,
}: PeriodBarProps) {
  const { colors } = useTheme();
  const atMax = ymIndex(end) >= ymIndex(currentMonth);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.navRow}>
        <Pressable onPress={() => onShift(-1)} style={[styles.navBtn, { borderColor: colors.borderDivider }]}>
          <Icon name="chevronLeft" size={16} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{ymRangeLabel(start, end)}</Text>
        <Pressable
          onPress={() => onShift(1)}
          disabled={atMax}
          style={[styles.navBtn, { borderColor: colors.borderDivider, opacity: atMax ? 0.35 : 1 }]}
        >
          <Icon name="chevronRight" size={16} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.presetRow}>
        {PRESETS.map((p) => (
          <SelectChip
            key={p.key}
            label={p.label}
            selected={p.key === preset}
            onPress={() => onPresetChange(p.key)}
            size="sm"
            fill
          />
        ))}
      </View>

      {preset === 'custom' && (
        <View style={[styles.customRow, { borderTopColor: colors.borderDivider }]}>
          <MonthStepper
            label="시작 월"
            value={start}
            onChange={(next) => {
              // 시작은 종료보다 뒤로 갈 수 없고, 구간이 12개월을 넘을 수 없다.
              const minIdx = ymIndex(end) - (MAX_MONTHS - 1);
              const maxIdx = ymIndex(end);
              const clampedIdx = Math.min(maxIdx, Math.max(minIdx, ymIndex(next)));
              onCustomChange(ymFromIndex(clampedIdx), end);
            }}
            colors={colors}
          />
          <MonthStepper
            label="종료 월"
            value={end}
            onChange={(next) => {
              // 종료는 시작보다 앞으로 갈 수 없고, 오늘 달을 넘을 수 없고, 12개월을 넘을 수 없다.
              const minIdx = ymIndex(start);
              const maxIdx = Math.min(ymIndex(start) + (MAX_MONTHS - 1), ymIndex(currentMonth));
              const clampedIdx = Math.min(maxIdx, Math.max(minIdx, ymIndex(next)));
              onCustomChange(start, ymFromIndex(clampedIdx));
            }}
            colors={colors}
          />
        </View>
      )}
    </GlassCard>
  );
}

function MonthStepper({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: YearMonth;
  onChange: (ym: YearMonth) => void;
  colors: any;
}) {
  return (
    <View style={styles.stepperCol}>
      <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable onPress={() => onChange(ymAdd(value, -1))} style={[styles.stepperBtn, { borderColor: colors.borderDivider }]}>
          <Icon name="chevronLeft" size={16} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>{value.year}.{String(value.month).padStart(2, '0')}</Text>
        <Pressable onPress={() => onChange(ymAdd(value, 1))} style={[styles.stepperBtn, { borderColor: colors.borderDivider }]}>
          <Icon name="chevronRight" size={16} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.itemTitle,
    minWidth: 140,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  customRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepperCol: {
    flex: 1,
    gap: 6,
  },
  stepperLabel: typography.label,
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...typography.value,
    flex: 1,
    textAlign: 'center',
  },
});
