import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import DetailHeader from '../detail/DetailHeader';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { changePassword } from '../../api/auth';
import { ApiError, NetworkError } from '../../api/client';
import { useWakeNotice } from '../../hooks/useWakeNotice';

type Field = 'current' | 'next' | 'confirm';

/** 가입과 같은 규칙(명세 4장). 변경으로 더 약한 비밀번호를 넣을 수 있으면 규칙이 있으나 마나다. */
function passwordError(value: string): string | null {
  if (value.length < 8) return '8자 이상으로 입력해 주세요';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return '영문과 숫자를 모두 포함해 주세요';
  return null;
}

/**
 * 비밀번호 변경(명세 5장).
 *
 * 바꾸면 다른 기기는 로그아웃된다. 누가 내 계정을 쓰는 것 같아서 바꾸는 경우가 많은데,
 * 남의 기기가 로그인된 채로 남으면 바꾼 의미가 없다. 이 기기는 새 토큰을 받아 그대로 쓴다.
 */
export default function PasswordChangeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const updateTokens = useAuthStore((s) => s.updateTokens);
  const showToast = useToastStore((s) => s.show);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  /**
   * 오류와 그 오류가 속한 칸. 칸에 속한 오류는 그 칸 아래에, 연결 실패처럼 칸과 무관한 오류는
   * 버튼 위 한 줄에 띄운다(UI 기준서 6-3).
   */
  const [error, setError] = useState<{ message: string; field: Field | null } | null>(null);
  const fieldError = (field: Field) => (error?.field === field ? error.message : null);
  const [busy, setBusy] = useState(false);
  const wakeNotice = useWakeNotice(busy);

  const submit = async () => {
    if (busy) return;

    // 입력하는 중에는 오류를 띄우지 않는다. 누를 때 한 번만 본다.
    if (!current) {
      setError({ message: '현재 비밀번호를 입력해 주세요', field: 'current' });
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
    if (next === current) {
      setError({ message: '지금 쓰는 비밀번호와 달라야 해요', field: 'next' });
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const token = useAuthStore.getState().accessToken;
      const tokens = await changePassword({ currentPassword: current, newPassword: next }, token ?? '');
      // 이 토큰을 저장하지 않으면 방금 바꾼 기기까지 로그아웃된다.
      updateTokens(tokens);
      showToast('비밀번호를 바꿨어요. 다른 기기는 로그아웃됐어요');
      navigation.goBack();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'INVALID_CREDENTIALS') {
        setError({ message: '현재 비밀번호가 맞지 않아요', field: 'current' });
      } else if (e instanceof ApiError || e instanceof NetworkError) {
        setError({ message: e.message, field: null });
      } else {
        setError({ message: '비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요', field: null });
      }
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
        <DetailHeader title="비밀번호 변경" />

        <GlassCard style={styles.card}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>현재 비밀번호</Text>
          <TextField
            value={current}
            onChangeText={(v) => {
              setCurrent(v);
              // 다시 입력을 시작하면 그 칸의 오류를 걷는다.
              if (error?.field === 'current') setError(null);
            }}
            placeholder="지금 쓰는 비밀번호"
            autoCapitalize="none"
            secureTextEntry
            maxLength={64}
            error={fieldError('current')}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>새 비밀번호</Text>
          <TextField
            value={next}
            onChangeText={(v) => {
              setNext(v);
              if (error?.field === 'next') setError(null);
            }}
            placeholder="영문과 숫자를 포함해 8자 이상"
            autoCapitalize="none"
            secureTextEntry
            maxLength={64}
            error={fieldError('next')}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>새 비밀번호 확인</Text>
          <TextField
            value={confirm}
            onChangeText={(v) => {
              setConfirm(v);
              if (error?.field === 'confirm') setError(null);
            }}
            placeholder="한 번 더 입력해 주세요"
            autoCapitalize="none"
            secureTextEntry
            maxLength={64}
            error={fieldError('confirm')}
          />

          {/* 칸에 속하지 않는 오류(연결 실패 등)만 여기에. */}
          {error && !error.field && <Text style={[styles.error, { color: colors.textDanger }]}>{error.message}</Text>}
          {wakeNotice && <Text style={[styles.desc, { color: colors.textSecondary }]}>{wakeNotice}</Text>}

          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            비밀번호를 바꾸면 다른 기기에서는 로그아웃돼요. 이 기기는 그대로 쓸 수 있어요.
          </Text>

          <View style={styles.buttonWrap}>
            <PrimaryButton
              label="비밀번호 바꾸기"
              onPress={submit}
              loading={busy}
              inactive={!current || !next || !confirm}
            />
          </View>
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
  label: {
    ...typography.label,
    marginTop: 4,
    marginBottom: 8,
  },
  error: {
    ...typography.caption,
    marginTop: 10,
  },
  desc: {
    ...typography.caption,
    marginTop: 10,
  },
  buttonWrap: {
    marginTop: 20,
  },
});
