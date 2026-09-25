import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import TextLink from '../../../components/TextLink';
import GlassCard from '../../../components/GlassCard';
import ProgressBar from '../../../components/ProgressBar';
import Icon from '../../../components/Icon';
import { useTheme } from '../../../theme/useTheme';
import { useAppStore } from '../../../store/useAppStore';
import { useFoodSearchStore } from '../../../store/useFoodSearchStore';
import { dateKey } from '../../../utils/timeOfDay';
import { getKcalStatus, kcalStatusColor, kcalStatusLabel, sumMealKcal, getBurnedKcal } from '../../../utils/health';
import { personaCopy } from '../../../copy/persona';
import { FITTO_FACE } from '../../../theme/assets';
import { spacing, typography, weight } from '../../../theme/tokens';

/**
 * 오늘 칼로리(시안 02·03).
 *
 * 화면에서 가장 먼저 읽혀야 하는 건 섭취 숫자 하나라 36으로 키우고, 나머지는 조용히 둔다.
 * - 상태("양호")는 색 링 대신 제목 옆 회색 글씨로
 * - 강조색은 "남음" 숫자 하나에만(시안 규칙 3)
 * - 예전의 장식 원·안내 박스는 뺐다. 코멘트는 기록이 있을 때만 박스 없이 한 줄
 * - 음식 기록은 칠해진 버튼이 아니라 카드 맨 아래 얇은 선 밑의 글씨 버튼(시안 규칙 1: 칠해진 건 물 +250 하나)
 */
export default function KcalCard() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const openFoodSearch = useFoodSearchStore((s) => s.show);
  const persona = useAppStore((s) => s.persona);
  const goal = useAppStore((s) => s.goals.kcal);
  const record = useAppStore((s) => s.dailyRecords[dateKey()]);

  const consumed = record ? sumMealKcal(record.meals) : 0;
  const burned = getBurnedKcal(record?.exercises ?? []);
  const remain = Math.max(0, goal - consumed);
  const status = getKcalStatus(consumed, goal);
  const percent = Math.round((consumed / goal) * 100);

  const commentFn = personaCopy.kcalComment[persona] as (v: { remainKcal: number; consumedKcal: number; percent: number }) => string;
  // 아무것도 안 먹은 게 아니라 아직 기록을 안 한 것이다. 그때는 판단하는 말을 하지 않는다(홈 인사 줄이 이미 알린다).
  const comment = consumed > 0 ? commentFn({ remainKcal: remain, consumedKcal: consumed, percent }) : null;

  return (
    <GlassCard>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          오늘 칼로리
          {consumed > 0 && (
            <Text style={[styles.status, { color: colors.textSecondary }]}>{`  · ${kcalStatusLabel[status]}`}</Text>
          )}
        </Text>
        {/* 명세 F-011: 카드에서 식단 탭으로 바로 간다. */}
        <TextLink label="식단" onPress={() => navigation.navigate('Diet')} />
      </View>

      <View style={styles.numRow}>
        <View style={styles.numLeft}>
          <Text style={[styles.bigNum, { color: colors.textPrimary }]}>{consumed.toLocaleString()}</Text>
          <Text style={[styles.goalNum, { color: colors.textSecondary }]}>/ {goal.toLocaleString()} kcal</Text>
        </View>
        {/* 피또 얼굴은 작게. 캐릭터가 숫자보다 크면 무엇을 봐야 할지 흐려진다. */}
        <View style={[styles.faceWrap, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderDivider }]}>
          <Image source={FITTO_FACE} style={styles.face} resizeMode="contain" accessible={false} />
        </View>
      </View>

      <View style={styles.barWrap}>
        {/* 넘치면 주의색으로 바뀐다. 빨강·"경고"는 쓰지 않는다(기준서 표기 원칙). */}
        <ProgressBar progress={consumed / goal} height={6} radius={3} color={kcalStatusColor[status]} />
      </View>

      <View style={[styles.summaryRow, { borderTopColor: colors.borderDivider }]}>
        <SummaryCol label="섭취" value={consumed} color={colors.textPrimary} labelColor={colors.textSecondary} />
        <SummaryCol label="소모" value={burned} color={colors.textPrimary} labelColor={colors.textSecondary} />
        <SummaryCol label="남음" value={remain} color={colors.textAccent} labelColor={colors.textSecondary} />
      </View>

      {!!comment && <Text style={[styles.comment, { color: colors.textSecondary }]}>{comment}</Text>}

      {/* 홈에서 바로 한 끼 기록. 시트가 지금 시각에 맞는 끼니를 골라준다. */}
      <Pressable
        onPress={() => openFoodSearch()}
        accessibilityRole="button"
        style={({ pressed }) => [styles.recordBtn, { borderTopColor: colors.borderDivider, opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="plus" size={20} color={colors.textPrimary} strokeWidth={2} />
        <Text style={[styles.recordLabel, { color: colors.textPrimary }]}>음식 기록</Text>
      </Pressable>
    </GlassCard>
  );
}

function SummaryCol({ label, value, color, labelColor }: { label: string; value: number; color: string; labelColor: string }) {
  return (
    <View style={styles.summaryCol}>
      <Text style={[styles.summaryLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value.toLocaleString()}</Text>
    </View>
  );
}

const PAD = spacing.cardPadding;

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 22,
  },
  title: typography.cardTitle,
  status: typography.unit,
  numRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  numLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  bigNum: {
    ...typography.heroNumber,
    lineHeight: 36 * 1.1,
  },
  goalNum: {
    fontSize: 14,
    ...weight(600),
  },
  faceWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    width: 30,
    height: 30,
  },
  barWrap: {
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryCol: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: typography.micro,
  summaryValue: {
    fontSize: 17,
    ...weight(700),
    letterSpacing: -0.3,
  },
  comment: {
    ...typography.bodySm,
    marginTop: 12,
  },
  // 카드 여백 밖까지 선을 긋고 아래를 채운다. 카드 맨 아래 한 줄이 통째로 버튼이다.
  recordBtn: {
    marginTop: 14,
    marginHorizontal: -PAD,
    marginBottom: -PAD,
    height: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  recordLabel: {
    fontSize: 15,
    ...weight(600),
  },
});
