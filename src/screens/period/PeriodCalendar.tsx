import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { alpha, brand, typography, weight } from '../../theme/tokens';
import { getMonthGrid, getDayType, type PeriodSettings } from '../../utils/periodCycle';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const PERIOD_FILL = alpha(brand.peach, 0.38);
const FERTILE_FILL = alpha(brand.lavender, 0.34);
/** 배란일 테두리. 라벤더 그대로는 흰 카드 위에서 선이 안 보여 한 단계 진하게(시안 10). */
const OVULATION_RING = '#A996D8';

interface PeriodCalendarProps {
  year: number;
  month: number;
  onShiftMonth: (delta: number) => void;
  selected: string;
  onSelect: (dateKey: string) => void;
  settings: PeriodSettings | null;
}

/**
 * 달력 카드(시안 10). 생리일·가임기는 옅은 면, 배란일은 테두리.
 * 고른 날은 남색으로 덮지 않고 그 위에 파란 테두리만 두른다 — 덮으면 그날이 생리일인지 가임기인지 안 보인다.
 */
export default function PeriodCalendar({ year, month, onShiftMonth, selected, onSelect, settings }: PeriodCalendarProps) {
  const { colors, brand: themeBrand } = useTheme();
  const cells = getMonthGrid(year, month);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.navRow}>
        <Pressable
          onPress={() => onShiftMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="이전 달"
          style={[styles.navBtn, styles.navLeft]}
        >
          <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
          {year}년 {month}월
        </Text>
        <Pressable
          onPress={() => onShiftMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="다음 달"
          style={[styles.navBtn, styles.navRight]}
        >
          <Icon name="chevronRight" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.legendRow}>
        <Legend fill={PERIOD_FILL} label="생리" colors={colors} />
        <Legend fill={FERTILE_FILL} label="가임기" colors={colors} />
        <Legend ring={OVULATION_RING} label="배란일" colors={colors} />
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
            <Pressable
              key={key}
              onPress={() => onSelect(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${month}월 ${day}일${dayType === 'period' ? ' 생리' : dayType === 'fertile' ? ' 가임기' : dayType === 'ovulation' ? ' 배란일' : ''}`}
              style={styles.cell}
            >
              <View
                style={[
                  styles.dayCircle,
                  dayType === 'period' && { backgroundColor: PERIOD_FILL },
                  dayType === 'fertile' && { backgroundColor: FERTILE_FILL },
                  dayType === 'ovulation' && { borderWidth: 1.5, borderColor: OVULATION_RING },
                  // 배란일이 선택되면 파란 테두리가 라벤더 테두리를 대신한다.
                  isSelected && { borderWidth: 2, borderColor: themeBrand.blue },
                ]}
              >
                <Text style={[styles.dayText, { color: colors.textPrimary }, isSelected && weight(700)]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

function Legend({ fill, ring, label, colors }: { fill?: string; ring?: string; label: string; colors: any }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          fill ? { backgroundColor: fill } : null,
          ring ? { borderWidth: 1.5, borderColor: ring } : null,
        ]}
      />
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
    justifyContent: 'space-between',
    height: 36,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLeft: {
    marginLeft: -12,
  },
  navRight: {
    marginRight: -12,
  },
  monthLabel: typography.cardTitle,
  legendRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
    marginBottom: 12,
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
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    ...weight(500),
  },
  weekHeader: {
    flexDirection: 'row',
  },
  weekLabel: {
    fontSize: 12,
    ...weight(600),
    width: CELL,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 2,
  },
  // 칸 높이 38에 원 36. 누르는 영역은 칸 전체(폭 약 44 × 38)라 한 줄에 7칸을 넣으려면 이 이상 키울 수 없다.
  cell: {
    width: CELL,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    ...weight(500),
  },
});
