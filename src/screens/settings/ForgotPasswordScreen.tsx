import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import CodeInput from '../../components/CodeInput';
import TextField from '../../components/TextField';
import TextLink from '../../components/TextLink';
import PrimaryButton from '../../components/PrimaryButton';
import DetailHeader from '../detail/DetailHeader';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useToastStore } from '../../store/useToastStore';
import { requestPasswordReset, resetPassword } from '../../api/auth';
import { ApiError, NetworkError } from '../../api/client';
import { useWakeNotice } from '../../hooks/useWakeNotice';
import { useCooldown } from '../../hooks/useCooldown';
import { passwordError } from '../../utils/password';

type Field = 'email' | 'code' | 'next' | 'confirm';

/** 서버가 코드 재발송을 1분에 한 번으로 막는다. 화면도 같은 시간만큼 버튼을 막는다. */
const RESEND_SECONDS = 60;

/**
 * 비밀번호 찾기(명세 4-5). 메일로 받은 6자리 코드로 새 비밀번호를 정한다.
 *
 * 1) 이메일 → 코드 받기  2) 코드 + 새 비밀번호 → 바꾸기
 *
 * 서버는 가입 여부를 알려주지 않는다(가입 안 된 이메일이어도 "보냈다"고 답한다).
 * 그래서 화면도 "가입된 이메일이면 곧 도착해요"라고만 말한다 — "보냈어요"라고 단정하면 거짓말이 된다.
 *
 * 바꾼 뒤에는 로그인 화면으로 보낸다. 서버는 재설정하면서 토큰도 주지만 여기서 바로 로그인하지 않는 이유는,
 * 이 기기에 게스트 기록이 있으면 "계정에 합칠지"를 물어야 하는데 그 질문이 로그인 화면에 있어서다.
 */
