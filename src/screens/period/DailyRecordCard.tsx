import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GlassCard from '../../components/GlassCard';
import Badge from '../../components/Badge';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { periodTagLabel } from '../../constants/periodTags';

/**
 * 고른 날의 일일 기록 요약. 누르면 기록 화면으로 간다.
 * 예전엔 이 카드 안에서 바로 컨디션·증상을 골랐는데, 항목이 일곱 묶음으로 늘어 카드에 다 담으면
 * 달력 아래가 끝없이 길어진다. 여기선 고른 것만 보여주고 고르기는 기록 화면에서 한다.
 */
export default function DailyRecordCard({ dateKey, label }: { dateKey: string; label: string }) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const record = useAppStore((s) => s.dailyRecords[dateKey]);
  const codes = record?.periodSymptoms ?? [];
  const notes = [record?.periodMedication && `복용약 ${record.periodMedication}`, record?.periodMemo].filter(Boolean);
  const empty = codes.length === 0 && notes.length === 0;

  return (
    <Pressable
      onPress={() => navigation.navigate('PeriodRecord', { date: dateKey })}
      accessibilityRole="button"
      accessibilityLabel={`${label} 일일 기록, ${empty ? '기록 없음' : `${codes.length}개 항목`}, 눌러서 기록하기`}
    >
      {({ pressed }) => (
        <GlassCard style={[styles.card, { opacity: pressed ? 0.7 : 1 }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{label} 일일 기록</Text>
            <Icon name="chevronRight" size={20} color={colors.textSecondary} />
          </View>
          {empty ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>증상과 기분을 기록해 보세요</Text>
          ) : (
            <>
              {codes.length > 0 && (
                <View style={styles.chips}>
                  {codes.map((c) => (
                    <Badge key={c} label={periodTagLabel(c)} />
                  ))}
                </View>
              )}
              {notes.map((n) => (
                <Text key={n as string} style={[styles.note, { color: colors.textSecondary }]} numberOfLines={2}>
                  {n}
                </Text>
              ))}
            </>
          )}
        </GlassCard>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22,
  },
  title: typography.cardTitle,
  empty: {
    fontSize: 14,
    ...weight(400),
    marginTop: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  note: {
    fontSize: 13,
    ...weight(400),
    marginTop: 8,
  },
});
