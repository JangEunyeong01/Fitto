import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import Badge from '../../components/Badge';
import TextLink from '../../components/TextLink';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { cycleStats, isTypicalChange, isTypicalCycle, isTypicalLength } from '../../utils/periodCycle';

/**
 * 주기 규칙성. 평균 주기·평균 생리 기간·최근 주기 변화 세 칸.
 * 배지는 진단이 아니라 일반 범위와의 비교라 "정상/이상" 대신 "일반 범위/평소와 다름"으로 쓴다.
 * 기록이 모자라면 숫자 대신 몇 번 더 넣으면 되는지 알려준다.
 */
export default function RegularityCard({ onOpenHistory }: { onOpenHistory?: () => void }) {
  const { colors } = useTheme();
  const logs = useAppStore((s) => s.periodLogs);
  const { avgCycle, avgLength, change } = cycleStats(logs);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>주기 규칙성</Text>
        {onOpenHistory && <TextLink label="내 주기 내역" onPress={onOpenHistory} />}
      </View>

      <View style={styles.cols}>
        <Stat
          label="평균 주기"
          value={avgCycle}
          ok={avgCycle !== null && isTypicalCycle(avgCycle)}
          okLabel="일반 범위"
          offLabel="범위 밖"
        />
        <Stat
          label="평균 생리 기간"
          value={avgLength}
          ok={avgLength !== null && isTypicalLength(avgLength)}
          okLabel="일반 범위"
          offLabel="범위 밖"
        />
        <Stat
          label="최근 주기 변화"
          value={change}
          signed
          ok={change !== null && isTypicalChange(change)}
          okLabel="평소와 비슷"
          offLabel="평소와 다름"
        />
      </View>

      <Text style={[styles.note, { color: colors.textSecondary }]}>
        {logs.length < 3
          ? `생리 기록이 3번 쌓이면 주기 변화까지 보여요 (지금 ${logs.length}번)`
          : '최근 6번의 기록으로 계산해요. 의료 진단을 대신하지 않아요.'}
      </Text>
    </GlassCard>
  );
}

function Stat({
  label,
  value,
  ok,
  okLabel,
  offLabel,
  signed,
}: {
  label: string;
  value: number | null;
  ok: boolean;
  okLabel: string;
  offLabel: string;
  signed?: boolean;
}) {
  const { colors } = useTheme();
  const text = value === null ? '–' : signed && value > 0 ? `+${value}` : String(value);
  return (
    <View style={styles.col}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{text}</Text>
        {value !== null && <Text style={[styles.unit, { color: colors.textSecondary }]}>일</Text>}
      </View>
      {value !== null && <Badge label={ok ? okLabel : offLabel} tone={ok ? 'info' : 'warn'} style={styles.badge} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 22,
  },
  title: typography.cardTitle,
  cols: {
    flexDirection: 'row',
    marginTop: 16,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    ...weight(500),
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: 4,
  },
  value: {
    ...typography.bigNumber,
  },
  unit: typography.unit,
  badge: {
    alignSelf: 'center',
    marginTop: 6,
  },
  note: {
    ...typography.micro,
    marginTop: 14,
  },
});
