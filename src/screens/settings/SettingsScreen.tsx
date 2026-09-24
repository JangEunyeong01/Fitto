import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenBackground, { TITLE_GRADIENT_HEIGHT } from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import ToggleSwitch from '../../components/ToggleSwitch';
import Badge from '../../components/Badge';
import Icon from '../../components/Icon';
import SegmentedControl from '../../components/SegmentedControl';
import { useTheme } from '../../theme/useTheme';
import { useAppStore, ThemeMode } from '../../store/useAppStore';
import { useCardOrderSheetStore } from '../../store/useCardOrderSheetStore';
import { useBirthdayModalStore } from '../../store/useBirthdayModalStore';
import { useOutboxStore } from '../../store/useOutboxStore';
import { useToastStore } from '../../store/useToastStore';
import { SCREEN_LOCK_SUPPORTED, confirmOwner } from '../../utils/deviceAuth';
import { useTutorialStore } from '../../store/useTutorialStore';
import { useFoodSearchStore } from '../../store/useFoodSearchStore';
import { useAuthStore } from '../../store/useAuthStore';
import { PERSONA_OPTIONS } from '../onboarding/onboardingData';
import { GOAL_OPTIONS, labelOf } from '../../constants/codes';
import { daysBetween, toDateKey } from '../../utils/periodCycle';
import { typography } from '../../theme/tokens';
// 버전은 app.json 한 곳에서만 올린다. 화면에 따로 적어두면 배포 때 둘 중 하나를 꼭 까먹는다.
import appConfig from '../../../app.json';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
  { value: 'system', label: '시스템' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, mode, accentGradient } = useTheme();

  const profile = useAppStore((s) => s.profile);
  const goals = useAppStore((s) => s.goals);
  const startDate = useAppStore((s) => s.startDate);
  const persona = useAppStore((s) => s.persona);
  const setPersona = useAppStore((s) => s.setPersona);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const periodOn = useAppStore((s) => s.periodOn);
  const screenLock = useAppStore((s) => s.screenLock);
  const setScreenLock = useAppStore((s) => s.setScreenLock);
  const setPeriodOn = useAppStore((s) => s.setPeriodOn);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const resetAll = useAppStore((s) => s.resetAll);

  const authStatus = useAuthStore((s) => s.status);
  const authEmail = useAuthStore((s) => s.email);

  // 계정 줄에 띄울 경고. 실패한 기록은 폰을 바꾸면 사라져서, 계정 화면에 들어가야 아는 건 늦다.
  const failedCount = useOutboxStore((s) => s.failed.length);
  const failedNotice = failedCount > 0 ? `올리지 못한 기록 ${failedCount}건` : null;

  // 명세 F-043 데이터 초기화 2단계 확인. 0: 닫힘, 1: 첫 확인, 2: 마지막 확인.
  // 네이티브 Alert는 웹에서 버튼을 못 달아서 카드 안에서 단계를 넘긴다.
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const confirmReset = () => {
    if (resetStep === 1) {
      setResetStep(2);
      return;
    }
    resetAll();
    // 최근 검색은 세션 스토어라 앱 스토어 초기화에 안 딸려온다.
    useFoodSearchStore.setState({ recent: [] });
    // 기록을 지웠으니 올릴 것도 없다. 큐를 두면 지운 기록을 서버로 보낸다.
    useOutboxStore.getState().clear();
  };

  const showCardOrderSheet = useCardOrderSheetStore((s) => s.show);
  const showToast = useToastStore((s) => s.show);

  /**
   * 켤 때도 끌 때도 본인 확인을 받는다. 켤 때 확인하는 건 폰에 잠금이 정말 걸려 있는지 보려는 것,
   * 끌 때 확인하는 건 폰을 잠깐 빌린 사람이 잠금을 꺼두고 돌려주는 걸 막으려는 것이다.
   */
  const toggleScreenLock = async (next: boolean) => {
    const result = await confirmOwner(next ? '화면 잠금 켜기' : '화면 잠금 끄기');
    if (result === 'no-device-lock') {
      showToast('폰에 잠금(비밀번호·지문)을 먼저 설정해 주세요');
      return;
    }
    if (result === 'failed') return;
    setScreenLock(next);
    showToast(next ? '화면 잠금을 켰어요' : '화면 잠금을 껐어요');
  };
  const showBirthdayModal = useBirthdayModalStore((s) => s.show);
  const startTutorial = useTutorialStore((s) => s.start);

  // 명세 F-008: 시작일을 1일차로 센다. 시작일을 모르는 상태(초기화 직후)면 줄을 숨긴다.
  const togetherDays = startDate ? daysBetween(startDate, toDateKey(new Date())) + 1 : null;

  const personaDesc = PERSONA_OPTIONS.find((p) => p.key === persona)?.desc ?? '';
  const goalSummary = [labelOf(GOAL_OPTIONS, profile.goalType), `${goals.kcal.toLocaleString()}kcal`]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScreenBackground gradientHeight={TITLE_GRADIENT_HEIGHT}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 108 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>설정</Text>

        {/* 내 정보와 계정은 "나"에 대한 것이라 한 장에 둔다. 계정 속내용은 화면을 따로 팠다. */}
        <GlassCard style={styles.card}>
          <Pressable onPress={() => navigation.navigate('Profile')} accessibilityRole="button">
            <View style={styles.profileRow}>
              <LinearGradient colors={accentGradient} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <View style={styles.profileText}>
                <Text style={[styles.nickname, { color: colors.textPrimary }]}>{profile.nickname}</Text>
                <Text style={[styles.goalSummary, { color: colors.textSecondary }]} numberOfLines={1}>
                  {goalSummary || '목표를 설정해 주세요'}
                </Text>
                {togetherDays != null && (
                  <Text style={[styles.together, { color: colors.textSecondary }]} numberOfLines={1}>
                    피또와 함께한 지 {togetherDays.toLocaleString()}일째
                  </Text>
                )}
              </View>
              <Icon name="chevronRight" size={16} color={colors.textSecondary} />
            </View>
          </Pressable>

          <Divider colors={colors} />

          {/* 못 올린 기록이 있으면 들어가 보기 전에 알려준다. 계정 화면에 들어가야 아는 건 늦다. */}
          <NavRow
            label="계정"
            desc={authStatus === 'member' ? failedNotice ?? authEmail : '게스트로 쓰는 중 · 기록은 이 기기에만'}
            descTone={failedNotice ? 'danger' : 'normal'}
            onPress={() => navigation.navigate('Account')}
            colors={colors}
          />
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>피또 성격</Text>
          <View style={styles.gap10}>
            <SegmentedControl
              options={PERSONA_OPTIONS.map((p) => ({ value: p.key, label: p.label }))}
              value={persona}
              onChange={setPersona}
            />
          </View>
          <Text style={[styles.previewText, { color: colors.textSecondary }]}>{personaDesc}</Text>

          <Divider colors={colors} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>화면 모드</Text>
          <View style={styles.gap10}>
            <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} />
          </View>

          <Divider colors={colors} />
          <NavRow label="홈 카드 순서" actionLabel="변경" onPress={showCardOrderSheet} colors={colors} />

          <Divider colors={colors} />
          {/* README: 글씨 크기 조절은 V2 예정 기능이라 지금은 눌러도 반응하지 않는 자리만 잡아둔다. */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>글씨 크기 조절</Text>
            <Badge label="준비 중" />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <ToggleRow label="생리 주기 기능" value={periodOn} onChange={setPeriodOn} colors={colors} />
          {/* 명세 F-044: 생리 기능이 켜져 있을 때만 주기 설정을 보여준다. */}
          {periodOn && (
            <>
              <Divider colors={colors} />
              <NavRow label="생리 주기 설정" onPress={() => navigation.navigate('PeriodSettings')} colors={colors} />
            </>
          )}
          <Divider colors={colors} />
          <NavRow label="알림" onPress={() => navigation.navigate('Notifications')} colors={colors} />
          <Divider colors={colors} />
          {SCREEN_LOCK_SUPPORTED ? (
            <ToggleRow
              label="화면 잠금"
              desc="앱을 열 때 지문·얼굴·폰 비밀번호로 확인해요"
              value={screenLock}
              onChange={toggleScreenLock}
              colors={colors}
            />
          ) : (
            // 웹 미리보기에는 생체 인증이 없다. 기능이 있다는 건 보여주고 토글만 막는다.
            <View style={styles.row}>
              <View style={styles.rowTextCol}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>화면 잠금</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>휴대폰 앱에서 켤 수 있어요</Text>
              </View>
              <Badge label="앱 전용" />
            </View>
          )}
        </GlassCard>

        {/* 매일 쓰는 게 아니라 "다시 보고 싶을 때" 찾는 것들. 아래로 모은다. */}
        <GlassCard style={styles.card}>
          <NavRow
            label="튜토리얼 다시 보기"
            actionLabel="실행"
            onPress={() => {
              // 튜토리얼은 홈 카드를 가리키므로 홈으로 보낸 뒤 띄운다.
              navigation.navigate('Home');
              startTutorial();
            }}
            colors={colors}
          />
          <Divider colors={colors} />
          <NavRow label="온보딩 다시 보기" actionLabel="실행" onPress={resetOnboarding} colors={colors} />
          <Divider colors={colors} />
          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <View style={styles.rowTitleLine}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>생일 축하 메시지</Text>
                <Badge label="준비 중" />
              </View>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>생일 당일 홈에서 피또가 깜짝 축하해요</Text>
            </View>
            <PrimaryButton label="미리보기" variant="secondary" size="sm" onPress={showBirthdayModal} />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>앱 버전</Text>
            <Text style={[styles.rowAction, { color: colors.textSecondary }]}>{appConfig.expo.version}</Text>
          </View>
          <Divider colors={colors} />
          {resetStep === 0 ? (
            <Pressable onPress={() => setResetStep(1)} style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textDanger }]}>데이터 초기화</Text>
            </Pressable>
          ) : (
            <View style={styles.resetBox}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {resetStep === 1 ? '모든 기록을 지울까요?' : '정말 초기화할까요?'}
              </Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                {resetStep === 1
                  ? '식단·운동·체중 기록과 프로필, 설정이 모두 지워지고 온보딩부터 다시 시작해요.'
                  : '지운 데이터는 되돌릴 수 없어요.'}
              </Text>
              <View style={styles.resetBtns}>
                <PrimaryButton
                  label="취소"
                  variant="secondary"
                  size="md"
                  style={styles.flex}
                  onPress={() => setResetStep(0)}
                />
                {/* 빨간 버튼은 마지막 확인에만. 첫 단계는 보조 버튼으로 한 번 더 묻는다. */}
                <PrimaryButton
                  label={resetStep === 1 ? '초기화' : '모두 지우기'}
                  variant={resetStep === 1 ? 'secondary' : 'danger'}
                  size="md"
                  style={styles.flex}
                  onPress={confirmReset}
                />
              </View>
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
  colors,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: any;
}) {
  return (
    <View style={styles.row}>
      {desc ? (
        <View style={styles.rowTextCol}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{desc}</Text>
        </View>
      ) : (
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      )}
      <ToggleSwitch value={value} onChange={onChange} />
    </View>
  );
}

