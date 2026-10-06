import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import SegmentedControl from '../../components/SegmentedControl';
import DatePickerSheet from '../../components/DatePickerSheet';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { YearMonth, ymIndex, ymRangeLabel } from '../../utils/yearMonth';
import { addDays, daysBetween } from '../../utils/periodCycle';
import { dateKey } from '../../utils/timeOfDay';

export type MonthPreset = '1m' | '3m' | '6m' | 'custom';

// 네 칸이 한 줄에 들어가야 해서 "최근"을 뺐다. 가운데 기간 글씨가 "최근 N개월"을 이미 말해준다.
const PRESETS: { value: MonthPreset; label: string }[] = [
  { value: '1m', label: '한 달' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: 'custom', label: '직접 선택' },
];

/** 직접 고르는 구간의 최대 길이(일). 막대가 너무 많아지면 읽을 수 없다. */
export const MAX_RANGE_DAYS = 366;

interface PeriodBarProps {
  preset: MonthPreset;
  onPresetChange: (p: MonthPreset) => void;
  /** 한 달·3개월·6개월일 때의 구간(월 단위). */
  start: YearMonth;
  end: YearMonth;
  onShift: (delta: number) => void;
  /** 한 달·3개월·6개월일 때 가운데 글씨를 눌러 마지막 달을 고른다. */
  onPickEndMonth: (ym: YearMonth) => void;
  /** 직접 선택일 때의 구간(dateKey, 둘 다 포함). */
  customStart: string;
  customEnd: string;
  onCustomChange: (start: string, end: string) => void;
  currentMonth: YearMonth;
}

const dot = (key: string) => key.replace(/-/g, '.');

/**
 * 상세 화면의 월간 기간 바.
 * - 한 달·3개월·6개월: ‹ › 로 한 달씩, 가운데 기간 글씨를 누르면 달 고르기(연도까지)
 * - 직접 선택: "2026.10.03 – 2026.12.05" 두 날짜를 각각 눌러 달력에서 고른다. 예전엔 달 단위 위아래 버튼이라
 *   "10월 3일부터"를 고를 수 없었다. 시작을 누르면 시작 날짜가 있는 달부터 열린다
 */
export default function PeriodBar({
  preset,
  onPresetChange,
  start,
  end,
  onShift,
  onPickEndMonth,
  customStart,
  customEnd,
  onCustomChange,
  currentMonth,
}: PeriodBarProps) {
  const { colors } = useTheme();
  const [picking, setPicking] = useState<'start' | 'end' | 'month' | null>(null);
  const today = dateKey();
  const isCustom = preset === 'custom';
  const atMax = isCustom ? customEnd >= today : ymIndex(end) >= ymIndex(currentMonth);
  const customDays = daysBetween(customStart, customEnd) + 1;
  // 해가 같으면 월.일만, 다르면 앞에 두 자리 연도까지("25.11.10 – 26.10.03") — 해가 바뀐 걸 놓치지 않게.
  const sameYear = customStart.slice(0, 4) === customEnd.slice(0, 4);
  const short = (k: string) => (sameYear ? dot(k).slice(5) : dot(k).slice(2));
  const label = isCustom ? `${short(customStart)} – ${short(customEnd)} (${customDays}일)` : ymRangeLabel(start, end);

  return (
    <GlassCard style={styles.card}>
      {/* 화살표는 상자 없이(날짜 이동 줄과 같은 모양). 누르는 영역은 44. 직접 선택이면 구간 길이만큼 옮긴다. */}
      <View style={styles.navRow}>
        <Pressable onPress={() => onShift(-1)} accessibilityRole="button" accessibilityLabel="이전 기간" style={styles.navBtn}>
          <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => setPicking(isCustom ? 'start' : 'month')}
          style={({ pressed }) => [styles.labelBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`${label}, 눌러서 기간 고르기`}
        >
          <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        </Pressable>
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

      {isCustom && (
        <View style={[styles.customRow, { borderTopColor: colors.borderDivider }]}>
          <DateChip label="시작" value={customStart} onPress={() => setPicking('start')} />
          <Text style={[styles.dash, { color: colors.textSecondary }]}>–</Text>
          <DateChip label="끝" value={customEnd} onPress={() => setPicking('end')} />
        </View>
      )}

      {/* 시작은 끝보다 뒤로, 끝은 오늘보다 뒤로 못 간다. 구간은 1년까지. 범위를 달력에서 아예 막아 고칠 일이 없게 한다. */}
      <DatePickerSheet
        visible={picking === 'start'}
        title="시작 날짜"
        value={customStart}
        min={addDays(customEnd, -(MAX_RANGE_DAYS - 1))}
        max={customEnd}
        showToday={false}
        onPick={(key) => onCustomChange(key, customEnd)}
        onClose={() => setPicking(null)}
      />
      <DatePickerSheet
        visible={picking === 'end'}
        title="끝 날짜"
        value={customEnd}
        min={customStart}
        max={[today, addDays(customStart, MAX_RANGE_DAYS - 1)].sort()[0]}
        showToday={false}
        onPick={(key) => onCustomChange(customStart, key)}
        onClose={() => setPicking(null)}
      />
      <DatePickerSheet
        visible={picking === 'month'}
        title="마지막 달"
        value={`${end.year}-${String(end.month).padStart(2, '0')}-01`}
        onPickMonth={onPickEndMonth}
        onClose={() => setPicking(null)}
      />
    </GlassCard>
  );
}

/** 날짜 한 칸. 누르면 달력을 연다. 생리 기록 시트도 같은 모양을 쓴다. */
export function DateChip({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${dot(value)}, 눌러서 바꾸기`}
      style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? colors.fillStrong : colors.fillMuted }]}
    >
      <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.chipValue, { color: colors.textPrimary }]}>{dot(value)}</Text>
    </Pressable>
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
  labelBtn: {
    minWidth: 140,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.itemTitle,
    textAlign: 'center',
  },
  presetRow: {
    marginTop: 14,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dash: {
    fontSize: 15,
    ...weight(600),
  },
  chip: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 2,
  },
  chipLabel: {
    fontSize: 12,
    ...weight(600),
  },
  chipValue: {
    fontSize: 15,
    ...weight(600),
  },
});
