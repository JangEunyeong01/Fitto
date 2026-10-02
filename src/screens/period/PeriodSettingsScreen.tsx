import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarSpace } from '../../navigation/TabBar';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import ToggleSwitch from '../../components/ToggleSwitch';
import AlertModal from '../../components/AlertModal';
import PrimaryButton from '../../components/PrimaryButton';
import DetailHeader from '../detail/DetailHeader';
import SettingsRow, { RowDivider, ROW_PAD } from '../settings/SettingsRow';
import PeriodLogSheet from './PeriodLogSheet';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { deletePeriodData } from '../../api/records';
import { ApiError, NetworkError } from '../../api/client';
import { cycleStats } from '../../utils/periodCycle';
import { typography, weight } from '../../theme/tokens';

// 통상 주기는 21~35일이라 여유를 두고 45일까지 받는다.
const CYCLE_LIMITS = { min: 21, max: 45 };
const PERIOD_LIMITS = { min: 2, max: 10 };

type Limits = { min: number; max: number };
type NumKey = 'cycleLength' | 'periodLength';

/** 기록 화면에서 숨길 수 있는 묶음(사용자 결정: 기본은 다 보이고 여기서 끈다). */
const FERTILITY_GROUPS = ['mucus', 'ovtest'];

/**
 * 생리 주기 설정(삼성 헬스 생리 설정 참고).
 * - 생리 주기: 평균 주기·생리 기간. 기록이 쌓이면 기록 평균으로 바뀐다
 * - 표시할 정보: 생리일 예측, 가임기 예측
 * - 기록 항목: 성생활, 점액·배란 테스트를 기록 화면에서 숨기기
 * - 데이터: 생리 데이터만 지우기
 * 예전엔 여기 달력에서 시작일을 골랐는데, 이제 생리는 상세 화면의 기록으로 넣는다. 처음엔 여기서도 넣을 수 있게 버튼을 둔다.
 */
