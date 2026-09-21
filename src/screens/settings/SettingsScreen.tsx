import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import ToggleSwitch from '../../components/ToggleSwitch';
import Badge from '../../components/Badge';
import Icon from '../../components/Icon';
import SegmentedControl from '../../components/SegmentedControl';
import { useTheme } from '../../theme/useTheme';
import { useAppStore, ThemeMode } from '../../store/useAppStore';
import { useCardOrderSheetStore } from '../../store/useCardOrderSheetStore';
import { useBirthdayModalStore } from '../../store/useBirthdayModalStore';
import { useTutorialStore } from '../../store/useTutorialStore';
import { useToastStore } from '../../store/useToastStore';
import { useFoodSearchStore } from '../../store/useFoodSearchStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useOutboxStore, type FailedItem } from '../../store/useOutboxStore';
import { logout as requestLogout } from '../../api/auth';
import { describeOp } from '../../sync/types';
import { PERSONA_OPTIONS } from '../onboarding/onboardingData';
import { GOAL_OPTIONS, labelOf } from '../../constants/codes';
import { daysBetween, toDateKey } from '../../utils/periodCycle';
import { semantic, typography } from '../../theme/tokens';
// 버전은 app.json 한 곳에서만 올린다. 화면에 따로 적어두면 배포 때 둘 중 하나를 꼭 까먹는다.
import appConfig from '../../../app.json';

/** "3분 전"처럼 사람이 읽는 표현으로. 초 단위는 보여줘도 알 것이 없어 "방금"으로 묶는다. */
function formatSyncedAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

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
  const setPeriodOn = useAppStore((s) => s.setPeriodOn);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const resetAll = useAppStore((s) => s.resetAll);

  const authStatus = useAuthStore((s) => s.status);
  const authEmail = useAuthStore((s) => s.email);
  const signOut = useAuthStore((s) => s.signOut);

  const pendingCount = useOutboxStore((s) => s.items.length);
  const lastSyncedAt = useOutboxStore((s) => s.lastSyncedAt);
  const failedItems = useOutboxStore((s) => s.failed);

  const handleRetryFailed = () => {
    useOutboxStore.getState().retryFailed();
    showToast('다시 올려볼게요');
  };

  const handleClearFailed = () => {
    useOutboxStore.getState().clearFailed();
    showToast('목록을 비웠어요. 기록은 기기에 그대로 있어요');
  };

  /**
   * 동기화 상태 한 줄. 못 올린 게 있으면 그 사실을 먼저 알린다 —
   * "언제 올라갔는지"보다 "아직 안 올라간 게 있는지"가 사용자에게 중요하다.
   */
  const syncLabel = pendingCount > 0
    ? `기록 ${pendingCount}건 올리는 중`
    : lastSyncedAt
      ? `${formatSyncedAgo(lastSyncedAt)} 동기화됨`
      : '아직 동기화한 기록이 없어요';

  /**
   * 로그아웃. 서버에 refreshToken 폐기를 요청하되, 실패해도 기기에서는 지운다 —
   * 네트워크가 안 될 때 로그아웃이 막히면 기기를 빌려준 상황에서 빠져나올 수 없다.
   */
  const handleLogout = async () => {
    const token = useAuthStore.getState().refreshToken;
    if (token) {
      try {
        await requestLogout(token);
      } catch {
        // 서버에 못 알려도 기기에서는 지운다. 토큰은 만료되면 무효가 된다.
      }
    }
    signOut();
    // 아직 못 올린 작업은 버린다. 남겨두면 다음에 로그인한 계정으로 올라간다.
    useOutboxStore.getState().clear();
    showToast('로그아웃했어요');
  };

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
  const showBirthdayModal = useBirthdayModalStore((s) => s.show);
  const startTutorial = useTutorialStore((s) => s.start);
  const showToast = useToastStore((s) => s.show);

  // 명세 F-008: 시작일을 1일차로 센다. 시작일을 모르는 상태(초기화 직후)면 줄을 숨긴다.
  const togetherDays = startDate ? daysBetween(startDate, toDateKey(new Date())) + 1 : null;

  const personaDesc = PERSONA_OPTIONS.find((p) => p.key === persona)?.desc ?? '';
  const goalSummary = [labelOf(GOAL_OPTIONS, profile.goalType), `${goals.kcal.toLocaleString()}kcal`]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 108 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>설정</Text>

        <Pressable onPress={() => navigation.navigate('Profile')}>
          <GlassCard style={styles.card}>
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
          </GlassCard>
        </Pressable>

        {/* 명세 3-2: 가입 유도는 여기 한 곳에서만 한다. 기능을 막고 가입을 요구하지 않는다. */}
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>계정</Text>
          {authStatus === 'member' ? (
            <>
              <Text style={[styles.previewText, { color: colors.textSecondary }]}>{authEmail}</Text>
              <Text style={[styles.syncText, { color: colors.textSecondary }]}>{syncLabel}</Text>
              <FailedRecords
                items={failedItems}
                colors={colors}
                onRetry={handleRetryFailed}
                onClear={handleClearFailed}
              />

              <Divider colors={colors} />
              <NavRow label="비밀번호 변경" onPress={() => navigation.navigate('PasswordChange')} colors={colors} />
              <Divider colors={colors} />
              <NavRow label="로그아웃" actionLabel="실행" onPress={handleLogout} colors={colors} />
              <Divider colors={colors} />
              {/* 되돌릴 수 없는 동작이라 다른 줄과 색으로 구분한다. 확인은 탈퇴 화면에서 받는다. */}
              <Pressable onPress={() => navigation.navigate('DeleteAccount')} style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.textDanger }]}>회원 탈퇴</Text>
                <Icon name="chevronRight" size={16} color={colors.textDanger} />
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.previewText, { color: colors.textSecondary }]}>
                계정을 만들면 기록을 백업하고 다른 기기에서도 이어서 볼 수 있어요.
              </Text>
              {/* 로그인이 풀린 뒤에도 못 올린 기록은 보여야 한다. 안 보이면 있는 줄도 모른다. */}
              <FailedRecords
                items={failedItems}
                colors={colors}
                onRetry={handleRetryFailed}
                onClear={handleClearFailed}
              />
              <Divider colors={colors} />
              <NavRow label="계정 만들기" onPress={() => navigation.navigate('Signup')} colors={colors} />
              <Divider colors={colors} />
              <NavRow label="로그인" onPress={() => navigation.navigate('Login')} colors={colors} />
            </>
          )}
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
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>화면 모드</Text>
          <View style={styles.gap10}>
            <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} />
          </View>

          <View style={[styles.divider, { borderTopColor: colors.borderDivider }]} />

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
          <NavRow label="홈 카드 순서" actionLabel="변경" onPress={showCardOrderSheet} colors={colors} />
          <Divider colors={colors} />
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
          <NavRow
            label="온보딩 다시 보기"
            actionLabel="실행"
            onPress={resetOnboarding}
            colors={colors}
          />
        </GlassCard>

        <GlassCard style={styles.card}>
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

