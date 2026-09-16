import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FittoCharacter from '../../components/FittoCharacter';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { calculateGoals } from '../../utils/goals';
import { typography } from '../../theme/tokens';
import {
  ACTIVITY_OPTIONS,
  AVOID_TAGS,
  DISEASE_TAGS,
  GENDERS,
  GOAL_OPTIONS,
  TASTE_TAGS,
  labelOf,
  labelsOf,
  type TagOption,
} from '../../constants/codes';
import type { TagSelection } from '../../store/useAppStore';

// README "완료 화면": 인사 → 목표 카드 2개 → 요약 블록 → 의료 면책 안내.
export default function CompleteStep() {
  const { colors } = useTheme();
  const obInfo = useAppStore((s) => s.obInfo);
  const obTags = useAppStore((s) => s.obTags);
  const obPick = useAppStore((s) => s.obPick);

  const result = calculateGoals({
    gender: obInfo.gender,
    age: obInfo.age,
    height: obInfo.height,
    weight: obInfo.weight,
    activity: obPick.activity,
    goal: obPick.goal,
  });

  const name = obInfo.name.trim() || '피또 친구';

  // 위 카드의 목표 칼로리·BMR이 어떤 값에서 나왔는지 보여준다.
  // 입력 원본이 아니라 calculateGoals가 실제로 쓴 값이라, 비워뒀거나 범위를 벗어나
  // 기본값·잘린 값으로 계산됐을 때도 화면 숫자와 어긋나지 않는다.
  const body = [
    labelOf(GENDERS, obInfo.gender),
    `${result.age}세`,
    `${result.height}cm`,
    `${result.weight}kg`,
  ].filter(Boolean).join(' · ');

  // 고른 태그는 코드라 라벨로 바꾸고, 직접 입력한 값은 적은 그대로 보여준다.
  const tagLabels = (selection: TagSelection, options: readonly TagOption[]) => [
    ...labelsOf(options, selection.codes),
    ...selection.custom,
  ];

  const summaryRows = [
    { label: '신체 정보', values: [body], empty: '' },
    { label: '건강 상태', values: tagLabels(obTags.health, DISEASE_TAGS), empty: '해당사항 없음' },
    { label: '식단 취향', values: tagLabels(obTags.taste, TASTE_TAGS), empty: '가리지 않음' },
    { label: '제외 음식', values: tagLabels(obTags.avoid, AVOID_TAGS), empty: '없음' },
  ];

  return (
    <View>
      <View style={styles.greetRow}>
        <FittoCharacter current={4} goal={5} size={62} variant="face" glowSize={74} />
        <View style={styles.greetText}>
          <Text style={[styles.greetName, { color: colors.txt }]}>{name}님, 반가워요!</Text>
          <Text style={[styles.greetMeta, { color: colors.sub }]}>
            {[labelOf(ACTIVITY_OPTIONS, obPick.activity), labelOf(GOAL_OPTIONS, obPick.goal)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={[styles.card, { backgroundColor: colors.card2, borderColor: colors.stroke }]}>
          <Text style={[styles.cardLabel, { color: colors.sub }]}>목표 칼로리</Text>
          <Text style={[styles.cardValue, { color: colors.txt }]}>{result.kcal.toLocaleString()}</Text>
          <Text style={[styles.cardCaption, { color: colors.sub }]}>kcal · BMR {result.bmr.toLocaleString()}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card2, borderColor: colors.stroke }]}>
          <Text style={[styles.cardLabel, { color: colors.sub }]}>물 목표</Text>
          <Text style={[styles.cardValue, { color: colors.txt }]}>{result.water.toLocaleString()}</Text>
          <Text style={[styles.cardCaption, { color: colors.sub }]}>ml · 체중·활동량 기준</Text>
        </View>
      </View>

      <View style={[styles.summary, { backgroundColor: colors.card2 }]}>
        {summaryRows.map((row) => (
          <View key={row.label} style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.sub }]}>{row.label}</Text>
            <Text style={[styles.summaryValue, { color: colors.txt }]} numberOfLines={2}>
              {row.values.length ? row.values.join(', ') : row.empty}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.notice, { color: colors.sub }]}>
        이 정보를 반영한 추천 식단이 준비됐어요. 의료 진단을 대체하지 않습니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greetText: {
    flex: 1,
    gap: 3,
  },
  greetName: typography.rowLabel,
  greetMeta: typography.bodySm,
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  cardLabel: typography.label,
  cardValue: typography.bigNumber,
  cardCaption: typography.captionSm,
  summary: {
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryLabel: {
    ...typography.label,
    width: 62,
  },
  summaryValue: {
    ...typography.unit,
    flex: 1,
  },
  notice: {
    ...typography.bodySm,
    marginTop: 14,
  },
});
