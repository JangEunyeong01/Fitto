import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import DatePickerSheet from '../../components/DatePickerSheet';
import PrimaryButton from '../../components/PrimaryButton';
import ToggleSwitch from '../../components/ToggleSwitch';
import { DateChip } from '../detail/PeriodBar';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { dateKey } from '../../utils/timeOfDay';
import { addDays, checkLogs, daysBetween, MAX_LOG_DAYS, type PeriodLog } from '../../utils/periodCycle';

interface PeriodLogSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 고칠 기록. 없으면 새로 넣는다. */
  editing: PeriodLog | null;
  /** 새로 넣을 때 시작일 기본값(달력에서 고른 날). */
  defaultStart?: string;
}

/**
 * 생리 기록 한 건 넣기·고치기. 시작·끝 두 날짜를 고르고, 아직 안 끝났으면 "진행 중".
 * 진행 중인 기록을 열면 끝날을 오늘로 채워 둔다 — 이 시트를 여는 가장 흔한 이유가 "오늘 끝났어"라서.
 * 저장 전에 서버와 같은 규칙(checkLogs)으로 검사해 겹침·미래 날짜를 여기서 막는다.
 */
export default function PeriodLogSheet({ visible, onClose, editing, defaultStart }: PeriodLogSheetProps) {
  const { colors } = useTheme();
  const logs = useAppStore((s) => s.periodLogs);
  const periodLength = useAppStore((s) => s.periodSettings.periodLength);
  const setPeriodLogs = useAppStore((s) => s.setPeriodLogs);
  const showToast = useToastStore((s) => s.show);
  const today = dateKey();

  const [start, setStart] = useState(today);
  const [end, setEnd] = useState<string | null>(null);
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 열 때마다 처음 값으로. 새 기록은 진행 중으로 시작한다(대개 "오늘 시작했어"를 넣으러 온다).
  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (editing) {
      setStart(editing.start);
      setEnd(editing.end ?? (today > editing.start ? today : null));
    } else {
      setStart(defaultStart && defaultStart <= today ? defaultStart : today);
      setEnd(null);
    }
  }, [visible, editing, defaultStart]);

  const others = logs.filter((l) => l !== editing);
  const ongoing = end === null;

  const save = () => {
    const next = [...others, { start, end }];
    const problem = checkLogs(next, today);
    if (problem) {
      setError(problem);
      return;
    }
    setPeriodLogs(next);
    onClose();
    showToast(editing ? '생리 기록을 고쳤어요' : '생리 기록을 남겼어요');
  };

  const remove = () => {
    if (!editing) return;
    const before = logs;
    setPeriodLogs(others);
    onClose();
    // 지워도 바로 되돌릴 수 있어서 확인창 대신 토스트 실행 취소(시안 규칙 24).
    showToast('생리 기록을 지웠어요', { label: '실행 취소', onPress: () => setPeriodLogs(before) });
  };

  const days = end ? daysBetween(start, end) + 1 : null;

  return (
    <BottomSheet
      visible={visible}
      title={editing ? '생리 기록 고치기' : '생리 기록'}
      onClose={onClose}
      footer={
        <View style={styles.footer}>
          {editing && <PrimaryButton label="지우기" variant="dangerOutline" onPress={remove} style={styles.half} />}
          <PrimaryButton label="저장" onPress={save} style={styles.half} />
        </View>
      }
    >
      <View style={styles.row}>
        <DateChip label="시작" value={start} onPress={() => setPicking('start')} />
        <Text style={[styles.dash, { color: colors.textSecondary }]}>–</Text>
        {ongoing ? (
          <View style={[styles.ongoing, { backgroundColor: colors.fillMuted }]}>
            <Text style={[styles.ongoingLabel, { color: colors.textSecondary }]}>끝</Text>
            <Text style={[styles.ongoingValue, { color: colors.textSecondary }]}>진행 중</Text>
          </View>
        ) : (
          <DateChip label="끝" value={end} onPress={() => setPicking('end')} />
        )}
      </View>
      {days !== null && <Text style={[styles.days, { color: colors.textSecondary }]}>{days}일 동안</Text>}

      <View style={[styles.toggleRow, { borderTopColor: colors.borderDivider }]}>
        <View style={styles.toggleText}>
          <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>아직 진행 중</Text>
          <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>끝나면 이 기록을 열어 끝날을 넣어 주세요</Text>
        </View>
        <ToggleSwitch
          value={ongoing}
          // 끄면 끝날을 평균 기간으로 채운다. 오늘을 넘으면 오늘까지.
          onChange={(v) => {
            setError(null);
            if (v) setEnd(null);
            else setEnd([addDays(start, periodLength - 1), today].sort()[0]);
          }}
        />
      </View>

      {error && <Text style={[styles.error, { color: colors.textDanger }]}>{error}</Text>}

      <DatePickerSheet
        visible={picking === 'start'}
        title="시작 날짜"
        value={start}
        max={end ?? today}
        min={end ? addDays(end, -(MAX_LOG_DAYS - 1)) : undefined}
        showToday={false}
        onPick={(k) => {
          setError(null);
          setStart(k);
        }}
        onClose={() => setPicking(null)}
      />
      <DatePickerSheet
        visible={picking === 'end'}
        title="끝 날짜"
        value={end ?? today}
        min={start}
        max={[today, addDays(start, MAX_LOG_DAYS - 1)].sort()[0]}
        showToday={false}
        onPick={(k) => {
          setError(null);
          setEnd(k);
        }}
        onClose={() => setPicking(null)}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dash: {
    fontSize: 15,
    ...weight(600),
  },
  ongoing: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 2,
  },
  ongoingLabel: {
    fontSize: 12,
    ...weight(600),
  },
  ongoingValue: {
    fontSize: 15,
    ...weight(600),
  },
  days: {
    ...typography.micro,
    marginTop: 8,
    textAlign: 'right',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: typography.itemTitle,
  toggleSub: {
    fontSize: 12,
    ...weight(400),
    marginTop: 2,
  },
  error: {
    fontSize: 13,
    ...weight(500),
    marginTop: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
});
