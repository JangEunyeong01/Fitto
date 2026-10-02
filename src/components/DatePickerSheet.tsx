import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import BottomSheet from './BottomSheet';
import Icon from './Icon';
import TextLink from './TextLink';
import { useTheme } from '../theme/useTheme';
import { brand, typography, weight } from '../theme/tokens';
import { dateKey } from '../utils/timeOfDay';
import { getMonthGrid, parseDateKey, shiftYearMonth } from '../utils/periodCycle';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface DatePickerSheetProps {
  visible: boolean;
  value: string; // dateKey
  onPick: (date: string) => void;
  onClose: () => void;
}

/**
 * 날짜 고르기(식단·헬스·물·걸음 상세의 날짜를 눌렀을 때). 미래 날짜는 기록을 받지 않아 고를 수 없다.
 *
 * 기기 기본 날짜 선택기 대신 달력을 직접 그렸다. 기본 선택기는 네이티브 라이브러리라 웹에서 안 보이고,
 * 넣으면 개발용 빌드를 다시 만들어야 한다. 생리 달력과 같은 주기 계산(getMonthGrid)을 쓴다.
 * 고른 날은 테두리만(시안 규칙 13), 오늘은 파란 글씨.
 */
export default function DatePickerSheet({ visible, value, onPick, onClose }: DatePickerSheetProps) {
  const { colors } = useTheme();
  const today = dateKey();
  const toYm = (key: string) => {
    const d = parseDateKey(key);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  };
  const [ym, setYm] = useState(() => toYm(value));

  // 열 때마다 고른 날짜가 있는 달부터 보여준다.
  useEffect(() => {
    if (visible) setYm(toYm(value));
  }, [visible, value]);

  const cells = getMonthGrid(ym.year, ym.month);
  const thisMonth = toYm(today);
  const atLatest = ym.year === thisMonth.year && ym.month === thisMonth.month;

  return (
    <BottomSheet visible={visible} title="날짜 고르기" onClose={onClose}>
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setYm(shiftYearMonth(ym, -1))}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="이전 달"
        >
          <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
          {ym.year}년 {ym.month}월
        </Text>
        <Pressable
          onPress={() => setYm(shiftYearMonth(ym, 1))}
          disabled={atLatest}
          style={[styles.navBtn, { opacity: atLatest ? 0.35 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="다음 달"
        >
          <Icon name="chevronRight" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={[styles.weekday, { color: colors.textSecondary }]}>
            {w}
          </Text>
        ))}
        {cells.map((key, i) => {
          if (!key) return <View key={`blank-${i}`} style={styles.cell} />;
          const future = key > today;
          const selected = key === value;
          const isToday = key === today;
          return (
            <Pressable
              key={key}
              disabled={future}
              onPress={() => {
                onPick(key);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: future }}
              accessibilityLabel={`${parseDateKey(key).getMonth() + 1}월 ${parseDateKey(key).getDate()}일${isToday ? ', 오늘' : ''}`}
              style={styles.cell}
            >
              <View style={[styles.dayCircle, selected && { borderWidth: 2, borderColor: brand.blue }]}>
                <Text
                  style={[
                    styles.day,
                    { color: future ? colors.textDisabled : isToday ? colors.textAccent : colors.textPrimary },
                    (selected || isToday) && weight(700),
                  ]}
                >
                  {parseDateKey(key).getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {value !== today && (
        <View style={styles.todayRow}>
          <TextLink
            label="오늘로"
            onPress={() => {
              onPick(today);
              onClose();
            }}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 4,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: typography.itemTitle,
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 6,
  },
  cell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    fontSize: 15,
  },
  todayRow: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 4,
  },
});
