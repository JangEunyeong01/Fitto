import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import FittoCharacter from '../../components/FittoCharacter';
import DetailHeader from '../detail/DetailHeader';
import PeriodCalendar from './PeriodCalendar';
import ConditionCard from './ConditionCard';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { personaCopy } from '../../copy/persona';
import { dateKey } from '../../utils/timeOfDay';
import { getCycleDayNumber, parseDateKey, shiftYearMonth } from '../../utils/periodCycle';
import { typography } from '../../theme/tokens';

export default function PeriodDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const persona = useAppStore((s) => s.persona);
  const settings = useAppStore((s) => s.periodSettings);

  const today = dateKey();
  const [selected, setSelected] = useState(today);
  const now = parseDateKey(today);
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const shiftMonth = (delta: number) => setView((v) => shiftYearMonth(v, delta));

  const cycleDay = getCycleDayNumber(today, settings);
  const comment = personaCopy.periodComment[persona]({ day: cycleDay });

  const selectedDate = parseDateKey(selected);
  const selectedLabel = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="생리 주기" />

        <PeriodCalendar
          year={view.year}
          month={view.month}
          onShiftMonth={shiftMonth}
          selected={selected}
          onSelect={setSelected}
          settings={settings}
        />

        <ConditionCard dateKey={selected} label={selectedLabel} />

        <GlassCard style={styles.card}>
          <View style={styles.characterRow}>
            {/* README의 hue-rotate 필터는 RN에서 못 쓰므로 캐릭터는 기본 상태로 두고 문구로 맥락을 준다. */}
            <FittoCharacter current={3} goal={5} size={52} variant="face" glow={false} />
            <Text style={[styles.comment, { color: colors.txt }]}>{comment}</Text>
          </View>
        </GlassCard>
      </ScrollView>
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
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  comment: {
    ...typography.body,
    flex: 1,
  },
});
