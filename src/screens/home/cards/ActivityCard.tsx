import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import TextLink from '../../../components/TextLink';
import GlassCard from '../../../components/GlassCard';
import Icon from '../../../components/Icon';
import { useTheme } from '../../../theme/useTheme';
import { useAppStore } from '../../../store/useAppStore';
import { dateKey } from '../../../utils/timeOfDay';
import { getBurnedKcal } from '../../../utils/health';
import { recentDays } from '../../../utils/history';
import { typography } from '../../../theme/tokens';

const SIZE = 104;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export default function ActivityCard() {
  const navigation = useNavigation<any>();
  const { colors, brand } = useTheme();
  const stepsGoal = useAppStore((s) => s.goals.steps);
  const records = useAppStore((s) => s.dailyRecords);
  const record = records[dateKey()];

  const steps = record?.steps ?? 0;
  const exerciseMinutes = (record?.exercises ?? []).reduce((a, e) => a + e.minutes, 0);
  const burned = getBurnedKcal(record?.exercises ?? []);
  const percent = Math.max(0, Math.min(100, Math.round((steps / stepsGoal) * 100)));
  const dashOffset = CIRC * (1 - percent / 100);

  // 걸음 수는 건강 데이터를 연결해야 들어온다. 연결 전에는 "0%"가 아니라 값이 없다고 말한다.
  // 오늘 값만 보면 연결된 사람도 자정 직후엔 "연결 전"이 된다. 걸음수 카드와 같은 기준(최근 7일)으로 본다.
  const stepsConnected = recentDays(records, 'steps').values.some((v) => v > 0);

  return (
    <GlassCard>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>활동</Text>
        <TextLink label="상세" onPress={() => navigation.navigate('ActivityDetail')} />
      </View>

      <View style={styles.row}>
        <View style={styles.ringWrap}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.fillMuted} strokeWidth={STROKE} fill="none" />
            {stepsConnected && (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={brand.blue}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            )}
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.percent, { color: stepsConnected ? colors.textPrimary : colors.textSecondary }]}>
              {stepsConnected ? `${percent}%` : '—'}
            </Text>
            <Text style={[styles.percentLabel, { color: colors.textSecondary }]}>활동</Text>
          </View>
        </View>

        <View style={styles.statCol}>
          <StatRow
            dot={brand.blue}
            label="걸음수"
            value={stepsConnected ? steps.toLocaleString() : '연결 전'}
            colors={colors}
          />
          <StatRow dot={brand.mint} label="운동 시간" value={`${exerciseMinutes}분`} colors={colors} />
          <StatRow dot={brand.lavender} label="소모 칼로리" value={`${burned.toLocaleString()}kcal`} colors={colors} />
        </View>
      </View>
    </GlassCard>
  );
}

function StatRow({ dot, label, value, colors }: { dot: string; label: string; value: string; colors: any }) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: typography.sectionTitle,
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  detailLabel: typography.label,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  percent: typography.sheetTitle,
  percentLabel: typography.micro,
  statCol: {
    flex: 1,
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  statLabel: {
    ...typography.bodySm,
    flex: 1,
  },
  statValue: typography.value,
});
