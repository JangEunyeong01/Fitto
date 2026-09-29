import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarSpace } from '../../navigation/TabBar';
import { useRoute } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import TextField from '../../components/TextField';
import AlertModal from '../../components/AlertModal';
import DetailHeader from '../detail/DetailHeader';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useOutboxStore } from '../../store/useOutboxStore';
import { useFoodSearchStore } from '../../store/useFoodSearchStore';
import { useToastStore } from '../../store/useToastStore';
import { deleteAccount, DeletionReason } from '../../api/auth';
import { ApiError, NetworkError } from '../../api/client';
import { useWakeNotice } from '../../hooks/useWakeNotice';

/**
 * 회원 탈퇴 2·3단계(시안 41·42) — 비밀번호로 본인 확인, 알림창에서 마지막 확인.
 *
 * 토큰만으로 지우게 하면 잠금 안 된 폰을 잠깐 만진 사람이 계정을 없앨 수 있어서 비밀번호를 받는다.
 * 알림창의 칠한 버튼은 "취소"다. 되돌릴 수 없는 쪽을 권하지 않는다.
 *
 * 서버 기록을 지우면 이 기기 기록도 함께 지운다. 계정을 없앴는데 폰에 기록이 남아 있으면
 * 무엇이 지워진 건지 알 수 없고, 다음에 가입할 때 남은 기록이 새 계정으로 올라간다.
 */
export default function DeleteAccountConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { reason } = (useRoute().params ?? {}) as { reason?: DeletionReason };

  const authEmail = useAuthStore((s) => s.email);
  const signOut = useAuthStore((s) => s.signOut);
  const resetAll = useAppStore((s) => s.resetAll);
  const showToast = useToastStore((s) => s.show);

  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wakeNotice = useWakeNotice(busy);

  const openConfirm = () => {
    if (!password) {
      setError('비밀번호를 입력해 주세요');
      return;
    }
    setConfirming(true);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const token = useAuthStore.getState().accessToken;
      await deleteAccount(password, token ?? '', reason);

      // 서버가 지워진 뒤에 기기를 정리한다. 순서가 반대면 요청이 실패했을 때 기록만 사라진다.
      signOut();
      resetAll();
      useOutboxStore.getState().clear();
      useFoodSearchStore.setState({ recent: [] });
      showToast('계정을 삭제했어요');
    } catch (e) {
      // 비밀번호가 틀린 경우가 대부분이라 창을 닫고 칸 아래에 알린다.
      setConfirming(false);
      if (e instanceof ApiError || e instanceof NetworkError) {
        setError(e.message);
      } else {
        setError('계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DetailHeader title="회원 탈퇴" />

        <View style={styles.intro}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>본인 확인</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{authEmail} 계정의 비밀번호를 입력해 주세요.</Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>비밀번호</Text>
        <TextField
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (error) setError(null);
          }}
          autoCapitalize="none"
          secureTextEntry
          revealable
          maxLength={64}
          error={error ?? undefined}
        />
        {wakeNotice && <Text style={[styles.notice, { color: colors.textSecondary }]}>{wakeNotice}</Text>}

        {/* 칠한 버튼을 두지 않는다. 이 화면에서 권하는 동작은 없다(시안 41). */}
        <Pressable onPress={openConfirm} accessibilityRole="button" style={styles.deleteBtn}>
          <Text style={[styles.deleteLabel, { color: colors.textDanger }]}>탈퇴하기</Text>
        </Pressable>
      </ScrollView>

      <AlertModal
        visible={confirming}
        onClose={() => !busy && setConfirming(false)}
        title="정말 탈퇴할까요?"
        body="계정과 모든 기록이 지워지고 되돌릴 수 없어요."
        dangerLabel="탈퇴하기"
        onDanger={submit}
        dangerLoading={busy}
        primaryLabel="취소"
        // 요청이 이미 나갔으면 취소가 안 된다. 창만 닫히고 계정은 지워지면 취소한 줄 알게 된다.
        onPrimary={() => !busy && setConfirming(false)}
      />
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
  intro: {
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 17,
    ...weight(700),
    lineHeight: 17 * 1.5,
  },
  desc: {
    fontSize: 13,
    lineHeight: 13 * 1.5,
    marginTop: 6,
  },
  label: {
    ...typography.label,
    marginTop: 14,
    marginBottom: 6,
  },
  notice: {
    ...typography.caption,
    marginTop: 10,
  },
  deleteBtn: {
    minHeight: 44,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    fontSize: 15,
    ...weight(700),
  },
});