export default function PeriodSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const settings = useAppStore((s) => s.periodSettings);
  const setPeriodSettings = useAppStore((s) => s.setPeriodSettings);
  const logs = useAppStore((s) => s.periodLogs);
  const display = useAppStore((s) => s.periodDisplay);
  const setPeriodDisplay = useAppStore((s) => s.setPeriodDisplay);
  const resetPeriodData = useAppStore((s) => s.resetPeriodData);
  const authStatus = useAuthStore((s) => s.status);
  const showToast = useToastStore((s) => s.show);

  const [cycle, setCycle] = useState(String(settings.cycleLength));
  const [length, setLength] = useState(String(settings.periodLength));
  const [logOpen, setLogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // 기록이 바뀌어 평균이 다시 계산되면 칸도 따라간다.
  useEffect(() => {
    setCycle(String(settings.cycleLength));
    setLength(String(settings.periodLength));
  }, [settings.cycleLength, settings.periodLength]);

  const { avgCycle, avgLength } = cycleStats(logs);

  // 범위 안의 값이면 타이핑하는 대로 반영한다. "30"을 치는 중간의 "3"처럼 범위 밖이면 포커스가 빠질 때 잘라서 맞춘다.
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

  const hidden = display.hiddenGroups;
  const toggleGroups = (keys: string[], visible: boolean) =>
    setPeriodDisplay({ hiddenGroups: visible ? hidden.filter((k) => !keys.includes(k)) : [...new Set([...hidden, ...keys])] });

  const confirmDelete = async () => {
    if (deleteBusy) return;
    // 회원이면 서버부터. 기기만 지우면 다음 동기화 때 서버 기록이 다시 내려온다(데이터 초기화와 같은 순서).
    if (authStatus === 'member') {
      setDeleteBusy(true);
      try {
        await deletePeriodData(useAuthStore.getState().accessToken ?? '');
      } catch (e) {
        setDeleteBusy(false);
        setDeleteOpen(false);
        showToast(e instanceof ApiError || e instanceof NetworkError ? e.message : '지우지 못했어요. 잠시 후 다시 시도해 주세요');
        return;
      }
    }
    resetPeriodData();
    setDeleteBusy(false);
    setDeleteOpen(false);
    showToast('생리 데이터를 지웠어요');
  };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DetailHeader title="생리 주기 설정" />

        {logs.length === 0 && (
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>아직 생리 기록이 없어요</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>마지막 생리를 넣으면 다음 예정일과 가임기를 계산해요.</Text>
            <PrimaryButton label="마지막 생리 입력" onPress={() => setLogOpen(true)} style={styles.firstBtn} />
          </GlassCard>
        )}

        <Text style={[styles.section, { color: colors.textSecondary }]}>생리 주기</Text>
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
          {/* 기록이 쌓이면 기록이 바뀔 때마다 평균으로 다시 맞춘다. 직접 고친 값이 덮인다는 걸 미리 말해 둔다. */}
          <Text style={[styles.notice, { color: colors.textSecondary }]}>
            {avgCycle !== null || avgLength !== null
              ? '지금 값은 생리 기록 평균이에요. 기록을 넣거나 고치면 다시 계산해요.'
              : '생리 기록이 쌓이면 기록 평균으로 바뀌어요.'}
          </Text>
        </GlassCard>

        <Text style={[styles.section, { color: colors.textSecondary }]}>표시할 정보</Text>
        <GlassCard style={styles.card} noPadding>
          <SettingsRow
            label="생리일 예측"
            desc="다음 예정일과 옅은 예측 띠"
            right={<ToggleSwitch value={display.predictPeriod} onChange={(v) => setPeriodDisplay({ predictPeriod: v })} />}
          />
          <RowDivider />
          <SettingsRow
            label="가임기 예측"
            desc="가임기와 배란일"
            right={<ToggleSwitch value={display.predictFertile} onChange={(v) => setPeriodDisplay({ predictFertile: v })} />}
          />
        </GlassCard>
        <Text style={[styles.footnote, { color: colors.textSecondary }]}>
          예측은 평균 주기로 계산한 추정치예요. 실제와 다를 수 있고 의료 진단을 대신하지 않아요.
        </Text>

        <Text style={[styles.section, { color: colors.textSecondary }]}>기록 항목</Text>
        <GlassCard style={styles.card} noPadding>
          <SettingsRow
            label="성생활"
            right={<ToggleSwitch value={!hidden.includes('sex')} onChange={(v) => toggleGroups(['sex'], v)} />}
          />
          <RowDivider />
          <SettingsRow
            label="자궁경부 점액 · 배란 테스트"
            right={
              <ToggleSwitch
                value={!FERTILITY_GROUPS.every((k) => hidden.includes(k))}
                onChange={(v) => toggleGroups(FERTILITY_GROUPS, v)}
              />
            }
          />
        </GlassCard>
        <Text style={[styles.footnote, { color: colors.textSecondary }]}>끄면 기록 화면에서 숨겨요. 이미 남긴 기록은 지우지 않아요.</Text>

        <Text style={[styles.section, { color: colors.textSecondary }]}>데이터</Text>
        <GlassCard style={styles.card} noPadding>
          <SettingsRow label="생리 데이터 삭제" danger onPress={() => setDeleteOpen(true)} />
        </GlassCard>
      </ScrollView>

      <PeriodLogSheet visible={logOpen} editing={null} onClose={() => setLogOpen(false)} />

      <AlertModal
        visible={deleteOpen}
        onClose={() => !deleteBusy && setDeleteOpen(false)}
        title="생리 데이터를 지울까요?"
        body={
          authStatus === 'member'
            ? '생리 기록, 주기 설정, 일일 기록(증상·기분·메모)이 이 기기와 계정에서 모두 지워져요. 다른 기록은 그대로예요. 되돌릴 수 없어요.'
            : '생리 기록, 주기 설정, 일일 기록(증상·기분·메모)이 모두 지워져요. 다른 기록은 그대로예요. 되돌릴 수 없어요.'
        }
        dangerLabel="삭제"
        onDanger={confirmDelete}
        dangerLoading={deleteBusy}
        primaryLabel="취소"
        onPrimary={() => !deleteBusy && setDeleteOpen(false)}
      />
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
  cardTitle: typography.cardTitle,
  hint: {
    fontSize: 13,
    ...weight(400),
    lineHeight: 13 * 1.5,
    marginTop: 4,
  },
  firstBtn: {
    marginTop: 14,
  },
  // 묶음 제목은 카드 밖 작은 회색 글씨(설정 화면과 같은 결).
  section: {
    ...typography.label,
    paddingHorizontal: ROW_PAD,
    marginTop: 8,
    marginBottom: 8,
  },
  footnote: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    paddingHorizontal: ROW_PAD,
    marginTop: -4,
    marginBottom: 12,
  },
  numRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numCol: {
    flex: 1,
    gap: 6,
  },
  numLabel: typography.label,
  numHint: {
    fontSize: 12,
    ...weight(400),
    textAlign: 'center',
  },
  notice: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    marginTop: 12,
  },
});