/**
 * 서버로 올리지 못한 기록. 기기에는 남아 있지만 폰을 바꾸면 사라지므로 숨기지 않는다.
 * 로그인 상태와 상관없이 보여준다 — 로그인이 풀린 뒤에 더 필요한 정보다.
 */
function FailedRecords({
  items,
  colors,
  onRetry,
  onClear,
}: {
  items: FailedItem[];
  colors: any;
  onRetry: () => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={[styles.failedBox, { borderColor: semantic.danger }]}>
      <Text style={[styles.failedTitle, { color: colors.textDanger }]}>올리지 못한 기록 {items.length}건</Text>
      {items.slice(0, 3).map((item) => (
        <Text key={item.id} style={[styles.failedRow, { color: colors.textSecondary }]} numberOfLines={1}>
          · {describeOp(item.op)} — {item.reason}
        </Text>
      ))}
      {items.length > 3 && <Text style={[styles.failedRow, { color: colors.textSecondary }]}>· 외 {items.length - 3}건</Text>}
      <View style={styles.failedButtons}>
        <PrimaryButton label="다시 시도" variant="secondary" size="md" style={styles.flex} onPress={onRetry} />
        <PrimaryButton label="목록 비우기" variant="text" size="md" style={styles.flex} onPress={onClear} />
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: any;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      <ToggleSwitch value={value} onChange={onChange} />
    </View>
  );
}

function NavRow({
  label,
  actionLabel,
  onPress,
  colors,
}: {
  label: string;
  actionLabel?: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
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
