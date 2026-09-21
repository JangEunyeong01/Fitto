import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { alpha, brand, typography } from '../../theme/tokens';
import { getMonthGrid, getDayType, type PeriodSettings } from '../../utils/periodCycle';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface PeriodCalendarProps {
  year: number;
  month: number;
  onShiftMonth: (delta: number) => void;
  selected: string;
  onSelect: (dateKey: string) => void;
  settings: PeriodSettings | null;
}

// README: 캘린더 카드. 7열 그리드, 생리일/가임기/배란일 색 구분, 선택일은 파랑 그라데이션.
export default function PeriodCalendar({ year, month, onShiftMonth, selected, onSelect, settings }: PeriodCalendarProps) {
  const { colors, brand: themeBrand } = useTheme();
  const cells = getMonthGrid(year, month);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.navRow}>
        <Pressable onPress={() => onShiftMonth(-1)} style={[styles.navBtn, { borderColor: colors.borderDivider }]}>
          <Icon name="chevronLeft" size={16} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
          {year}년 {month}월
        </Text>
        <Pressable onPress={() => onShiftMonth(1)} style={[styles.navBtn, { borderColor: colors.borderDivider }]}>
          <Icon name="chevronRight" size={16} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.legendRow}>
        <Legend color={alpha(brand.peach, 0.32)} label="생리" colors={colors} />
        <Legend color={alpha(brand.lavender, 0.28)} label="가임기" colors={colors} />
        <Legend color="transparent" borderColor={brand.lavender} label="배란일" colors={colors} />
      </View>

      <View style={styles.weekHeader}>
        {WEEKDAY_LABELS.map((w) => (
          <Text key={w} style={[styles.weekLabel, { color: colors.textSecondary }]}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((key, i) => {
          if (!key) return <View key={i} style={styles.cell} />;
          // settings가 null이면(시작일 입력 전) 추정 색을 칠하지 않는다.
          const dayType = settings ? getDayType(key, settings) : null;
          const isSelected = key === selected;
          const day = Number(key.slice(-2));
          return (
            <Pressable key={key} onPress={() => onSelect(key)} style={styles.cell}>
              <View
                style={[
                  styles.dayBox,
                  dayType === 'period' && { backgroundColor: alpha(brand.peach, 0.32) },
                  dayType === 'fertile' && { backgroundColor: alpha(brand.lavender, 0.28) },
                  dayType === 'ovulation' && { borderWidth: 1, borderColor: brand.lavender },
                  isSelected && styles.selectedBox,
                ]}
              >
                {isSelected ? (
                  <View style={[styles.selectedFill, { backgroundColor: themeBrand.blue }]}>
                    <Text style={styles.selectedText}>{day}</Text>
                  </View>
                ) : (
                  <Text style={[styles.dayText, { color: colors.textPrimary }]}>{day}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

function Legend({
  color,
  borderColor,
  label,
  colors,
}: {
  color: string;
  borderColor?: string;
  label: string;
  colors: any;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderColor: borderColor ?? 'transparent', borderWidth: borderColor ? 1 : 0 }]} />
      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const CELL = '14.28%';

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
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...typography.itemTitle,
    minWidth: 100,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendLabel: typography.captionSm,
  weekHeader: {
    flexDirection: 'row',
    marginTop: 16,
  },
  weekLabel: {
    ...typography.captionSm,
    width: CELL,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  cell: {
    width: CELL,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayBox: {
    width: 38,
    height: 38,
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBox: {
    // 선택된 날짜의 페이지 배경(생리/가임기 색)은 파랑 그라데이션 아래로 덮인다.
    padding: 0,
  },
  selectedFill: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: typography.body,
  selectedText: {
    ...typography.value,
    color: '#fff',
  },
});
