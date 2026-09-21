import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../theme/useTheme';
import { typography } from '../theme/tokens';
import { dateKey } from '../utils/timeOfDay';
import { addDays, parseDateKey } from '../utils/periodCycle';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface DateNavigatorProps {
  date: string; // dateKey
  onChange: (date: string) => void;
}

/**
 * 식단·헬스 날짜 이동(명세 F-020·F-030). 미래 기록은 받지 않아서 오늘에서 다음으로는 못 넘어간다.
 * 가운데 날짜를 누르면 오늘로 돌아온다 — 며칠 전으로 넘겨놓고 되돌아오는 탭 수를 줄이려고.
 */
export default function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const { colors } = useTheme();
  const today = dateKey();
  const isToday = date === today;
  const d = parseDateKey(date);
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(addDays(date, -1))}
        hitSlop={8}
        style={[styles.btn, { borderColor: colors.borderDivider }]}
        accessibilityRole="button"
        accessibilityLabel="이전 날"
      >
        <Icon name="chevronLeft" size={16} color={colors.textPrimary} />
      </Pressable>

      <Pressable onPress={() => onChange(today)} disabled={isToday} style={styles.center}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>{isToday ? '오늘' : '오늘로 돌아가기'}</Text>
      </Pressable>

      <Pressable
        onPress={() => onChange(addDays(date, 1))}
        disabled={isToday}
        hitSlop={8}
        style={[styles.btn, { borderColor: colors.borderDivider, opacity: isToday ? 0.35 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="다음 날"
      >
        <Icon name="chevronRight" size={16} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 1,
  },
  label: typography.itemTitle,
  sub: typography.caption,
});
