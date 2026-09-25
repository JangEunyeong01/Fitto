import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import GlassCard from '../../components/GlassCard';
import ScreenBackground from '../../components/ScreenBackground';
import DetailHeader from '../detail/DetailHeader';
import SettingsRow, { RowDivider } from './SettingsRow';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import { useOutboxStore, type FailedItem } from '../../store/useOutboxStore';
import { useToastStore } from '../../store/useToastStore';
import { logout as requestLogout } from '../../api/auth';
import { describeOp } from '../../sync/types';

/** "3분 전"처럼 사람이 읽는 표현으로. 초 단위는 보여줘도 알 것이 없어 "방금"으로 묶는다. */
function formatSyncedAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

/**
 * 계정 화면.
 *
 * 설정 카드 한 장 안에 이메일·동기화 상태·실패 목록·비밀번호 변경·로그아웃·탈퇴가 전부 들어 있었다.
 * 성격이 다른 것들이 한 줄 간격으로 붙어 있어서, 로그아웃을 누르려다 탈퇴를 누를 자리였다.
 */
export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const authStatus = useAuthStore((s) => s.status);
  const authEmail = useAuthStore((s) => s.email);
  // null은 "아직 모름"이라 경고하지 않는다. 서버에서 false를 받은 경우에만 알린다.
  const emailUnverified = useAuthStore((s) => s.emailVerified) === false;
  const signOut = useAuthStore((s) => s.signOut);
  const showToast = useToastStore((s) => s.show);

  const pendingCount = useOutboxStore((s) => s.items.length);
  const lastSyncedAt = useOutboxStore((s) => s.lastSyncedAt);
  const failedItems = useOutboxStore((s) => s.failed);

  /**
   * 동기화 상태 한 줄. 못 올린 게 있으면 그 사실을 먼저 알린다 —
   * "언제 올라갔는지"보다 "아직 안 올라간 게 있는지"가 사용자에게 중요하다.
   */
  const syncLabel = pendingCount > 0
    ? `기록 ${pendingCount}건 올리는 중`
    : lastSyncedAt
      ? `${formatSyncedAgo(lastSyncedAt)} 동기화됨`
      : '아직 동기화한 기록이 없어요';

  const handleRetryFailed = () => {
    useOutboxStore.getState().retryFailed();
    showToast('다시 올려볼게요');
  };

  const handleClearFailed = () => {
    useOutboxStore.getState().clearFailed();
    showToast('목록을 비웠어요. 기록은 기기에 그대로 있어요');
  };

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
    navigation.goBack();
  };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="계정" />

        {/* 상태 설명은 카드 없이 머리글처럼 둔다(시안 18). 카드로 싸면 아래 동작 줄과 무게가 같아진다. */}
        {authStatus === 'member' ? (
          <>
            <View style={styles.intro}>
              <Text style={[styles.introTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {authEmail}
              </Text>
              <Text style={[styles.introSub, { color: colors.textSecondary }]}>{syncLabel}</Text>
            </View>

            <FailedRecords items={failedItems} colors={colors} onRetry={handleRetryFailed} onClear={handleClearFailed} />

            {/* 오타 난 주소로 가입했으면 비밀번호를 찾을 수 없다. 인증 전에는 계정 설정보다 먼저 보여준다. */}
            {emailUnverified && (
              <GlassCard style={styles.card} noPadding>
                <SettingsRow
                  label="이메일 인증이 필요해요"
                  desc="인증해 두면 비밀번호를 잊어도 이 주소로 찾을 수 있어요"
                  onPress={() => navigation.navigate('EmailVerify')}
                  right={<Text style={[styles.rowAction, { color: colors.textAccent }]}>인증하기</Text>}
                />
              </GlassCard>
            )}

            <GlassCard style={styles.card} noPadding>
              <SettingsRow label="비밀번호 변경" onPress={() => navigation.navigate('PasswordChange')} chevron />
              <RowDivider />
              <SettingsRow label="로그아웃" onPress={handleLogout} />
            </GlassCard>

            {/* 되돌릴 수 없는 동작이라 카드를 따로 뗀다. 확인은 탈퇴 화면에서 받는다. */}
            <GlassCard style={styles.card} noPadding>
              <SettingsRow
                label="회원 탈퇴"
                desc="계정과 서버에 올린 기록이 모두 지워져요"
                danger
                chevron
                onPress={() => navigation.navigate('DeleteAccount')}
              />
            </GlassCard>
          </>
        ) : (
          <>
            {/* 명세 3-2: 가입 유도는 여기와 온보딩 끝에서만. 기능을 막고 가입을 요구하지 않는다. */}
            <View style={styles.intro}>
              <Text style={[styles.introLead, { color: colors.textPrimary }]}>
                계정을 만들면 기록을 백업하고 다른 기기에서도 이어서 볼 수 있어요.
              </Text>
              <Text style={[styles.introSub, { color: colors.textSecondary }]}>
                지금 쓰는 기록은 그대로 두고 계정에 옮겨 담아요.
              </Text>
            </View>

            {/* 로그인이 풀린 뒤에도 못 올린 기록은 보여야 한다. 안 보이면 있는 줄도 모른다. */}
            <FailedRecords items={failedItems} colors={colors} onRetry={handleRetryFailed} onClear={handleClearFailed} />

            <GlassCard style={styles.card} noPadding>
              <SettingsRow label="계정 만들기" onPress={() => navigation.navigate('Signup')} chevron />
              <RowDivider />
              <SettingsRow label="로그인" onPress={() => navigation.navigate('Login')} chevron />
            </GlassCard>
          </>
        )}
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

  // 빨간 테두리 상자 대신 카드 한 장: 제목만 오류색, 버튼은 글씨로(시안 규칙: 상자 테두리 없음).
  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.failedTitle, { color: colors.textDanger }]}>올리지 못한 기록 {items.length}건</Text>
      {items.slice(0, 3).map((item) => (
        <Text key={item.id} style={[styles.failedRow, { color: colors.textSecondary }]} numberOfLines={1}>
          · {describeOp(item.op)} — {item.reason}
        </Text>
      ))}
      {items.length > 3 && <Text style={[styles.failedRow, { color: colors.textSecondary }]}>· 외 {items.length - 3}건</Text>}
      <View style={styles.failedButtons}>
        <Pressable onPress={onClear} accessibilityRole="button" style={styles.textBtn}>
          <Text style={[styles.rowAction, { color: colors.textSecondary }]}>목록 비우기</Text>
        </Pressable>
        <Pressable onPress={onRetry} accessibilityRole="button" style={styles.textBtn}>
          <Text style={[styles.rowAction, { color: colors.textAccent }]}>다시 시도</Text>
        </Pressable>
      </View>
    </GlassCard>
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
  intro: {
    paddingTop: 4,
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  introTitle: {
    fontSize: 17,
    ...weight(700),
  },
  introLead: {
    fontSize: 15,
    ...weight(600),
    lineHeight: 15 * 1.5,
  },
  introSub: {
    fontSize: 13,
    ...weight(400),
    lineHeight: 13 * 1.5,
    marginTop: 6,
  },
  failedTitle: {
    ...typography.cardTitle,
    marginBottom: 6,
  },
  failedRow: {
    ...typography.caption,
    marginTop: 2,
  },
  failedButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 4,
    marginBottom: -10,
  },
  textBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  rowAction: {
    fontSize: 14,
    ...weight(600),
  },
});
