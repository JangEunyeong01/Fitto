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
const YEARS_SHOWN = 12;

type Mode = 'day' | 'month' | 'year';
interface Ym {
  year: number;
  month: number;
}

interface DatePickerSheetProps {
  visible: boolean;
  /** 지금 고른 날짜(dateKey). 이 날짜가 있는 달부터 연다. */
  value: string;
  onClose: () => void;
  /** 날짜를 고르면. 연·월만 고르는 쓰임이면 생략하고 onPickMonth를 준다. */
  onPick?: (date: string) => void;
  /** 연·월만 고르는 쓰임(생리 달력 위쪽을 눌렀을 때). 주면 월을 고르는 순간 끝난다. */
  onPickMonth?: (ym: Ym) => void;
  title?: string;
  /** 고를 수 있는 범위(dateKey, 포함). 기본은 오늘까지 — 기록은 미래를 받지 않는다. */
  min?: string;
  max?: string;
  /** 아래 "오늘로" 버튼. 기간의 시작·끝을 고를 때는 오늘로 한 번에 가는 게 의미가 없어 끈다. */
  showToday?: boolean;
}

/**
 * 날짜 고르기 시트. 세 단계를 오간다.
 *   날짜(달력) — 위쪽 "2026년 10월"을 누르면 → 월(12칸) — 위쪽 "2026년"을 누르면 → 연도(12칸)
 * 연도를 고르면 월로, 월을 고르면 날짜로 돌아온다. 몇 달·몇 년 전으로 갈 때 ‹를 수십 번 누르지 않게.
 *
 * 기기 기본 날짜 선택기는 네이티브 라이브러리라 웹에서 안 보이고 개발용 빌드를 다시 만들어야 해서 직접 그렸다.
 * 고른 날은 테두리만(시안 규칙 13), 오늘은 파란 글씨. 범위 밖은 흐리게 막는다.
 */