function NavRow({
  label,
  desc,
  descTone = 'normal',
  actionLabel,
  onPress,
  colors,
}: {
  label: string;
  /** 줄 아래 한 줄 더. 들어가 보기 전에 알아야 하는 값만 적는다. */
  desc?: string | null;
  descTone?: 'normal' | 'danger';
  actionLabel?: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.row}>
      {desc ? (
        <View style={styles.rowTextCol}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
          <Text
            style={[styles.rowDesc, { color: descTone === 'danger' ? colors.textDanger : colors.textSecondary }]}
            numberOfLines={1}
          >
            {desc}
          </Text>
        </View>
      ) : (
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      )}
      {actionLabel ? (
        <Text style={[styles.rowAction, { color: colors.textSecondary }]}>{actionLabel}</Text>
      ) : (
        <Icon name="chevronRight" size={16} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={[styles.divider, { borderTopColor: colors.borderDivider }]} />;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  title: {
    ...typography.screenTitle,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  nickname: typography.itemTitle,
  goalSummary: typography.bodySm,
  together: typography.caption,
  cardTitle: typography.sectionTitle,
  gap10: {
    marginTop: 10,
  },
  previewText: {
    ...typography.bodySm,
    marginTop: 10,
  },
  syncText: {
    ...typography.caption,
    marginTop: 4,
  },
  failedBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  failedTitle: typography.label,
  failedRow: typography.caption,
  failedButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  flex: {
    flex: 1,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLabel: typography.rowLabel,
  rowAction: typography.unit,
  rowTextCol: {
    flex: 1,
    gap: 4,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  rowDesc: typography.caption,
  resetBox: {
    gap: 6,
  },
  resetBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
});
