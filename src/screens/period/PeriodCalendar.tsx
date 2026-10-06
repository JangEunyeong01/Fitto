import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import DatePickerSheet from '../../components/DatePickerSheet';
import { dateKey } from '../../utils/timeOfDay';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { alpha, brand, typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import {
  addDays,
  bandGroup,
  getBandDay,
  getMonthGrid,
  getUpcomingDates,
  parseDateKey,
  type BandDay,
  type PeriodLog,
  type PredictShow,
  type PeriodSettings,
} from '../../utils/periodCycle';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 기록한 생리는 진하게, 예측은 옅게. 띠 모양은 같고 진하기로만 나눈다.
 * 복숭아·라벤더는 피또 화면에서 혼자 튀어서(사용자 피드백) 생리는 피또 팔레트와 같은 밝기의 장미색,
 * 가임기는 피또 하늘색, 배란일은 피또 팔다리 색(#61A1B9)으로 맞췄다.
 */
export const ROSE = '#EBA3B5';
export const PERIOD_RECORDED = alpha(ROSE, 0.6);
export const PERIOD_PREDICTED = alpha(ROSE, 0.22);
export const FERTILE_FILL = alpha(brand.blue, 0.26);
export const OVULATION_FILL = alpha('#61A1B9', 0.7);

interface PeriodCalendarProps {
  year: number;
  month: number;
  onShiftMonth: (delta: number) => void;
  selected: string;
  onSelect: (dateKey: string) => void;
  settings: PeriodSettings | null;
}

/**
 * 달력 카드. 생리일·가임기는 날짜마다 따로 칠하지 않고 이어진 띠로 그린다 — 며칠부터 며칠까지인지가 한눈에 보인다.
 * 기록한 생리는 진하게, 예측은 옅게. 배란일은 가임기 띠 끝의 진한 점. 아래에 기간·예정일 네 줄.
 * 고른 날은 덮지 않고 파란 테두리만 두른다 — 덮으면 그날이 생리일인지 가임기인지 안 보인다.
 */
export default function PeriodCalendar({ year, month, onShiftMonth, selected, onSelect, settings }: PeriodCalendarProps) {
  const { colors, brand: themeBrand } = useTheme();
  const cells = getMonthGrid(year, month);
  const today = dateKey();
  const logs = useAppStore((s) => s.periodLogs);
  const display = useAppStore((s) => s.periodDisplay);
  const show = { period: display.predictPeriod, fertile: display.predictFertile };
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <GlassCard style={styles.card}>
      {/* 생리 달력은 예정일을 보려고 앞 달로도 간다. 그래서 1년 뒤까지 고를 수 있게 한다. */}
      <DatePickerSheet
        visible={pickerOpen}
        value={`${year}-${String(month).padStart(2, '0')}-01`}
        max={addDays(dateKey(), 365)}
        onPickMonth={(ym) => onShiftMonth((ym.year - year) * 12 + (ym.month - month))}
        onClose={() => setPickerOpen(false)}
      />
      <View style={styles.navRow}>
        <Pressable
          onPress={() => onShiftMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="이전 달"
          style={styles.navBtn}
        >
          <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
        </Pressable>
        {/* 위쪽 "○년 ○월"을 누르면 달·연도를 바로 고른다. 몇 달 전 기록을 보려고 ‹를 여러 번 누르지 않게. */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.monthBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`${year}년 ${month}월, 눌러서 달 고르기`}
        >
          <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
            {year}년 {month}월
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onShiftMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="다음 달"
          style={styles.navBtn}
        >
          <Icon name="chevronRight" size={20} color={colors.textPrimary} />
        </Pressable>
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
          const band = settings ? getBandDay(key, settings, logs, today, show) : null;
          const group = bandGroup(band);
          // 앞뒤 날이 같은 묶음이면 띠를 잇고, 묶음이 끝나거나 주가 바뀌면(일·토) 둥글게 닫는다.
          const weekday = i % 7;
          // 이번 달 칸이 아닌 빈칸 쪽(1일 앞, 말일 뒤)으로는 잇지 않는다.
          const openLeft = weekday !== 0 && !!cells[i - 1] && bandGroup(getBandDay(addDays(key, -1), settings!, logs, today, show)) === group;
          const openRight = weekday !== 6 && !!cells[i + 1] && bandGroup(getBandDay(addDays(key, 1), settings!, logs, today, show)) === group;
          const isSelected = key === selected;
          const isToday = key === today;
          const day = Number(key.slice(-2));
          return (
            <Pressable
              key={key}
              onPress={() => onSelect(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${month}월 ${day}일${band ? ` ${band.predicted ? '예상 ' : ''}${TYPE_LABEL[band.type]}` : ''}${isToday ? ', 오늘' : ''}`}
              style={styles.cell}
            >
              {band && (
                <View
                  style={[
                    styles.band,
                    { backgroundColor: bandColor(band) },
                    !openLeft && styles.bandStart,
                    !openRight && styles.bandEnd,
                  ]}
                />
              )}
              <View
                style={[
                  styles.dayCircle,
                  // 배란일은 네 모서리가 다 둥근 진한 동그라미. 칸을 통째로 칠하면 띠에 붙은 쪽이 각져 보인다.
                  // 띠와 높이가 같은 36이라 가장자리가 딱 겹친다.
                  band?.type === 'ovulation' && { backgroundColor: OVULATION_FILL },
                  isToday && { borderWidth: 1.5, borderColor: colors.textSecondary },
                  isSelected && { borderWidth: 2, borderColor: themeBrand.blue },
                ]}
              >
                <Text style={[styles.dayText, { color: colors.textPrimary }, (isSelected || isToday) && weight(700)]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {settings && <Summary settings={settings} logs={logs} today={today} show={show} colors={colors} />}
    </GlassCard>
  );
}

const TYPE_LABEL = { period: '생리', fertile: '가임기', ovulation: '배란일' } as const;

function bandColor(b: BandDay) {
  if (b.type === 'period') return b.predicted ? PERIOD_PREDICTED : PERIOD_RECORDED;
  // 배란일 칸도 띠는 가임기 색으로 잇고, 그 위에 진한 동그라미를 얹는다(아래 dayCircle).
  return FERTILE_FILL;
}

const md = (key: string) => {
  const d = parseDateKey(key);
  return { m: d.getMonth() + 1, d: d.getDate(), w: '일월화수목금토'[d.getDay()] };
};
const fmtDay = (key: string) => {
  const { m, d, w } = md(key);
  return `${m}월 ${d}일 (${w})`;
};
const fmtRange = (a: string, b: string) => {
  const s = md(a);
  const e = md(b);
  return `${s.m}월 ${s.d}일 - ${s.m === e.m ? '' : `${e.m}월 `}${e.d}일`;
};

/** 달력 아래 네 줄. 왼쪽 색 막대가 달력 띠 색과 같아서 따로 범례를 두지 않는다. */
function Summary({
  settings,
  logs,
  today,
  show,
  colors,
}: {
  settings: PeriodSettings;
  logs: PeriodLog[];
  today: string;
  show: PredictShow;
  colors: any;
}) {
  const up = getUpcomingDates(today, settings);
  // 가장 최근 기록. 진행 중이면 끝 대신 "진행 중".
  const last = logs[logs.length - 1];
  const period = last
    ? last.end
      ? fmtRange(last.start, last.end)
      : `${md(last.start).m}월 ${md(last.start).d}일 - 진행 중`
    : fmtRange(settings.lastStartDate, addDays(settings.lastStartDate, settings.periodLength - 1));
  const items = [
    { label: '생리 기간', value: period, bar: PERIOD_RECORDED },
    show.fertile && { label: '예상 가임기', value: fmtRange(up.fertileStart, up.fertileEnd), bar: FERTILE_FILL },
    show.fertile && { label: '예상 배란일', value: fmtDay(up.ovulation), bar: OVULATION_FILL },
    show.period && { label: '다음 생리 예정일', value: fmtDay(up.nextStart), bar: PERIOD_PREDICTED },
  ].filter((it): it is { label: string; value: string; bar: string } => !!it);
  return (
    <View style={styles.summary}>
      {items.map((it) => (
        <View key={it.label} style={styles.summaryItem}>
          <View style={[styles.summaryBar, { backgroundColor: it.bar }]} />
          <View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{it.label}</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{it.value}</Text>
          </View>
        </View>
      ))}
      {(show.period || show.fertile) && (
        <Text style={[styles.summaryNote, { color: colors.textSecondary }]}>옅은 색은 예측이에요</Text>
      )}
    </View>
  );
}

const CELL = '14.28%';

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  // 화살표는 양 끝이 아니라 "○년 ○월" 가까이(물·걸음 기간 바, 날짜 이동과 같은 간격 8).
  // 양 끝에 있으면 달 글씨와 한 덩어리로 안 읽힌다.
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 36,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: typography.cardTitle,
  // 달마다 글씨 폭이 달라도 화살표가 흔들리지 않게 최소 폭(기간 바와 같은 140).
  monthBtn: {
    minHeight: 44,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 4,
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
  // 띠는 칸 폭을 꽉 채워 옆 칸과 붙는다. 시작·끝 칸만 둥글게 닫고 살짝 들여 다음 묶음과 떨어뜨린다.
  // 높이는 날짜 동그라미와 같은 36(칸 38에서 위아래 1). 오늘·고른 날 테두리가 띠 가장자리와 딱 겹친다.
  band: {
    position: 'absolute',
    top: 1,
    bottom: 1,
    left: 0,
    right: 0,
  },
  // 닫히는 쪽은 칸 가장자리가 아니라 동그라미 가장자리(가운데 ±18)에서 끝난다.
  // 칸 폭은 화면마다 달라서, 가장자리 기준이면 넓은 화면에서 띠 끝이 동그라미보다 삐져나온다.
  bandStart: {
    left: '50%',
    marginLeft: -18,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  bandEnd: {
    right: '50%',
    marginRight: -18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
    marginTop: 16,
  },
  summaryItem: {
    width: '50%',
    flexDirection: 'row',
    gap: 10,
  },
  summaryBar: {
    width: 3,
    borderRadius: 2,
  },
  summaryLabel: {
    fontSize: 12,
    ...weight(500),
  },
  summaryValue: {
    fontSize: 15,
    ...weight(700),
    marginTop: 2,
  },
  summaryNote: {
    ...typography.micro,
    width: '100%',
    textAlign: 'right',
  },
});
