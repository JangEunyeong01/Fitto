import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import ToggleSwitch from '../../components/ToggleSwitch';
import Icon from '../../components/Icon';
import SegmentedControl from '../../components/SegmentedControl';
import SettingsRow, { RowDivider, ROW_PAD } from './SettingsRow';
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
import { typography, weight } from '../../theme/tokens';
// 버전은 app.json 한 곳에서만 올린다. 화면에 따로 적어두면 배포 때 둘 중 하나를 꼭 까먹는다.
import appConfig from '../../../app.json';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
  { value: 'system', label: '시스템' },
];

const PAD = ROW_PAD;
const MENU_WIDTH = 196;
const MENU_ITEM = 44;
const MENU_HEIGHT = MENU_ITEM * THEME_OPTIONS.length + 12;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const win = useWindowDimensions();

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
  const emailUnverified = useAuthStore((s) => s.emailVerified) === false;

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

  /**
   * 화면 모드는 줄 하나 + 작은 메뉴(시안 06-1). 세 칸 세그먼트를 늘 펼쳐두기엔 자주 바꾸는 값이 아니다.
   * 메뉴는 누른 줄 바로 아래에 붙인다. 아래 자리가 모자라면 위로 띄운다.
   */
  const themeRowRef = useRef<View>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const openThemeMenu = () => {
    themeRowRef.current?.measureInWindow((x, y, w, h) => {
      const below = y + h - 6;
      const top = below + MENU_HEIGHT > win.height - insets.bottom - 8 ? y - MENU_HEIGHT + 6 : below;
      setMenuPos({ top, right: win.width - (x + w) + 12 });
    });
  };
  const pickTheme = (value: ThemeMode) => {
    setTheme(value);
    setMenuPos(null);
  };
  const themeLabel = THEME_OPTIONS.find((o) => o.value === theme)?.label ?? '';

  // 명세 F-008: 시작일을 1일차로 센다. 시작일을 모르는 상태(초기화 직후)면 줄을 숨긴다.
  const togetherDays = startDate ? daysBetween(startDate, toDateKey(new Date())) + 1 : null;

  const personaDesc = PERSONA_OPTIONS.find((p) => p.key === persona)?.desc ?? '';
  const goalSummary = [labelOf(GOAL_OPTIONS, profile.goalType), `${goals.kcal.toLocaleString()}kcal`]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 108 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>설정</Text>

        {/* 내 정보와 계정은 "나"에 대한 것이라 한 장에 둔다. 계정 속내용은 화면을 따로 팠다. */}
        <GlassCard style={styles.card} noPadding>
          <Pressable
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.profileRow, pressed && { backgroundColor: colors.fillMuted }]}
          >
            {/* 색 그라데이션 대신 회색 원에 이름 첫 글자(시안 06). 설정은 조용한 화면이다. */}
            <View style={[styles.avatar, { backgroundColor: colors.fillMuted }]}>
              <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                {profile.nickname.trim().charAt(0)}
              </Text>
            </View>
            <View style={styles.profileText}>
              <Text style={[styles.nickname, { color: colors.textPrimary }]} numberOfLines={1}>
                {profile.nickname}
              </Text>
              <Text style={[styles.goalSummary, { color: colors.textSecondary }]} numberOfLines={1}>
                {goalSummary || '목표를 설정해 주세요'}
              </Text>
              {/* 연도가 생기기 전에 가입한 사람에게 한 번 채워 달라고 알린다. 채우면 사라진다. */}
              {!profile.birthYear ? (
                <Text style={[styles.together, { color: colors.textAccent }]} numberOfLines={1}>
                  태어난 연도를 넣어 주세요
                </Text>
              ) : togetherDays != null && (
                <Text style={[styles.together, { color: colors.textSecondary }]} numberOfLines={1}>
                  피또와 함께한 지 {togetherDays.toLocaleString()}일째
                </Text>
              )}
            </View>
            <Icon name="chevronRight" size={16} color={colors.textSecondary} />
          </Pressable>

          <RowDivider />

          {/* 못 올린 기록이 있으면 들어가 보기 전에 알려준다. 계정 화면에 들어가야 아는 건 늦다. */}
          <SettingsRow
            label="계정"
            desc={
              authStatus === 'member'
                ? failedNotice ?? (emailUnverified ? `${authEmail} · 인증 필요` : authEmail)
                : '게스트로 쓰는 중 · 기록은 이 기기에만'
            }
            descTone={failedNotice ? 'danger' : 'normal'}
            onPress={() => navigation.navigate('Account')}
            chevron
           
          />
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>피또 성격</Text>
          <View style={styles.segmentWrap}>
            <SegmentedControl
              options={PERSONA_OPTIONS.map((p) => ({ value: p.key, label: p.label }))}
              value={persona}
              onChange={setPersona}
            />
          </View>
          <Text style={[styles.previewText, { color: colors.textSecondary }]}>{personaDesc}</Text>
        </GlassCard>

        {/* 글씨 크기 조절은 아직 없는 기능이라 줄을 숨겼다. 눌러도 반응 없는 줄은 고장처럼 보인다. */}
        <GlassCard style={styles.card} noPadding>
          <View ref={themeRowRef} collapsable={false}>
            <SettingsRow
              label="화면 모드"
              value={themeLabel}
              onPress={openThemeMenu}
              chevron
              a11yHint="누르면 라이트·다크·시스템 중에서 고를 수 있어요"
            />
          </View>
          <RowDivider />
          <SettingsRow label="홈 카드 순서" value="변경" onPress={showCardOrderSheet} chevron />
          <RowDivider />
          <SettingsRow label="생리 주기 기능" right={<ToggleSwitch value={periodOn} onChange={setPeriodOn} />} />
          {/* 명세 F-044: 생리 기능이 켜져 있을 때만 주기 설정을 보여준다. */}
          {periodOn && (
            <>
              <RowDivider />
              <SettingsRow label="생리 주기 설정" onPress={() => navigation.navigate('PeriodSettings')} chevron />
            </>
          )}
          <RowDivider />
          <SettingsRow label="알림" onPress={() => navigation.navigate('Notifications')} chevron />
          <RowDivider />
          {SCREEN_LOCK_SUPPORTED ? (
            <SettingsRow
              label="화면 잠금"
              desc="앱을 열 때 지문·얼굴·폰 비밀번호로 확인해요"
              right={<ToggleSwitch value={screenLock} onChange={toggleScreenLock} />}
            />
          ) : (
            // 웹 미리보기에는 생체 인증이 없다. 기능이 있다는 건 보여주고 토글만 막는다.
            <SettingsRow label="화면 잠금" desc="휴대폰 앱에서 켤 수 있어요" value="앱 전용" />
          )}
        </GlassCard>

        {/* 매일 쓰는 게 아니라 "다시 보고 싶을 때" 찾는 것들. 아래로 모은다. */}
        <GlassCard style={styles.card} noPadding>
          <SettingsRow
            label="튜토리얼 다시 보기"
            value="실행"
            onPress={() => {
              // 튜토리얼은 홈 카드를 가리키므로 홈으로 보낸 뒤 띄운다.
              navigation.navigate('Home');
              startTutorial();
            }}
            chevron
           
          />
          <RowDivider />
          <SettingsRow label="온보딩 다시 보기" value="실행" onPress={resetOnboarding} chevron />
          <RowDivider />
          <SettingsRow
            label="생일 축하 메시지"
            desc="생일 당일 홈에서 피또가 깜짝 축하해요"
            right={
              // 박스 버튼 대신 강조색 글씨 버튼(시안 규칙 2). 줄 높이를 채워 누르는 영역 44를 넘긴다.
              <Pressable
                onPress={showBirthdayModal}
                accessibilityRole="button"
                style={({ pressed }) => [styles.textBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.textBtnLabel, { color: colors.textAccent }]}>미리보기</Text>
              </Pressable>
            }
          />
        </GlassCard>

        <GlassCard style={styles.card} noPadding>
          <SettingsRow label="앱 버전" value={appConfig.expo.version} />
          <RowDivider />
          {resetStep === 0 ? (
            <SettingsRow label="데이터 초기화" danger onPress={() => setResetStep(1)} />
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

      <Modal visible={menuPos != null} transparent animationType="fade" onRequestClose={() => setMenuPos(null)}>
        {/* 바깥을 누르면 닫힌다. 흐림 없이 아주 옅게만 깔아 메뉴가 떠 있다는 것만 알린다. */}
        <Pressable
          style={styles.scrim}
          onPress={() => setMenuPos(null)}
          accessibilityRole="button"
          accessibilityLabel="메뉴 닫기"
        />
        {menuPos && (
          <View
            accessibilityRole="menu"
            style={[
              styles.menu,
              { top: menuPos.top, right: menuPos.right, backgroundColor: colors.surfaceSolid, borderColor: colors.borderDivider },
            ]}
          >
            {THEME_OPTIONS.map((o) => {
              const selected = o.value === theme;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => pickTheme(o.value)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.fillMuted }]}
                >
                  <Text style={[styles.menuLabel, { color: colors.textPrimary }, selected && styles.menuLabelOn]}>
                    {o.label}
                  </Text>
                  {selected && <Icon name="check" size={16} color={colors.textPrimary} strokeWidth={2.2} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </Modal>
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
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: PAD,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    ...weight(700),
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  nickname: {
    fontSize: 18,
    ...weight(700),
    lineHeight: 18 * 1.35,
  },
  goalSummary: typography.bodySm,
  together: typography.caption,
  cardTitle: typography.cardTitle,
  segmentWrap: {
    marginTop: 12,
  },
  previewText: {
    ...typography.bodySm,
    marginTop: 10,
  },
  flex: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    ...weight(600),
  },
  rowDesc: typography.caption,
  textBtn: {
    minHeight: 44,
    paddingHorizontal: 4,
    marginRight: -4,
    justifyContent: 'center',
  },
  textBtnLabel: {
    fontSize: 14,
    ...weight(600),
  },
  resetBox: {
    gap: 6,
    padding: PAD,
  },
  resetBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16,26,36,0.06)',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#2C3E50',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  menuItem: {
    height: MENU_ITEM,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuLabel: {
    fontSize: 15,
    ...weight(500),
  },
  menuLabelOn: weight(700),
});
