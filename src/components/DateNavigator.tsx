import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from './Icon';
import DatePickerSheet from './DatePickerSheet';
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
 * 식단·헬스·상세의 날짜 이동(명세 F-020·F-030). 미래 기록은 받지 않아서 오늘에서 다음으로는 못 넘어간다.
 *
 * 가운데 날짜를 누르면 달력이 열려 원하는 날로 바로 간다 — 2주 전 기록을 보려고 ‹를 열네 번 누르지 않게.
 * 예전엔 가운데를 누르면 오늘로 돌아왔는데, 그 길은 아래 "오늘로" 글씨와 달력 안에 남겼다.
 * 화살표는 양 끝이 아니라 날짜 가까이 둔다. 양 끝에 있으면 날짜와 한 덩어리로 안 읽힌다.
 */
export default function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const { colors } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = dateKey();
  const isToday = date === today;
  const d = parseDateKey(date);
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(addDays(date, -1))}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel="이전 날"
        >
          <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
        </Pressable>

        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.center, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`${label}, 눌러서 날짜 고르기`}
        >
          <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        </Pressable>

        <Pressable
          onPress={() => onChange(addDays(date, 1))}
          disabled={isToday}
          style={[styles.btn, { opacity: isToday ? 0.35 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="다음 날"
        >
          <Icon name="chevronRight" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      {isToday ? (
        <Text style={[styles.sub, { color: colors.textSecondary }]}>오늘</Text>
      ) : (
        <Pressable onPress={() => onChange(today)} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }} accessibilityRole="button">
          <Text style={[styles.sub, { color: colors.textAccent }]}>오늘로</Text>
        </Pressable>
      )}

      <DatePickerSheet visible={pickerOpen} value={date} onPick={onChange} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
  },
  // 상자 없이 화살표만(시안 04·05). 누르는 영역은 44×44 그대로.
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 날짜 글씨 폭이 달마다 달라도 화살표가 흔들리지 않게 최소 폭을 둔다.
  center: {
    minWidth: 128,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: typography.itemTitle,
  sub: typography.micro,
});
