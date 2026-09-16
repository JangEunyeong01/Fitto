import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import DetailHeader from '../detail/DetailHeader';
import SegmentedControl from '../../components/SegmentedControl';
import OptionRow from '../onboarding/OptionRow';
import TagPicker from '../onboarding/TagPicker';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { ACTIVITY_OPTIONS, GENDERS, HEALTH_TAGS, AVOID_TAGS } from '../onboarding/onboardingData';
import { INPUT_LIMITS } from '../../utils/goals';
import { typography } from '../../theme/tokens';

// README 9. 프로필: 언제든 수정 가능한 필드들 — 저장 버튼 없이 값이 바뀌는 대로 스토어에 반영한다.
// 숫자 입력만 blur 시점에 클램프해서 커밋한다(타이핑 중간값이 범위를 벗어나도 막지 않기 위해).
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);

  const [nickname, setNickname] = useState(profile.nickname);
  const [birthMonth, setBirthMonth] = useState(profile.birthdayMonth ? String(profile.birthdayMonth) : '');
  const [birthDay, setBirthDay] = useState(profile.birthdayDay ? String(profile.birthdayDay) : '');
  const [height, setHeight] = useState(profile.height ? String(profile.height) : '');
  const [weight, setWeight] = useState(profile.weight ? String(profile.weight) : '');
  const [targetWeight, setTargetWeight] = useState(profile.targetWeight ? String(profile.targetWeight) : '');

  // 다른 화면(온보딩 다시 보기 등)에서 profile이 바뀌면 입력값도 같이 갱신한다.
  useEffect(() => setNickname(profile.nickname), [profile.nickname]);

  const commitBirthMonth = () => {
    const n = parseInt(birthMonth, 10);
    const clamped = Number.isFinite(n) ? Math.min(12, Math.max(1, n)) : null;
    setBirthMonth(clamped ? String(clamped) : '');
    setProfile({ birthdayMonth: clamped });
  };
  const commitBirthDay = () => {
    const n = parseInt(birthDay, 10);
    const clamped = Number.isFinite(n) ? Math.min(31, Math.max(1, n)) : null;
    setBirthDay(clamped ? String(clamped) : '');
    setProfile({ birthdayDay: clamped });
  };
  // 비운 채로 나가면 원래 이름으로 되돌린다. 입력창도 같이 되돌려야 빈 칸으로 남지 않는다.
  const commitNickname = () => {
    const next = nickname.trim() || profile.nickname;
    setNickname(next);
    setProfile({ nickname: next });
  };
  // 온보딩과 같은 범위로 자른다(utils/goals의 INPUT_LIMITS). 목표 체중도 몸무게와 같은 범위를 쓴다.
  const commitNum = (text: string, setText: (t: string) => void, key: 'height' | 'weight' | 'targetWeight') => {
    const limit = key === 'height' ? INPUT_LIMITS.height : INPUT_LIMITS.weight;
    const n = parseInt(text, 10);
    const clamped = Number.isFinite(n) && n > 0 ? Math.min(limit.max, Math.max(limit.min, n)) : null;
    setText(clamped ? String(clamped) : '');
    setProfile({ [key]: clamped });
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

        <GlassCard style={styles.card}>
          <Text style={[styles.label, { color: colors.sub }]}>닉네임</Text>
          <TextField
            value={nickname}
            onChangeText={setNickname}
            clearable
            onEndEditing={commitNickname}
            onBlur={commitNickname}
            placeholder="피또가 부를 이름"
          />

          <Text style={[styles.label, { color: colors.sub, marginTop: 14 }]}>생일</Text>
          <View style={styles.birthRow}>
            <TextField
              value={birthMonth}
              onChangeText={(t) => setBirthMonth(t.replace(/[^0-9]/g, ''))}
              onEndEditing={commitBirthMonth}
              onBlur={commitBirthMonth}
              placeholder="월"
              keyboardType="numeric"
              center
              style={styles.birthInput}
            />
            <TextField
              value={birthDay}
              onChangeText={(t) => setBirthDay(t.replace(/[^0-9]/g, ''))}
              onEndEditing={commitBirthDay}
              onBlur={commitBirthDay}
              placeholder="일"
              keyboardType="numeric"
              center
              style={styles.birthInput}
            />
          </View>

          <Text style={[styles.label, { color: colors.sub, marginTop: 14 }]}>성별</Text>
          <View style={styles.gap10}>
            <SegmentedControl
              options={GENDERS.map((g) => ({ value: g, label: g }))}
              value={profile.gender as (typeof GENDERS)[number] | null}
              onChange={(g) => setProfile({ gender: g })}
            />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
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
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.txt }]}>활동량</Text>
          <View style={styles.gap10}>
            {ACTIVITY_OPTIONS.map((o) => (
              <OptionRow
                key={o.label}
                title={o.label}
                desc={o.desc}
                selected={profile.activity === o.label}
                onPress={() => setProfile({ activity: o.label })}
              />
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.txt }]}>건강 상태</Text>
          <View style={styles.gap10}>
            <TagPicker
              tags={HEALTH_TAGS}
              selected={profile.conditions}
              onToggle={(v) =>
                setProfile({
                  conditions: profile.conditions.includes(v)
                    ? profile.conditions.filter((c) => c !== v)
                    : [...profile.conditions, v],
                })
              }
              onClear={() => setProfile({ conditions: [] })}
              placeholder="기타 질환을 입력하세요"
              noneLabel="해당사항 없음"
            />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.txt }]}>알레르기</Text>
          <View style={styles.gap10}>
            <TagPicker
              tags={AVOID_TAGS}
              selected={profile.allergies}
              onToggle={(v) =>
                setProfile({
                  allergies: profile.allergies.includes(v)
                    ? profile.allergies.filter((a) => a !== v)
                    : [...profile.allergies, v],
                })
              }
              onClear={() => setProfile({ allergies: [] })}
              placeholder="기타 알레르기를 입력하세요"
              noneLabel="해당사항 없음"
            />
          </View>
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
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
      <Text style={[styles.numLabel, { color: colors.sub }]}>{label}</Text>
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
  cardTitle: typography.sectionTitle,
  gap10: {
    marginTop: 10,
  },
  label: {
    ...typography.label,
    marginBottom: 8,
  },
  birthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  birthInput: {
    flex: 1,
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
});
