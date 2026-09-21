import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import DetailHeader from '../detail/DetailHeader';
import PeriodCalendar from './PeriodCalendar';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { dateKey } from '../../utils/timeOfDay';
import { getUpcomingDates, parseDateKey, shiftYearMonth } from '../../utils/periodCycle';
import { typography } from '../../theme/tokens';

// 통상 주기는 21~35일이라 여유를 두고 45일까지 받는다.
const CYCLE_LIMITS = { min: 21, max: 45 };
const PERIOD_LIMITS = { min: 2, max: 10 };

type Limits = { min: number; max: number };
type NumKey = 'cycleLength' | 'periodLength';

/**
 * 명세 F-044: 마지막 시작일·주기·기간 입력 → 배란일·가임기·다음 예정일 자동 계산, 입력 즉시 미리보기.
 * 프로필처럼 저장 버튼 없이 바로 반영한다. 달력 색도 같은 설정을 쓰니 달력 자체가 미리보기가 된다.
 */
export default function PeriodSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const settings = useAppStore((s) => s.periodSettings);
  const setPeriodSettings = useAppStore((s) => s.setPeriodSettings);
  const setupDone = useAppStore((s) => s.periodSetupDone);
  const showToast = useToastStore((s) => s.show);

  const today = dateKey();
  const start = parseDateKey(settings.lastStartDate);
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() + 1 });
  const [cycle, setCycle] = useState(String(settings.cycleLength));
  const [length, setLength] = useState(String(settings.periodLength));

  const selectStart = (key: string) => {
    // YYYY-MM-DD라 문자열 비교가 날짜 순서와 같다.
    if (key > today) {
      showToast('오늘 이후 날짜는 고를 수 없어요');
      return;
    }
    setPeriodSettings({ lastStartDate: key });
  };

  // 범위 안의 값이면 타이핑하는 대로 반영해 미리보기가 같이 바뀌게 한다.
  // "30"을 치는 중간의 "3"처럼 범위 밖이면 기다렸다가 포커스가 빠질 때 잘라서 맞춘다.
  const onNumChange = (text: string, setText: (t: string) => void, limits: Limits, key: NumKey) => {
    const digits = text.replace(/[^0-9]/g, '');
    setText(digits);
    const n = parseInt(digits, 10);
    if (n >= limits.min && n <= limits.max && n !== settings[key]) setPeriodSettings({ [key]: n });
  };
  const onNumCommit = (text: string, setText: (t: string) => void, limits: Limits, key: NumKey) => {
    const n = parseInt(text, 10);
    const next = Number.isFinite(n) ? Math.min(limits.max, Math.max(limits.min, n)) : settings[key];
    setText(String(next));
    if (next !== settings[key]) setPeriodSettings({ [key]: next });
  };

  const upcoming = getUpcomingDates(today, settings);

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DetailHeader title="생리 주기 설정" />

        <Text style={[styles.hint, { color: colors.textSecondary }]}>달력에서 마지막 생리 시작일을 눌러 주세요.</Text>
        <PeriodCalendar
          year={view.year}
          month={view.month}
          onShiftMonth={(delta) => setView((v) => shiftYearMonth(v, delta))}
          // 입력 전에는 기본값(이틀 전)을 고른 것처럼 보이면 안 되니 선택·추정 색 모두 비운다.
          selected={setupDone ? settings.lastStartDate : ''}
          onSelect={selectStart}
          settings={setupDone ? settings : null}
        />

        <GlassCard style={styles.card}>
          <View style={styles.numRow}>
            <NumField
              label="주기 (일)"
              hint={`${CYCLE_LIMITS.min}~${CYCLE_LIMITS.max}일`}
              value={cycle}
              onChangeText={(t) => onNumChange(t, setCycle, CYCLE_LIMITS, 'cycleLength')}
              onCommit={() => onNumCommit(cycle, setCycle, CYCLE_LIMITS, 'cycleLength')}
              colors={colors}
            />
            <NumField
              label="생리 기간 (일)"
              hint={`${PERIOD_LIMITS.min}~${PERIOD_LIMITS.max}일`}
              value={length}
              onChangeText={(t) => onNumChange(t, setLength, PERIOD_LIMITS, 'periodLength')}
              onCommit={() => onNumCommit(length, setLength, PERIOD_LIMITS, 'periodLength')}
              colors={colors}
            />
          </View>
        </GlassCard>

        {setupDone && (
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>예상 날짜</Text>
            <PreviewRow label="다음 생리 예정일" value={formatDate(upcoming.nextStart)} colors={colors} />
            <PreviewRow
              label="가임기"
              value={`${formatDate(upcoming.fertileStart)} ~ ${formatDate(upcoming.fertileEnd)}`}
              colors={colors}
            />
            <PreviewRow label="배란일" value={formatDate(upcoming.ovulation)} colors={colors} />
            <Text style={[styles.notice, { color: colors.textSecondary }]}>
              평균 주기로 계산한 추정치예요. 실제와 다를 수 있고 의료 진단을 대체하지 않아요.
            </Text>
          </GlassCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

function NumField({
  label,
  hint,
  value,
  onChangeText,
  onCommit,
  colors,
}: {
  label: string;
  hint: string;
  value: string;
  onChangeText: (t: string) => void;
  onCommit: () => void;
  colors: { textSecondary: string };
}) {
  return (
    <View style={styles.numCol}>
      <Text style={[styles.numLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextField
        value={value}
        onChangeText={onChangeText}
        onEndEditing={onCommit}
        onBlur={onCommit}
        keyboardType="numeric"
        center
      />
      <Text style={[styles.numHint, { color: colors.textSecondary }]}>{hint}</Text>
    </View>
  );
}

function PreviewRow({ label, value, colors }: { label: string; value: string; colors: { textSecondary: string; textPrimary: string } }) {
  return (
    <View style={styles.previewRow}>
      <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.previewValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

// 2026-09-15 → 9월 15일
function formatDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  hint: {
    ...typography.bodySm,
    marginBottom: 10,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: typography.sectionTitle,
  numRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numCol: {
    flex: 1,
    gap: 6,
  },
  numLabel: typography.label,
  numHint: typography.captionSm,
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  previewLabel: typography.bodySm,
  previewValue: typography.value,
  notice: {
    ...typography.caption,
    marginTop: 14,
  },
});
