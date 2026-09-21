import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import DetailHeader from '../detail/DetailHeader';
import { useTheme } from '../../theme/useTheme';
import { alpha, semantic, typography } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useOutboxStore } from '../../store/useOutboxStore';
import { useFoodSearchStore } from '../../store/useFoodSearchStore';
import { useToastStore } from '../../store/useToastStore';
import { deleteAccount } from '../../api/auth';
import { ApiError, NetworkError } from '../../api/client';
import { useWakeNotice } from '../../hooks/useWakeNotice';

/** 무엇이 지워지는지 먼저 보여준다. "정말요?"만 두 번 묻는 건 확인이 아니다. */
const ERASED = [
  '식단·운동·물·걸음·체중 기록',
  '생리 주기 설정과 기록',
  '레시피와 운동 루틴',
  '프로필과 목표 설정',
];

/**
 * 회원 탈퇴(명세 5장). 되돌릴 수 없다.
 *
 * 두 단계로 나눈다. 비밀번호를 받는 단계와, 지운다고 한 번 더 누르는 단계다.
 * 토큰만으로 지우게 하면 잠금 안 된 폰을 잠깐 만진 사람이 계정을 없앨 수 있다.
 *
 * 서버 기록을 지우면 이 기기 기록도 함께 지운다. 계정을 없앴는데 폰에 기록이 남아 있으면
 * 무엇이 지워진 건지 알 수 없고, 다음에 가입할 때 남은 기록이 새 계정으로 올라간다.
 */
export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const authEmail = useAuthStore((s) => s.email);
  const signOut = useAuthStore((s) => s.signOut);
  const resetAll = useAppStore((s) => s.resetAll);
  const showToast = useToastStore((s) => s.show);

  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wakeNotice = useWakeNotice(busy);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const token = useAuthStore.getState().accessToken;
      await deleteAccount(password, token ?? '');

      // 서버가 지워진 뒤에 기기를 정리한다. 순서가 반대면 요청이 실패했을 때 기록만 사라진다.
      signOut();
      resetAll();
      useOutboxStore.getState().clear();
      useFoodSearchStore.setState({ recent: [] });
      showToast('계정을 삭제했어요');
    } catch (e) {
      if (e instanceof ApiError || e instanceof NetworkError) {
        setError(e.message);
      } else {
        setError('계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요');
      }
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="회원 탈퇴" />

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>지워지는 것</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{authEmail} 계정과 아래 기록이 모두 지워져요.</Text>
          <View style={styles.list}>
            {ERASED.map((item) => (
              <Text key={item} style={[styles.listItem, { color: colors.textPrimary }]}>
                · {item}
              </Text>
            ))}
          </View>
          <Text style={[styles.warn, { color: colors.textDanger }]}>
            지운 기록은 되돌릴 수 없어요. 이 기기에 있는 기록도 함께 지워지고 온보딩부터 다시 시작해요.
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>비밀번호</Text>
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="본인 확인을 위해 입력해 주세요"
            autoCapitalize="none"
            secureTextEntry
            maxLength={64}
          />

          {error && <Text style={[styles.error, { color: colors.textDanger }]}>{error}</Text>}
          {wakeNotice && <Text style={[styles.error, { color: colors.textSecondary }]}>{wakeNotice}</Text>}

          {!confirming ? (
            <Pressable
              onPress={() => setConfirming(true)}
              disabled={!password}
              style={[
                styles.dangerBtn,
                { borderColor: semantic.danger, backgroundColor: alpha(semantic.danger, 0.12) },
                !password && styles.disabled,
              ]}
            >
              <Text style={[styles.dangerLabel, { color: colors.textDanger }]}>탈퇴하기</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmBox}>
              <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>정말 탈퇴할까요?</Text>
              <View style={styles.confirmButtons}>
                <Pressable
                  onPress={() => setConfirming(false)}
                  style={[styles.dangerBtn, styles.flex, { borderColor: colors.borderDivider }]}
                >
                  <Text style={[styles.dangerLabel, { color: colors.textPrimary }]}>취소</Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  style={[
                    styles.dangerBtn,
                    styles.flex,
                    { borderColor: semantic.danger, backgroundColor: alpha(semantic.danger, 0.12) },
                    busy && styles.disabled,
                  ]}
                >
                  <Text style={[styles.dangerLabel, { color: colors.textDanger }]}>
                    {busy ? '지우는 중' : '계정 삭제'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </GlassCard>
      </ScrollView>
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
  card: {
    marginBottom: 12,
  },
  cardTitle: typography.sectionTitle,
  desc: {
    ...typography.bodySm,
    marginTop: 8,
  },
  list: {
    marginTop: 10,
    gap: 4,
  },
  listItem: typography.bodySm,
  warn: {
    ...typography.caption,
    marginTop: 12,
  },
  label: {
    ...typography.label,
    marginBottom: 8,
  },
  error: {
    ...typography.caption,
    marginTop: 10,
  },
  dangerBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLabel: typography.buttonLabelSm,
  disabled: {
    opacity: 0.5,
  },
  confirmBox: {
    marginTop: 4,
  },
  confirmTitle: {
    ...typography.sectionTitle,
    marginTop: 14,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
