import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import Icon from '../../components/Icon';
import DetailHeader from '../detail/DetailHeader';
import SelectChip from '../../components/SelectChip';
import { ChoiceSheet, TagSheet } from './ProfileSheets';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import {
  ACTIVITY_OPTIONS,
  AVOID_TAGS,
  DISEASE_TAGS,
  GENDERS,
  GOAL_OPTIONS,
  labelOf,
  labelsOf,
} from '../../constants/codes';
import BirthDateFields, { type BirthDateValue } from '../../components/BirthDateFields';
import { INPUT_LIMITS, birthYearLimits } from '../../utils/goals';
import { typography, weight } from '../../theme/tokens';

type NumKey = 'height' | 'weight' | 'targetWeight';
type SheetKey = 'goal' | 'activity' | 'conditions' | 'allergies';

// 프로필(시안 17). 기본 정보는 값이 바뀌는 대로 저장하고, 목표·활동량·건강은 시트에서 골라 "저장"으로 반영한다.
// 숫자 입력만 blur 시점에 클램프해서 커밋한다(타이핑 중간값이 범위를 벗어나도 막지 않기 위해).
// 성별·생년월일·키·체중·활동량·목표가 바뀌면 스토어가 목표 칼로리를 다시 계산한다(명세 F-040·F-041).
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const kcalGoal = useAppStore((s) => s.goals.kcal);
  const setProfile = useAppStore((s) => s.setProfile);

  const [nickname, setNickname] = useState(profile.nickname);
  const [birth, setBirth] = useState<BirthDateValue>({
    year: profile.birthYear ? String(profile.birthYear) : '',
    month: profile.birthdayMonth ? String(profile.birthdayMonth) : '',
    day: profile.birthdayDay ? String(profile.birthdayDay) : '',
  });
  const [height, setHeight] = useState(profile.height ? String(profile.height) : '');
  const [weight, setWeight] = useState(profile.weight ? String(profile.weight) : '');
  const [targetWeight, setTargetWeight] = useState(profile.targetWeight ? String(profile.targetWeight) : '');
  const [sheet, setSheet] = useState<SheetKey | null>(null);

  // 다른 화면(온보딩 다시 보기 등)에서 profile이 바뀌면 입력값도 같이 갱신한다.
  useEffect(() => setNickname(profile.nickname), [profile.nickname]);

  // 세 칸을 한 번에 범위로 자르고 저장한다. 나이는 스토어가 생년월일로 다시 계산한다.
  // 연도를 비우면 저장된 연도로 되돌린다 — 나이가 목표 계산에 쓰여서 비워둘 수 없다.
  const commitBirth = () => {
    const clampText = (text: string, min: number, max: number) => {
      const n = parseInt(text, 10);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
    };
    const limits = birthYearLimits();
    const year = clampText(birth.year, limits.min, limits.max) ?? profile.birthYear;
    const month = clampText(birth.month, 1, 12);
    const day = clampText(birth.day, 1, 31);
    setBirth({ year: year ? String(year) : '', month: month ? String(month) : '', day: day ? String(day) : '' });
    if (year !== profile.birthYear || month !== profile.birthdayMonth || day !== profile.birthdayDay) {
      setProfile({ birthYear: year, birthdayMonth: month, birthdayDay: day });
    }
  };
  // 비운 채로 나가면 원래 이름으로 되돌린다. 입력창도 같이 되돌려야 빈 칸으로 남지 않는다.
  const commitNickname = () => {
    const next = nickname.trim() || profile.nickname;
    setNickname(next);
    setProfile({ nickname: next });
  };
  // 온보딩과 같은 범위로 자른다(utils/goals의 INPUT_LIMITS). 목표 체중도 몸무게와 같은 범위를 쓴다.
  const commitNum = (text: string, setText: (t: string) => void, key: NumKey) => {
    const limit = key === 'height' ? INPUT_LIMITS.height : INPUT_LIMITS.weight;
    const n = parseInt(text, 10);
    const clamped = Number.isFinite(n) && n > 0 ? Math.min(limit.max, Math.max(limit.min, n)) : null;
    setText(clamped ? String(clamped) : '');
    // 값이 그대로면 스토어를 건드리지 않는다. 포커스만 옮겨도 재계산이 돌지 않게.
    if (clamped !== profile[key]) setProfile({ [key]: clamped });
  };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DetailHeader title="프로필" />

        {/* 기본 정보는 한 장에 펼쳐 둔다(시안 17). 자주 고치는 값이라 한 번 더 들어가게 하지 않는다. */}
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>기본 정보</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>닉네임</Text>
          <TextField
            value={nickname}
            onChangeText={setNickname}
            clearable
            onEndEditing={commitNickname}
            onBlur={commitNickname}
            placeholder="피또가 부를 이름"
            maxLength={20}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>생년월일</Text>
          <BirthDateFields value={birth} onChange={(p) => setBirth((b) => ({ ...b, ...p }))} onCommit={commitBirth} />
          {/* 연도가 없는 건 연도가 생기기 전에 가입한 사람이다. 한 번 채우면 나이를 따로 고칠 일이 없다. */}
          <Text
            style={[styles.birthNote, { color: profile.birthYear ? colors.textSecondary : colors.textAccent }]}
          >
            {!profile.birthYear
              ? '태어난 연도를 넣어 주세요. 나이를 알아서 계산해요'
              : profile.birthdayMonth && profile.birthdayDay
                ? `만 ${profile.age}세 · 생일 당일에는 피또가 축하해 드려요`
                : `만 ${profile.age}세 · 월·일을 넣으면 생일에 피또가 축하해 드려요`}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>성별</Text>
          {/* 안 고른 상태가 있을 수 있어서 붙은 세그먼트 대신 떨어진 칩(시안 규칙 13). */}
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <SelectChip
                key={g.code}
                label={g.label}
                selected={profile.gender === g.code}
                onPress={() => setProfile({ gender: g.code })}
                fill
              />
            ))}
          </View>

          <View style={styles.numRow}>
            <NumField label="키 (cm)" value={height} onChangeText={setHeight} onCommit={() => commitNum(height, setHeight, 'height')} colors={colors} />
            <NumField label="체중 (kg)" value={weight} onChangeText={setWeight} onCommit={() => commitNum(weight, setWeight, 'weight')} colors={colors} />
            <NumField
              label="목표 체중 (kg)"
              value={targetWeight}
              onChangeText={setTargetWeight}
              onCommit={() => commitNum(targetWeight, setTargetWeight, 'targetWeight')}
              colors={colors}
            />
          </View>
          <Text style={[styles.goalNote, { color: colors.textSecondary }]}>
            목표 칼로리 {kcalGoal.toLocaleString()}kcal · 성별·나이·키·체중·활동량·목표를 바꾸면 다시 계산돼요.
          </Text>
        </GlassCard>

        {/* 가끔 바꾸는 값은 요약 줄로 접고 시트에서 고른다(시안 17). 펼쳐 두면 화면이 목록으로만 길어진다. */}
        <GlassCard style={styles.card} noPadding>
          <Text style={[styles.cardTitle, styles.listTitle, { color: colors.textPrimary }]}>목표와 활동량</Text>
          <SummaryRow
            label="목표"
            value={labelOf(GOAL_OPTIONS, profile.goalType) || '고르기'}
            onPress={() => setSheet('goal')}
            colors={colors}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors.borderDivider }]} />
          <SummaryRow
            label="활동량"
            value={labelOf(ACTIVITY_OPTIONS, profile.activity) || '고르기'}
            onPress={() => setSheet('activity')}
            colors={colors}
          />
        </GlassCard>

        <GlassCard style={styles.card} noPadding>
          <Text style={[styles.cardTitle, styles.listTitle, { color: colors.textPrimary }]}>건강</Text>
          <TagRow
            label="건강 상태"
            items={[...labelsOf(DISEASE_TAGS, profile.conditions), ...profile.customConditions]}
            onPress={() => setSheet('conditions')}
            colors={colors}
          />
          <View style={[styles.rowDivider, styles.rowDividerBoth, { backgroundColor: colors.borderDivider }]} />
          <TagRow
            label="알레르기"
            items={[...labelsOf(AVOID_TAGS, profile.allergies), ...profile.customAllergies]}
            onPress={() => setSheet('allergies')}
            colors={colors}
          />
        </GlassCard>
      </ScrollView>

      <ChoiceSheet
        visible={sheet === 'goal'}
        title="목표"
        options={GOAL_OPTIONS}
        value={profile.goalType}
        onSave={(v) => setProfile({ goalType: v })}
        onClose={() => setSheet(null)}
      />
      <ChoiceSheet
        visible={sheet === 'activity'}
        title="활동량"
        options={ACTIVITY_OPTIONS}
        value={profile.activity}
        onSave={(v) => setProfile({ activity: v })}
        onClose={() => setSheet(null)}
      />
      <TagSheet
        visible={sheet === 'conditions'}
        title="건강 상태"
        tags={DISEASE_TAGS}
        value={{ codes: profile.conditions, custom: profile.customConditions }}
        placeholder="기타 질환을 입력하세요"
        onSave={(v) => setProfile({ conditions: v.codes, customConditions: v.custom })}
        onClose={() => setSheet(null)}
      />
      <TagSheet
        visible={sheet === 'allergies'}
        title="알레르기"
        tags={AVOID_TAGS}
        value={{ codes: profile.allergies, custom: profile.customAllergies }}
        placeholder="기타 알레르기를 입력하세요"
        onSave={(v) => setProfile({ allergies: v.codes, customAllergies: v.custom })}
        onClose={() => setSheet(null)}
      />
    </ScreenBackground>
  );
}