export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const showToast = useToastStore((s) => s.show);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState<string>(route.params?.email ?? '');
  const [code, setCode] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<{ message: string; field: Field | null } | null>(null);
  const fieldError = (field: Field) => (error?.field === field ? error.message : null);
  const [busy, setBusy] = useState(false);
  const wakeNotice = useWakeNotice(busy);
  const [cooldown, startCooldown] = useCooldown();

  const target = email.trim().toLowerCase();

  const sendCode = async () => {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(target)) {
      setError({ message: '이메일 주소를 확인해 주세요', field: 'email' });
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(target);
      setStep('code');
      startCooldown(RESEND_SECONDS);
    } catch (e) {
      setError({ message: messageOf(e, '코드를 보내지 못했어요. 잠시 후 다시 시도해 주세요'), field: null });
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (busy) return;

    // 입력하는 중에는 오류를 띄우지 않는다. 누를 때 한 번만 본다.
    if (!/^\d{6}$/.test(code)) {
      setError({ message: '메일로 받은 숫자 6자리를 입력해 주세요', field: 'code' });
      return;
    }
    const invalid = passwordError(next);
    if (invalid) {
      setError({ message: invalid, field: 'next' });
      return;
    }
    if (next !== confirm) {
      setError({ message: '새 비밀번호가 서로 달라요', field: 'confirm' });
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await resetPassword({ email: target, code, newPassword: next });
      showToast('비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요');
      // 로그인 화면이 이미 스택 아래에 있으면 그리로 돌아가며 이메일을 채워준다.
      navigation.navigate('Login', { email: target });
    } catch (e) {
      // 틀린 코드·만료된 코드·없는 계정을 서버가 구분하지 않는다. 코드 칸 아래 한 줄로 둔다.
      if (e instanceof ApiError && e.code === 'CODE_INVALID') {
        setError({ message: e.message, field: 'code' });
      } else {
        setError({ message: messageOf(e, '비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요'), field: null });
      }
    } finally {
      setBusy(false);
    }
  };

  /** 다시 입력을 시작하면 그 칸의 오류를 걷는다. */
  const onChange = (field: Field, setter: (v: string) => void) => (v: string) => {
    setter(v);
    if (error?.field === field) setError(null);
  };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DetailHeader title="비밀번호 찾기" />

        {/* 입력 한두 개짜리 폼은 카드 없이 화면에 바로 둔다(시안 23~25). 카드를 씌우면 상자 속 상자가 된다. */}
        {step === 'email' ? (
          <>
            <Text style={[styles.lead, { color: colors.textSecondary }]}>
              가입한 이메일로 6자리 코드를 보내드려요. 코드를 입력하면 새 비밀번호를 정할 수 있어요.
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>이메일</Text>
            <TextField
              value={email}
              onChangeText={onChange('email', setEmail)}
              placeholder="fitto@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              maxLength={254}
              error={fieldError('email')}
            />

            {error && !error.field && <Text style={[styles.error, { color: colors.textDanger }]}>{error.message}</Text>}
            {wakeNotice && <Text style={[styles.hint, { color: colors.textSecondary }]}>{wakeNotice}</Text>}

            <View style={styles.buttonWrap}>
              <PrimaryButton label="코드 받기" onPress={sendCode} loading={busy} inactive={!email.trim()} />
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.sentTo, { color: colors.textPrimary }]}>{target}</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>가입된 이메일이면 곧 코드가 도착해요.</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>코드 6자리</Text>
            <CodeInput value={code} onChange={onChange('code', setCode)} error={fieldError('code')} />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              10분 동안 쓸 수 있어요. 안 보이면 스팸함도 확인해 주세요.
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>새 비밀번호</Text>
            <TextField
              value={next}
              onChangeText={onChange('next', setNext)}
              placeholder="영문과 숫자를 포함해 8자 이상"
              autoCapitalize="none"
              secureTextEntry
              revealable
              maxLength={64}
              error={fieldError('next')}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>새 비밀번호 확인</Text>
            <TextField
              value={confirm}
              onChangeText={onChange('confirm', setConfirm)}
              placeholder="한 번 더 입력해 주세요"
              autoCapitalize="none"
              secureTextEntry
              revealable
              maxLength={64}
              error={fieldError('confirm')}
            />

            {error && !error.field && <Text style={[styles.error, { color: colors.textDanger }]}>{error.message}</Text>}
            {wakeNotice && <Text style={[styles.hint, { color: colors.textSecondary }]}>{wakeNotice}</Text>}

            <Text style={[styles.note, { color: colors.textSecondary }]}>비밀번호를 바꾸면 모든 기기에서 로그아웃돼요.</Text>

            <View style={styles.buttonWrap}>
              <PrimaryButton
                label="비밀번호 바꾸기"
                onPress={submit}
                loading={busy}
                inactive={code.length !== 6 || !next || !confirm}
              />
            </View>

            {/* 보조 동작은 회색 글씨(시안 24). 칠한 버튼은 위 하나만. */}
            <View style={styles.linkRow}>
              <TextLink tone="muted"
                label={cooldown > 0 ? `코드 다시 받기 (${cooldown}초)` : '코드 다시 받기'}
                onPress={sendCode}
                disabled={cooldown > 0 || busy}
              />
              <TextLink tone="muted"
                label="이메일 다시 입력"
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
              />
            </View>
          </>
        )}
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
  lead: {
    fontSize: 14,
    ...weight(400),
    lineHeight: 21,
    paddingHorizontal: 2,
  },
  sentTo: {
    fontSize: 15,
    ...weight(700),
    lineHeight: 15 * 1.5,
    paddingHorizontal: 2,
  },
  sub: {
    fontSize: 13,
    ...weight(400),
    lineHeight: 13 * 1.5,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  label: {
    ...typography.label,
    marginTop: 14,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    marginTop: 6,
  },
  note: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    marginTop: 12,
  },
  error: {
    ...typography.caption,
    marginTop: 10,
  },
  buttonWrap: {
    marginTop: 20,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    minHeight: 44,
    alignItems: 'center',
  },
});
