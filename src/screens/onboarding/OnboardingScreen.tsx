import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import FittoCharacter from '../../components/FittoCharacter';
import PrimaryButton from '../../components/PrimaryButton';
import OptionRow from './OptionRow';
import OnboardingProgress from './OnboardingProgress';
import TagPicker from './TagPicker';
import BasicInfoForm from './BasicInfoForm';
import CompleteStep from './CompleteStep';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { INPUT_LIMITS } from '../../utils/goals';
import { typography } from '../../theme/tokens';
import { PERSONA_OPTIONS, STEP_LABELS, TOTAL_STEPS } from './onboardingData';
import { ACTIVITY_OPTIONS, AVOID_TAGS, DISEASE_TAGS, GOAL_OPTIONS, TASTE_TAGS } from '../../constants/codes';

const TITLES = [
  '물방울 요정 피또와\n오늘도 또, 건강하게',
  '먼저 간단히 알려주세요',
  '평소 활동량은 어느 정도인가요?',
  '어떤 목표로 시작할까요?',
  '건강 상태를 알려주세요',
  '어떤 음식을 즐겨 드세요?',
  '알레르기가 있거나\n못 먹는 음식이 있나요?',
  '피또는 어떤 말투가 좋을까요?',
  '준비 완료!',
];

const DESCRIPTIONS: (string | null)[] = [
  '숫자 대신 표정으로 건강을 알려주는 앱이에요.',
  null,
  null,
  null,
  '해당되는 질환을 선택하거나 입력해주세요',
  '추천 식단에 반영해요. 복수 선택 가능해요.',
  '추천과 검색에서 자동으로 걸러드려요.',
  null,
  null,
];

/**
 * 콘텐츠가 짧은 단계에서 남는 아래 공간을 채우는 피또 한마디.
 * 화면에 이미 적힌 안내를 되풀이하지 않고 말을 거는 톤으로만 쓴다.
 * 0단계는 큰 캐릭터가, 8단계는 인사말 옆 얼굴이 이미 있어서 비워둔다.
 */
const STEP_COMMENTS: (string | null)[] = [
  null,
  '정확할수록 목표를 잘 잡아드릴 수 있어요.',
  '무리한 목표보다 지킬 수 있는 쪽이 좋아요.',
  '목표는 나중에 언제든 바꿀 수 있어요.',
  '알려주시면 추천할 때 조심할게요.',
  '좋아하는 걸 알면 추천이 즐거워져요.',
  '한 번만 알려주시면 계속 기억할게요.',
  '말투는 설정에서 언제든 바꿀 수 있어요.',
  null,
];

const DESC_LINE_H = 19;

/**
 * 헤더가 가장 커지는 경우(단계 라벨 + 제목 두 줄 + 설명 한 줄)의 높이.
 * 어느 단계든 이만큼을 차지하게 해서 본문 시작 위치를 고정한다.
 */
const STEP_LABEL_LINE_H = 16;
const HEADER_MIN_H = STEP_LABEL_LINE_H + 8 + typography.onboardingTitle.lineHeight * 2 + 10 + DESC_LINE_H;

const COMMENT_FACE_SIZE = 56;
const COMMENT_GAP = 10;
/** 얼굴 + 간격 + 한 줄. 임계값을 눈대중 상수로 두면 상단 높이가 조금만 바뀌어도 경계에서 깜빡인다. */
const COMMENT_BLOCK_H = COMMENT_FACE_SIZE + COMMENT_GAP + 17;
/** 위아래로 숨 쉴 자리까지 나오는 단계에만 끼워 넣는다. */
const COMMENT_MIN_ROOM = COMMENT_BLOCK_H + 16;

/** STEP_LABELS가 번호를 붙이는 단계 수. 첫 인트로와 마지막 완료 화면은 번호가 없다. */
const NUMBERED_STEPS = TOTAL_STEPS - 2;