/** 요약 줄: 이름 · 지금 값(회색) · 이동 화살표. */
function SummaryRow({ label, value, onPress, colors }: { label: string; value: string; onPress: () => void; colors: any }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      style={({ pressed }) => [styles.summaryRow, pressed && { backgroundColor: colors.fillMuted }]}
    >
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
        <Icon name="chevronRight" size={16} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

/** 태그 요약 줄: 고른 항목을 누를 수 없는 작은 회색 태그로 보여 준다. 없으면 "없음". */
function TagRow({ label, items, onPress, colors }: { label: string; items: string[]; onPress: () => void; colors: any }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${items.length > 0 ? items.join(', ') : '없음'}`}
      style={({ pressed }) => [styles.tagRow, pressed && { backgroundColor: colors.fillMuted }]}
    >
      <View style={styles.tagCol}>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        {items.length > 0 ? (
          <View style={styles.tagWrap}>
            {items.map((t) => (
              <View key={t} style={[styles.tag, { backgroundColor: colors.fillMuted }]}>
                <Text style={[styles.tagText, { color: colors.textPrimary }]}>{t}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.none, { color: colors.textSecondary }]}>없음</Text>
        )}
      </View>
      <Icon name="chevronRight" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

function NumField({
  label,
  value,
  onChangeText,
  onCommit,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onCommit: () => void;
  colors: any;
}) {
  return (
    <View style={styles.numCol}>
      <Text style={[styles.numLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextField
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
        onEndEditing={onCommit}
        onBlur={onCommit}
        keyboardType="numeric"
        center
      />
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
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    ...typography.label,
    marginTop: 14,
    marginBottom: 6,
  },
  birthNote: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    marginTop: 6,
  },
  numRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  numCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  numLabel: typography.label,
  goalNote: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    marginTop: 12,
  },
  listTitle: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  summaryRow: {
    minHeight: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    fontSize: 15,
    ...weight(600),
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 14,
    ...weight(400),
    flexShrink: 1,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 18,
  },
  rowDividerBoth: {
    marginRight: 18,
  },
  tagRow: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagCol: {
    flex: 1,
    minWidth: 0,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 13,
    ...weight(600),
  },
  none: {
    fontSize: 13,
    marginTop: 4,
  },
});
