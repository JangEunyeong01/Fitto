import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarSpace } from '../../navigation/TabBar';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import DetailHeader from '../detail/DetailHeader';
import RegularityCard from './RegularityCard';
import PeriodLogSheet from './PeriodLogSheet';
import { FERTILE_FILL, OVULATION_FILL, PERIOD_RECORDED } from './PeriodCalendar';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { dateKey } from '../../utils/timeOfDay';
import { addDays, daysBetween, parseDateKey, type PeriodLog } from '../../utils/periodCycle';

const md = (key: string) => {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

/**
 * 내 주기 내역. 생리 한 번이 한 줄이고, 줄마다 그 주기를 막대 하나로 그린다
 * (생리 기간 · 추정 가임기 · 추정 배란일). 줄을 누르면 그 기록을 고친다.
 * 주기 길이는 다음 시작일까지라 가장 최근 줄은 "현재"이고 평균 주기로 끝을 잡는다.
 */
export default function PeriodHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const logs = useAppStore((s) => s.periodLogs);
  const cycleLength = useAppStore((s) => s.periodSettings.cycleLength);
  const today = dateKey();
  const [editing, setEditing] = useState<PeriodLog | null>(null);
  const [adding, setAdding] = useState(false);

  // 최신이 위로.
  const rows = logs
    .map((log, i) => {
      const next = logs[i + 1];
      const current = !next;
      const cycleDays = next ? daysBetween(log.start, next.start) : Math.max(cycleLength, daysBetween(log.start, today) + 1);
      const end = log.end ?? today;
      return { log, current, cycleDays, periodDays: daysBetween(log.start, end) + 1, rangeEnd: addDays(log.start, cycleDays - 1) };
    })
    .reverse();

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="내 주기 내역" />
        <RegularityCard />

        <GlassCard style={styles.card}>
          {rows.length === 0 && (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>아직 생리 기록이 없어요. 지난 생리부터 넣어 보세요.</Text>
          )}
          {rows.map((r, i) => {
            // 배란일은 다음 시작 14일 전, 가임기는 그 앞 5일(달력과 같은 규칙).
            const ovul = r.cycleDays - 14;
            const pct = (n: number) => `${(Math.max(0, n) / r.cycleDays) * 100}%` as const;
            return (
              <Pressable
                key={r.log.start}
                onPress={() => setEditing(r.log)}
                accessibilityRole="button"
                accessibilityLabel={`${r.current ? '현재 주기' : `${r.cycleDays}일 주기`}, ${md(r.log.start)}부터 생리 ${r.periodDays}일, 눌러서 고치기`}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDivider },
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{r.current ? '현재' : `${r.cycleDays}일`}</Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                  {/* 현재 주기의 끝은 평균 주기로 잡은 예상이다. */}
                  {md(r.log.start)} - {md(r.rangeEnd)}
                  {r.current && r.rangeEnd > today ? ' 예상' : ''} (생리 {r.log.end ? `${r.periodDays}일` : '진행 중'})
                </Text>
                <View style={[styles.track, { backgroundColor: colors.fillMuted }]}>
                  <View style={[styles.seg, { left: 0, width: pct(r.periodDays), backgroundColor: PERIOD_RECORDED }]} />
                  {ovul > r.periodDays && (
                    <>
                      <View style={[styles.seg, { left: pct(ovul - 5), width: pct(5), backgroundColor: FERTILE_FILL }]} />
                      <View style={[styles.seg, { left: pct(ovul), width: pct(1), backgroundColor: OVULATION_FILL }]} />
                    </>
                  )}
                </View>
              </Pressable>
            );
          })}
        </GlassCard>

        <PrimaryButton label="지난 생리 추가" variant="text" onPress={() => setAdding(true)} />
      </ScrollView>

      <PeriodLogSheet
        visible={adding || editing !== null}
        editing={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 12,
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: 12,
  },
  row: {
    paddingVertical: 14,
  },
  rowTitle: {
    fontSize: 20,
    ...weight(700),
  },
  rowSub: {
    fontSize: 13,
    ...weight(500),
    marginTop: 2,
  },
  // 막대 하나가 한 주기. 길이는 주기마다 같은 폭으로 늘려 비율만 본다.
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
  },
  seg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
});
