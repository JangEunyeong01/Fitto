import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GlassCard from '../../../components/GlassCard';
import TextLink from '../../../components/TextLink';
import ProgressBar from '../../../components/ProgressBar';
import { useTheme } from '../../../theme/useTheme';
import { useAppStore } from '../../../store/useAppStore';
import { dateKey } from '../../../utils/timeOfDay';
import { recentDays } from '../../../utils/history';
import { useConnectSteps } from '../../../health/useConnectSteps';
import { typography, weight } from '../../../theme/tokens';

const BAR_MAX_HEIGHT = 34;

export default function StepsCard() {
  const navigation = useNavigation<any>();
  const { colors, brand } = useTheme();
  const goal = useAppStore((s) => s.goals.steps);
  const records = useAppStore((s) => s.dailyRecords);
  const steps = records[dateKey()]?.steps ?? 0;
  const connected = useAppStore((s) => s.stepSource) !== 'none';
  const { connect, busy } = useConnectSteps();

  const { labels, values: week } = recentDays(records, 'steps');
  const total = week.reduce((a, v) => a + v, 0);
  const avg = Math.round(total / week.length);
  const maxVal = Math.max(...week, 1);

  /*
   * 걸음 수는 폰의 건강 데이터에서 온다. 연결 전에 "0 / 8,000"을 보여주면 하루 종일 한 걸음도 안 걸은 것처럼 읽힌다.
   * 연결했으면 0이어도 아래 차트로 간다 — 아직 안 걸은 것과 연결 전은 다르다.
   */
  if (!connected) {
    // 연결 전엔 목표도 숨긴다(시안 02). "목표 8,000보"만 떠 있으면 못 채운 숙제처럼 읽힌다.
    return (
      <GlassCard fill>
        <View style={styles.topRow}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>걸음수</Text>
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>아직 연결 전이에요</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
          건강 데이터를 연결하면 걸음 수가 표시돼요.
        </Text>
        <View style={styles.linkWrap}>
          <TextLink label={busy ? '연결하는 중…' : '건강 데이터 연결'} onPress={connect} disabled={busy} />
        </View>
      </GlassCard>
    );
  }

  // README: 걸음수 카드는 어디를 탭해도 걸음 상세로 이동한다.
  return (
    <Pressable onPress={() => navigation.navigate('StepsDetail')} style={styles.pressFill}>
      <GlassCard fill>
        <View style={styles.topRow}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>걸음수</Text>
        </View>
        <View style={styles.numRow}>
          <Text style={[styles.bigNum, { color: colors.textPrimary }]}>{steps.toLocaleString()}</Text>
          <Text style={[styles.goalNum, { color: colors.textSecondary }]}> / {goal.toLocaleString()}</Text>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar progress={steps / goal} height={8} radius={5} color={brand.blue} />
        </View>

        <View style={styles.chartRow}>
          {week.map((v, i) => {
            const isToday = i === week.length - 1;
            const h = Math.max(4, (v / maxVal) * BAR_MAX_HEIGHT);
            return (
              <View key={i} style={styles.chartCol}>
                <View style={[styles.barTrack, { height: BAR_MAX_HEIGHT }]}>
                  {/* 오늘만 피또 블루 단색. 그라데이션은 홈 배경에만 둔다(시안 규칙 10). */}
                  <View style={[styles.bar, { height: h, backgroundColor: isToday ? brand.blue : colors.fillMuted }]} />
                </View>
                <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{labels[i]}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>최근 7일 · 평균 {avg.toLocaleString()}</Text>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressFill: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    minHeight: 22,
    alignItems: 'center',
  },
  label: typography.cardTitle,
  numRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  bigNum: {
    fontSize: 22,
    ...weight(700),
    letterSpacing: -0.8,
  },
  goalNum: typography.unit,
  barWrap: {
    marginTop: 10,
  },
  // README: 하단(margin-top:auto)에 최근 7일 미니 막대 — 카드가 늘어나도 빈 공간을 남기지 않는다.
  chartRow: {
    flexDirection: 'row',
    marginTop: 'auto',
    paddingTop: 16,
    gap: 4,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  dayLabel: typography.micro,
  caption: {
    ...typography.captionSm,
    marginTop: 8,
  },
  emptyTitle: {
    ...typography.itemTitle,
    marginTop: 12,
  },
  linkWrap: {
    marginTop: 'auto',
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyDesc: {
    ...typography.bodySm,
    marginTop: 6,
  },
});