/** 범위를 벗어난 첫 항목의 안내 문구를 돌려준다. 다 정상이면 null. */
function checkRange(info: { age: string; height: string; weight: string }): string | null {
  const checks: { value: string; limit: { min: number; max: number }; label: string; unit: string }[] = [
    { value: info.age, limit: INPUT_LIMITS.age, label: '나이', unit: '세' },
    { value: info.height, limit: INPUT_LIMITS.height, label: '키', unit: 'cm' },
    { value: info.weight, limit: INPUT_LIMITS.weight, label: '몸무게', unit: 'kg' },
  ];
  for (const c of checks) {
    if (!c.value.trim()) continue; // 빈 값은 기본값으로 계산되므로 통과시킨다.
    const n = parseFloat(c.value);
    if (!Number.isFinite(n) || n < c.limit.min || n > c.limit.max) {
      return `${c.label}는 ${c.limit.min}~${c.limit.max}${c.unit} 사이로 입력해 주세요`;
    }
  }
  return null;
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const showToast = useToastStore((s) => s.show);

  const obInfo = useAppStore((s) => s.obInfo);
  const obTags = useAppStore((s) => s.obTags);
  const obPick = useAppStore((s) => s.obPick);
  const setObInfo = useAppStore((s) => s.setObInfo);
  const toggleObTag = useAppStore((s) => s.toggleObTag);
  const toggleObCustomTag = useAppStore((s) => s.toggleObCustomTag);
  const clearObTags = useAppStore((s) => s.clearObTags);
  const setObPick = useAppStore((s) => s.setObPick);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);

  /**
   * 헤더+본문이 쓰고 남은 아래 공간(room)을 재서 인트로 캐릭터와 피또 한마디를 앉힌다.
   * 두 블록은 측정 대상 바깥에 그리므로 자기 크기가 측정에 되먹임되지 않는다.
   */
  const [scrollH, setScrollH] = useState(0);
  // 어느 단계를 잰 값인지 함께 들고 있어야, 측정 전 한 프레임에 이전 단계 높이로 잘못 그리지 않는다.
  const [measured, setMeasured] = useState({ step: -1, height: 0 });
  const room = measured.step === step ? scrollH - measured.height : 0;
  const comment = STEP_COMMENTS[step];
  const showComment = !!comment && room >= COMMENT_MIN_ROOM;

  // README 유효성 검사: 통과하지 못하면 토스트를 띄우고 다음 단계로 넘어가지 않는다.
  const validate = (): boolean => {
    if (step === 1) {
      if (!obInfo.name.trim()) {
        showToast('이름을 입력해 주세요');
        return false;
      }
      // 성별이 비면 BMR이 여성 공식으로 계산돼 버려서 필수로 받는다.
      if (!obInfo.gender) {
        showToast('성별을 선택해 주세요');
        return false;
      }
      // 나이는 필수. 나이대별 건강 주의·생리 안내가 달라져서 기본값으로 채우면 안 된다.
      if (!obInfo.age.trim() || !obInfo.height.trim() || !obInfo.weight.trim()) {
        showToast('나이, 키, 몸무게를 입력해 주세요');
        return false;
      }
      // 자릿수를 잘못 넣으면 목표 칼로리·물 목표가 엉뚱하게 잡히므로 여기서 막는다.
      const outOfRange = checkRange(obInfo);
      if (outOfRange) {
        showToast(outOfRange);
        return false;
      }
    }
    if (step === 2 && !obPick.activity) {
      showToast('하나를 선택해 주세요');
      return false;
    }
    if (step === 3 && !obPick.goal) {
      showToast('하나를 선택해 주세요');
      return false;
    }
    if (step === 7 && !obPick.persona) {
      showToast('하나를 선택해 주세요');
      return false;
    }
    return true;
  };

  /**
   * 버튼 색만 바꾸기 위한 판정. validate()와 조건이 같지만 토스트를 띄우지 않는다.
   * 눌렀을 때 왜 못 넘어가는지 알려줘야 해서 버튼 자체를 막지는 않는다.
   */
  const canProceed = (): boolean => {
    if (step === 1) {
      return (
        !!obInfo.name.trim() &&
        !!obInfo.gender &&
        !!obInfo.age.trim() &&
        !!obInfo.height.trim() &&
        !!obInfo.weight.trim() &&
        !checkRange(obInfo)
      );
    }
    if (step === 2) return !!obPick.activity;
    if (step === 3) return !!obPick.goal;
    if (step === 7) return !!obPick.persona;
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }
    completeOnboarding();
  };

  const ctaLabel = step === 0 ? '시작하기' : step === TOTAL_STEPS - 1 ? '피또와 시작하기' : '다음';

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.root, { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 30 }]}>
          <OnboardingProgress
            progress={(step + 1) / TOTAL_STEPS}
            stepNumber={step >= 1 && step <= NUMBERED_STEPS ? step : undefined}
            stepTotal={NUMBERED_STEPS}
          />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            // 키보드가 올라온 채로 X·추가 버튼을 누르면 기본값(never)은 첫 탭을 키보드 닫기에 써버린다.
            keyboardShouldPersistTaps="handled"
            onLayout={(e) => setScrollH(e.nativeEvent.layout.height)}
          >
            {/*
              key로 단계마다 새로 마운트시킨다. onLayout은 높이가 "바뀔 때"만 불리는데
              5·6단계처럼 콘텐츠 높이가 우연히 같으면 측정이 갱신되지 않기 때문이다.
              (ref.measure()로도 되지만 그쪽은 rAF에 걸려 화면이 멈춘 동안 값이 늦게 온다.)
            */}
            <View key={step} onLayout={(e) => setMeasured({ step, height: e.nativeEvent.layout.height })}>
              {/*
                제목 줄 수와 설명 유무가 단계마다 달라도 본문은 늘 같은 높이에서 시작한다.
                남는 자리는 아래가 아니라 위에 두어(flex-end) 제목이 본문에서 떨어지지 않게 한다.
              */}
              <View style={styles.header}>
                <Text style={[styles.stepLabel, { color: colors.textPrimary }]}>{STEP_LABELS[step]}</Text>
                <Text style={[typography.onboardingTitle, styles.title, { color: colors.textPrimary }]}>{TITLES[step]}</Text>
                {!!DESCRIPTIONS[step] && (
                  <Text style={[styles.desc, { color: colors.textSecondary }]}>{DESCRIPTIONS[step]}</Text>
                )}
              </View>

              <View style={styles.body}>
                {step === 1 && <BasicInfoForm value={obInfo} onChange={setObInfo} />}

                {step === 2 &&
                  ACTIVITY_OPTIONS.map((o) => (
                    <OptionRow
                      key={o.code}
                      title={o.label}
                      desc={o.desc}
                      selected={obPick.activity === o.code}
                      onPress={() => setObPick({ activity: o.code })}
                    />
                  ))}

                {step === 3 &&
                  GOAL_OPTIONS.map((o) => (
                    <OptionRow
                      key={o.code}
                      title={o.label}
                      desc={o.desc}
                      selected={obPick.goal === o.code}
                      onPress={() => setObPick({ goal: o.code })}
                    />
                  ))}

                {step === 4 && (
                  <TagPicker
                    tags={DISEASE_TAGS}
                    value={obTags.health}
                    onToggle={(v) => toggleObTag('health', v)}
                    onToggleCustom={(v) => toggleObCustomTag('health', v)}
                    onClear={() => clearObTags('health')}
                    placeholder="기타 질환을 입력하세요"
                    noneLabel="해당사항 없음"
                  />
                )}

                {step === 5 && (
                  <TagPicker
                    tags={TASTE_TAGS}
                    value={obTags.taste}
                    onToggle={(v) => toggleObTag('taste', v)}
                    onToggleCustom={(v) => toggleObCustomTag('taste', v)}
                    onClear={() => clearObTags('taste')}
                    placeholder="다른 종류를 입력하세요"
                    noneLabel="가리는 것 없음"
                  />
                )}

                {step === 6 && (
                  <TagPicker
                    tags={AVOID_TAGS}
                    value={obTags.avoid}
                    onToggle={(v) => toggleObTag('avoid', v)}
                    onToggleCustom={(v) => toggleObCustomTag('avoid', v)}
                    onClear={() => clearObTags('avoid')}
                    placeholder="기타 음식을 입력하세요"
                    noneLabel="해당사항 없음"
                  />
                )}

                {step === 7 &&
                  PERSONA_OPTIONS.map((o) => (
                    <OptionRow
                      key={o.key}
                      title={o.label}
                      desc={o.desc}
                      selected={obPick.persona === o.key}
                      onPress={() => setObPick({ persona: o.key })}
                    />
                  ))}

                {step === 8 && <CompleteStep />}
              </View>
            </View>

            {/*
              인트로 캐릭터와 피또 한마디는 남은 높이(room)를 통째로 받아 그 안에서 중앙에 선다.
              측정 대상 밖에 그려야 자기 크기가 room 계산에 되먹임되지 않는다.
            */}
            {step === 0 && room > 0 && (
              <View style={[styles.centerFill, { height: room }]}>
                <FittoCharacter current={2} goal={5} size={172} glowSize={210} />
              </View>
            )}

            {showComment && (
              <View style={[styles.centerFill, { height: room }]}>
                <FittoCharacter current={3} goal={5} size={COMMENT_FACE_SIZE} variant="face" glowSize={68} />
                <Text style={[styles.commentText, { color: colors.textSecondary }]}>{comment}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.buttonRow}>
            {step > 0 && (
              <Pressable onPress={() => setStep(step - 1)} style={[styles.prevButton, { borderColor: colors.borderDivider }]}>
                <Text style={[styles.prevLabel, { color: colors.textPrimary }]}>이전</Text>
              </Pressable>
            )}
            <PrimaryButton label={ctaLabel} onPress={handleNext} inactive={!canProceed()} style={styles.nextButton} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scroll: {
    flex: 1,
    marginTop: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    minHeight: HEADER_MIN_H,
    justifyContent: 'flex-end',
  },
  // 진행 상황을 알려주는 유일한 텍스트라 sub 색으로는 너무 흐렸다. 자간과 굵기로 위계를 준다.
  stepLabel: typography.sectionLabel,
  title: {
    marginTop: 8,
  },
  desc: {
    ...typography.input,
    lineHeight: DESC_LINE_H,
    marginTop: 10,
  },
  body: {
    marginTop: 20,
  },
  commentText: {
    ...typography.bodySm,
    textAlign: 'center',
  },
  centerFill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: COMMENT_GAP,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  prevButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevLabel: typography.rowLabel,
  nextButton: {
    flex: 1,
  },
});
