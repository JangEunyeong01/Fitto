import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarSpace } from '../../navigation/TabBar';
import ScreenBackground from '../../components/ScreenBackground';
import FittoCharacter from '../../components/FittoCharacter';
import DetailHeader from '../detail/DetailHeader';
import PeriodCalendar from './PeriodCalendar';
import DailyRecordCard from './DailyRecordCard';
import RegularityCard from './RegularityCard';
import PeriodLogSheet from './PeriodLogSheet';
import PrimaryButton from '../../components/PrimaryButton';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { personaCopy } from '../../copy/persona';
import { dateKey } from '../../utils/timeOfDay';
import { findLog, getBandDay, getCycleDayNumber, getPeriodHeadline, parseDateKey, shiftYearMonth } from '../../utils/periodCycle';
import { weight } from '../../theme/tokens';

export default function PeriodDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const persona = useAppStore((s) => s.persona);
  const settings = useAppStore((s) => s.periodSettings);
  const logs = useAppStore((s) => s.periodLogs);

  const today = dateKey();
  const [selected, setSelected] = useState(today);
  const now = parseDateKey(today);
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const shiftMonth = (delta: number) => setView((v) => shiftYearMonth(v, delta));
  const navigation = useNavigation<any>();
  const [sheetOpen, setSheetOpen] = useState(false);

  const cycleDay = getCycleDayNumber(today, settings);
  const comment = personaCopy.periodComment[persona]({ day: cycleDay });
  const onPeriod = getBandDay(today, settings, logs, today)?.type === 'period';

  const selectedDate = parseDateKey(selected);
  const selectedLabel = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;

  // 버튼 하나가 상황에 맞게 바뀐다. 진행 중이면 끝 넣기, 고른 날이 기록 안이면 그 기록 고치기,
  // 아니면 고른 날(오늘 이후면 오늘)부터 새로 시작. 달력에서 날짜를 고르고 바로 누르면 된다.
  const latest = logs[logs.length - 1];
  const ongoing = latest && !latest.end ? latest : null;
  const selectedLog = findLog(logs, selected, today) ?? null;
  const target = ongoing ?? selectedLog;
  const buttonLabel = ongoing
    ? '생리 끝 입력'
    : selectedLog
      ? '이 생리 기록 고치기'
      : `${selected > today ? '오늘' : selectedLabel} 생리 시작`;

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="생리 주기" />

        {/* 이 화면에서 제일 궁금한 건 "언제"라서 달력보다 먼저 한 줄로 답한다. */}
        <Text style={[styles.headline, { color: colors.textPrimary }]} accessibilityRole="header">
          {getPeriodHeadline(today, settings, logs)}
        </Text>

        <PeriodCalendar
          year={view.year}
          month={view.month}
          onShiftMonth={shiftMonth}
          selected={selected}
          onSelect={setSelected}
          settings={settings}
        />

        <PrimaryButton label={buttonLabel} onPress={() => setSheetOpen(true)} style={styles.logButton} />

        <RegularityCard onOpenHistory={() => navigation.navigate('PeriodHistory')} />

        <DailyRecordCard dateKey={selected} label={selectedLabel} />

        {/* 피또 한마디는 카드 없이 한 줄로(시안 10). 카드를 씌우면 입력 카드와 무게가 같아진다.
            문구가 "N일차, 무리하지 말고 따뜻하게"라 생리 중일 때만 보인다. 주기 17일째에 그 말을 하면 틀린 말이 된다. */}
        {onPeriod && (
          <View style={styles.characterRow}>
            <FittoCharacter current={3} goal={5} size={52} variant="face" glow={false} />
            <Text style={[styles.comment, { color: colors.textPrimary }]}>{comment}</Text>
          </View>
        )}
      </ScrollView>

      <PeriodLogSheet
        visible={sheetOpen}
        editing={target}
        defaultStart={selected}
        onClose={() => setSheetOpen(false)}
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
  headline: {
    fontSize: 22,
    ...weight(700),
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  logButton: {
    marginBottom: 12,
  },
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
    paddingHorizontal: 2,
    paddingBottom: 12,
  },
  comment: {
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
});