export default function DatePickerSheet({ visible, value, onClose, onPick, onPickMonth, title, min, max, showToday = true }: DatePickerSheetProps) {
  const { colors } = useTheme();
  const today = dateKey();
  const upper = max ?? today;
  const toYm = (key: string): Ym => {
    const d = parseDateKey(key);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  };
  const [ym, setYm] = useState<Ym>(() => toYm(value));
  const monthOnly = !!onPickMonth && !onPick;
  const [mode, setMode] = useState<Mode>(monthOnly ? 'month' : 'day');

  // 열 때마다 고른 날짜가 있는 달부터.
  useEffect(() => {
    if (!visible) return;
    setYm(toYm(value));
    setMode(monthOnly ? 'month' : 'day');
  }, [visible, value]);

  const ymKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
  const maxYm = upper.slice(0, 7);
  const minYm = min?.slice(0, 7);
  const monthAllowed = (y: number, m: number) => ymKey(y, m) <= maxYm && (!minYm || ymKey(y, m) >= minYm);
  const dayAllowed = (key: string) => key <= upper && (!min || key >= min);

  const header = (label: string, onPressLabel: (() => void) | null, step: number) => {
    const canPrev = mode === 'day' ? !minYm || ymKey(ym.year, ym.month) > minYm : true;
    const canNext = mode === 'day' ? ymKey(ym.year, ym.month) < maxYm : ym.year * 1 < Number(maxYm.slice(0, 4));
    const move = (dir: number) =>
      setYm((v) => (mode === 'day' ? shiftYearMonth(v, dir) : { ...v, year: v.year + dir * step }));
    return (
      <View style={styles.headRow}>
        <Pressable onPress={() => move(-1)} disabled={!canPrev} style={[styles.navBtn, { opacity: canPrev ? 1 : 0.35 }]} accessibilityRole="button" accessibilityLabel="이전">
          <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={onPressLabel ?? undefined}
          disabled={!onPressLabel}
          style={({ pressed }) => [styles.headLabelBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole={onPressLabel ? 'button' : 'text'}
          accessibilityHint={onPressLabel ? '눌러서 더 크게 고르기' : undefined}
        >
          <Text style={[styles.headLabel, { color: colors.textPrimary }]}>{label}</Text>
          {onPressLabel && <Icon name="chevronDown" size={16} color={colors.textSecondary} />}
        </Pressable>
        <Pressable onPress={() => move(1)} disabled={!canNext} style={[styles.navBtn, { opacity: canNext ? 1 : 0.35 }]} accessibilityRole="button" accessibilityLabel="다음">
          <Icon name="chevronRight" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>
    );
  };

  const selectedYm = toYm(value);

  const body = () => {
    if (mode === 'year') {
      // 끝이 오늘(또는 최댓값) 해가 되게 12년을 보여준다. ‹ ›는 12년씩 넘긴다.
      const last = Math.min(ym.year + Math.floor(YEARS_SHOWN / 2), Number(maxYm.slice(0, 4)));
      const years = Array.from({ length: YEARS_SHOWN }, (_, i) => last - YEARS_SHOWN + 1 + i);
      return (
        <>
          {header(`${years[0]} – ${years[years.length - 1]}`, null, YEARS_SHOWN)}
          <View style={styles.tileGrid}>
            {years.map((y) => {
              const on = y === selectedYm.year;
              const disabled = !!minYm && `${y}-12` < minYm;
              return (
                <Tile key={y} label={`${y}`} on={on} disabled={disabled} onPress={() => { setYm({ year: y, month: ym.month }); setMode('month'); }} />
              );
            })}
          </View>
        </>
      );
    }

    if (mode === 'month') {
      return (
        <>
          {header(`${ym.year}년`, () => setMode('year'), 1)}
          <View style={styles.tileGrid}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const on = ym.year === selectedYm.year && m === selectedYm.month;
              return (
                <Tile
                  key={m}
                  label={`${m}월`}
                  on={on}
                  disabled={!monthAllowed(ym.year, m)}
                  onPress={() => {
                    if (monthOnly) {
                      onPickMonth?.({ year: ym.year, month: m });
                      onClose();
                      return;
                    }
                    setYm({ year: ym.year, month: m });
                    setMode('day');
                  }}
                />
              );
            })}
          </View>
        </>
      );
    }

    const cells = getMonthGrid(ym.year, ym.month);
    return (
      <>
        {header(`${ym.year}년 ${ym.month}월`, () => setMode('month'), 1)}
        <View style={styles.dayGrid}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={[styles.weekday, { color: colors.textSecondary }]}>
              {w}
            </Text>
          ))}
          {cells.map((key, i) => {
            if (!key) return <View key={`blank-${i}`} style={styles.cell} />;
            const allowed = dayAllowed(key);
            const selected = key === value;
            const isToday = key === today;
            const day = parseDateKey(key);
            return (
              <Pressable
                key={key}
                disabled={!allowed}
                onPress={() => {
                  onPick?.(key);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !allowed }}
                accessibilityLabel={`${day.getMonth() + 1}월 ${day.getDate()}일${isToday ? ', 오늘' : ''}`}
                style={styles.cell}
              >
                <View style={[styles.dayCircle, selected && { borderWidth: 2, borderColor: brand.blue }]}>
                  <Text
                    style={[
                      styles.day,
                      { color: !allowed ? colors.textDisabled : isToday ? colors.textAccent : colors.textPrimary },
                      (selected || isToday) && weight(700),
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {onPick && showToday && value !== today && dayAllowed(today) && (
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
      </>
    );
  };

  return (
    <BottomSheet visible={visible} title={title ?? (monthOnly ? '달 고르기' : '날짜 고르기')} onClose={onClose}>
      {body()}
    </BottomSheet>
  );
}

/** 월·연도 칸. 고른 칸은 파란 테두리(날짜와 같은 규칙). */
function Tile({ label, on, disabled, onPress }: { label: string; on: boolean; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      style={({ pressed }) => [
        styles.tile,
        on && { borderWidth: 2, borderColor: brand.blue },
        pressed && !disabled && { backgroundColor: colors.fillMuted },
      ]}
    >
      <Text style={[styles.tileLabel, { color: disabled ? colors.textDisabled : colors.textPrimary }, on && weight(700)]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headLabelBtn: {
    minWidth: 140,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  headLabel: typography.itemTitle,
  dayGrid: {
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
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  tile: {
    width: '25%',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 15,
  },
  todayRow: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 4,
  },
});
