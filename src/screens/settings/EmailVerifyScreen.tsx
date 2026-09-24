import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import TextLink from '../../components/TextLink';
import PrimaryButton from '../../components/PrimaryButton';
import DetailHeader from '../detail/DetailHeader';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { confirmEmailVerification, sendEmailVerification } from '../../api/auth';
import { ApiError, NetworkError } from '../../api/client';
import { useWakeNotice } from '../../hooks/useWakeNotice';
import { useCooldown } from '../../hooks/useCooldown';

const RESEND_SECONDS = 60;

/**
 * 이메일 인증(명세 5-4).
 *
 * 인증을 받는 이유는 하나다 — **오타 난 주소로 가입하면 비밀번호를 찾을 방법이 없다.**
 * 가입을 막지는 않고, 계정 화면에서 "인증 안 됨"을 보여주고 여기로 보낸다.
 *
 * 화면을 열자마자 코드를 보내지 않는다. 열어만 보고 나가도 메일이 쌓이고, 10분 뒤 만료된 코드가 남는다.
 */
export default function EmailVerifyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const email = useAuthStore((s) => s.email);
  const setEmailVerified = useAuthStore((s) => s.setEmailVerified);
  const showToast = useToastStore((s) => s.show);

  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<{ message: string; onCode: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const wakeNotice = useWakeNotice(busy);
  const [cooldown, startCooldown] = useCooldown();

  const token = () => useAuthStore.getState().accessToken ?? '';

  const send = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await sendEmailVerification(token());
      setSent(true);
      startCooldown(RESEND_SECONDS);
    } catch (e) {
      setError({ message: messageOf(e, '코드를 보내지 못했어요. 잠시 후 다시 시도해 주세요'), onCode: false });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (busy) return;
    if (!/^\d{6}$/.test(code)) {
      setError({ message: '메일로 받은 숫자 6자리를 입력해 주세요', onCode: true });
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const user = await confirmEmailVerification(code, token());
      setEmailVerified(user.emailVerified);
      showToast('이메일 인증을 마쳤어요');
      navigation.goBack();
    } catch (e) {
      const onCode = e instanceof ApiError && e.code === 'CODE_INVALID';
      setError({ message: messageOf(e, '인증하지 못했어요. 잠시 후 다시 시도해 주세요'), onCode });
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
        keyboardShouldPersistTaps="handled"
      >
        <DetailHeader title="이메일 인증" />

        <GlassCard style={styles.card}>
          <Text style={[styles.email, { color: colors.textPrimary }]}>{email}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            이 주소로 비밀번호를 찾을 수 있는지 확인해요. 주소가 틀렸다면 인증 메일이 도착하지 않아요.
          </Text>

          {!sent ? (
            <>
              {error && <Text style={[styles.error, { color: colors.textDanger }]}>{error.message}</Text>}
              {wakeNotice && <Text style={[styles.desc, { color: colors.textSecondary }]}>{wakeNotice}</Text>}
              <View style={styles.buttonWrap}>
                <PrimaryButton label="인증 코드 받기" onPress={send} loading={busy} />
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>코드 6자리</Text>
              <TextField
                value={code}
                onChangeText={(v) => {
                  setCode(v.replace(/[^0-9]/g, ''));
                  if (error?.onCode) setError(null);
                }}
                placeholder="123456"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                error={error?.onCode ? error.message : null}
              />
              <Text style={[styles.desc, { color: colors.textSecondary }]}>
                10분 동안 쓸 수 있어요. 안 보이면 스팸함도 확인해 주세요.
              </Text>

              {error && !error.onCode && (
                <Text style={[styles.error, { color: colors.textDanger }]}>{error.message}</Text>
              )}
              {wakeNotice && <Text style={[styles.desc, { color: colors.textSecondary }]}>{wakeNotice}</Text>}

              <View style={styles.buttonWrap}>
                <PrimaryButton label="인증하기" onPress={confirm} loading={busy} inactive={code.length !== 6} />
              </View>

              <View style={styles.linkRow}>
                <TextLink
                  label={cooldown > 0 ? `코드 다시 받기 (${cooldown}초)` : '코드 다시 받기'}
                  onPress={send}
                  disabled={cooldown > 0 || busy}
                  chevron={false}
                />
              </View>
            </>
          )}
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

function messageOf(e: unknown, fallback: string): string {
  return e instanceof ApiError || e instanceof NetworkError ? e.message : fallback;
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
  email: typography.itemTitle,
  label: {
    ...typography.label,
    marginTop: 16,
    marginBottom: 8,
  },
  desc: {
    ...typography.caption,
    marginTop: 8,
  },
  error: {
    ...typography.caption,
    marginTop: 10,
  },
  buttonWrap: {
    marginTop: 20,
  },
  linkRow: {
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
});
