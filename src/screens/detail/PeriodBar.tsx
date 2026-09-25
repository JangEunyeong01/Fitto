import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import SegmentedControl from '../../components/SegmentedControl';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';
import { YearMonth, ymAdd, ymFromIndex, ymIndex, ymRangeLabel } from '../../utils/yearMonth';

export type MonthPreset = '1m' | '3m' | '6m' | 'custom';

// 네 칸이 한 줄에 들어가야 해서 "최근"을 뺐다. 가운데 기간 글씨가 "최근 N개월"을 이미 말해준다.
const PRESETS: { value: MonthPreset; label: string }[] = [
  { value: '1m', label: '한 달' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: 'custom', label: '직접 선택' },
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
      {/* 화살표는 상자 없이(날짜 이동 줄과 같은 모양). 누르는 영역은 44. */}
      <View style={styles.navRow}>
        <Pressable
          onPress={() => onShift(-1)}
          accessibilityRole="button"
          accessibilityLabel="이전 기간"
          style={styles.navBtn}
        >
          <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{ymRangeLabel(start, end)}</Text>
        <Pressable
          onPress={() => onShift(1)}
          disabled={atMax}
          accessibilityRole="button"
          accessibilityLabel="다음 기간"
          accessibilityState={{ disabled: atMax }}
          style={[styles.navBtn, { opacity: atMax ? 0.35 : 1 }]}
        >
          <Icon name="chevronRight" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* 늘 하나가 골라져 있어서 떨어진 칩 대신 붙은 세그먼트(시안 규칙 13). */}
      <View style={styles.presetRow}>
        <SegmentedControl options={PRESETS} value={preset} onChange={onPresetChange} />
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
        <Pressable
          onPress={() => onChange(ymAdd(value, -1))}
          accessibilityRole="button"
          accessibilityLabel={`${label} 이전 달`}
          style={styles.stepperBtn}
        >
          <Icon name="chevronLeft" size={16} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>{value.year}.{String(value.month).padStart(2, '0')}</Text>
        <Pressable
          onPress={() => onChange(ymAdd(value, 1))}
          accessibilityRole="button"
          accessibilityLabel={`${label} 다음 달`}
          style={styles.stepperBtn}
        >
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
    gap: 8,
    marginVertical: -6,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.itemTitle,
    minWidth: 140,
    textAlign: 'center',
  },
  presetRow: {
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
    marginHorizontal: -12,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...typography.value,
    flex: 1,
    textAlign: 'center',
  },
});
