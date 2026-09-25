import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import TextLink from '../../components/TextLink';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import AuthSheetLayout from './AuthSheetLayout';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { login, importGuestData } from '../../api/auth';
import { toImportPayload, fromUser } from '../../api/mappers';
import { ApiError, NetworkError } from '../../api/client';
import { useWakeNotice } from '../../hooks/useWakeNotice';

/**
 * 로그인(명세 4장). 다른 기기에서 만든 계정으로 들어올 때 쓴다.
 *
 * 이 기기에 게스트 기록이 남아 있으면 합칠지 물어본다(명세 3장).
 * 묻지 않고 합치면 남의 계정에 내 기록이 섞이고, 묻지 않고 버리면 기록이 사라진다.
 */
export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const signIn = useAuthStore((s) => s.signIn);
  const setProfile = useAppStore((s) => s.setProfile);
  const setGoals = useAppStore((s) => s.setGoals);
  const setPersona = useAppStore((s) => s.setPersona);
  const showToast = useToastStore((s) => s.show);

  const route = useRoute<any>();
  const [email, setEmail] = useState<string>(route.params?.email ?? '');
  const [password, setPassword] = useState('');

  // 비밀번호 찾기에서 돌아오면 그 이메일을 채워준다. 이 화면은 이미 떠 있어서 처음 값만으로는 안 바뀐다.
  useEffect(() => {
    if (route.params?.email) {
      setEmail(route.params.email);
      setPassword('');
    }
  }, [route.params?.email]);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const wakeNotice = useWakeNotice(busy);

  /** 기기에 옮길 만한 기록이 있는지. 없으면 합치기를 묻지 않는다. */
  const hasGuestRecords = () => {
    const s = useAppStore.getState();
    return Object.keys(s.dailyRecords).length > 0 || Object.keys(s.weightLog).length > 0;
  };

  const handleLogin = async (mergeGuestData: boolean) => {
    if (busy) return;
    setBusy(true);

    try {
      const result = await login(email.trim(), password);
      signIn({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
      });

      // 서버 값이 최종값이다(명세 2장). 로그인하면 기기 프로필을 서버 값으로 맞춘다.
      const mapped = fromUser(result.user);
      setProfile(mapped.profile);
      setGoals(mapped.goals);
      setPersona(mapped.persona);

      if (mergeGuestData) {
        const s = useAppStore.getState();
        const payload = toImportPayload({
          dailyRecords: s.dailyRecords,
          weightLog: s.weightLog,
          periodSettings: s.periodSettings,
          periodSetupDone: s.periodSetupDone,
          recipes: s.recipes,
          routines: s.routines,
          customIngredients: s.customIngredients,
        });
        const imported = await importGuestData(payload, result.accessToken);
        const count = Object.values(imported.imported).reduce((a, v) => a + v, 0);
        showToast(count > 0 ? `기록 ${count}개를 합쳤어요` : '로그인했어요');
      } else {
        showToast('로그인했어요');
      }

      // 온보딩 직후에 들어온 경우에는 로그인과 동시에 화면 구성이 홈으로 바뀐다(RootNavigator).
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      // 이메일·비밀번호 중 무엇이 틀렸는지는 서버가 알려주지 않는다(가입 여부가 새지 않게).
      // 그래서 특정 칸이 아니라 비밀번호 칸 아래에 한 줄로 둔다. 토스트는 3초 뒤 사라져서 놓친다.
      if (e instanceof ApiError && e.code === 'INVALID_CREDENTIALS') {
        setLoginError(e.message);
      } else if (e instanceof ApiError || e instanceof NetworkError) {
        showToast(e.message);
      } else {
        showToast('로그인에 실패했어요. 잠시 후 다시 시도해 주세요');
      }
    } finally {
      setBusy(false);
    }
  };

  const [askMerge, setAskMerge] = useState(false);
  const submit = () => {
    if (hasGuestRecords()) {
      setAskMerge(true);
      return;
    }
    handleLogin(false);
  };

  return (
    <AuthSheetLayout
      heading="로그인"
      title={'다시 만나서\n반가워요'}
      subtitle="로그인하면 기록을 이어서 볼 수 있어요."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    >
      <Text style={[styles.label, styles.firstLabel, { color: colors.textSecondary }]}>이메일</Text>
      <TextField
        value={email}
        onChangeText={setEmail}
        placeholder="fitto@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        maxLength={254}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>비밀번호</Text>
      <TextField
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (loginError) setLoginError(null);
        }}
        autoCapitalize="none"
        secureTextEntry
        revealable
        maxLength={64}
        error={loginError}
      />

      {/* 비밀번호 칸 바로 아래 오른쪽. 로그인이 막혔을 때 눈이 가는 자리라 여기 둔다. */}
      <View style={styles.forgotRow}>
        <Pressable
          onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() || undefined })}
          accessibilityRole="link"
          style={styles.forgotBtn}
        >
          <Text style={[styles.forgotLabel, { color: colors.textSecondary }]}>비밀번호를 잊으셨나요?</Text>
        </Pressable>
      </View>

      <PrimaryButton label="로그인" onPress={submit} loading={busy} inactive={!email.trim() || !password} />

      {/* 무료 서버가 잠들어 있으면 1분 넘게 걸린다. 스피너만 돌면 고장으로 보인다. */}
      {wakeNotice && <Text style={[styles.wakeNotice, { color: colors.textSecondary }]}>{wakeNotice}</Text>}

      {/* 기기에 기록이 있을 때만 묻는다. 둘 중 하나를 고르기 전에는 로그인하지 않는다. */}
      {askMerge && (
        <View style={[styles.mergeBox, { borderTopColor: colors.borderDivider }]}>
          <Text style={[styles.mergeTitle, { color: colors.textPrimary }]}>이 기기의 기록을 어떻게 할까요?</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            계정에 이미 있는 날짜는 계정 기록을 그대로 두고, 없는 날짜만 채워요.
          </Text>
          <View style={styles.mergeButtons}>
            <PrimaryButton label="계정에 합치기" onPress={() => handleLogin(true)} loading={busy} />
            {/* 칠해진 버튼은 하나(시안 규칙 1). 합치지 않는 쪽은 글씨 버튼으로 둔다. */}
            <Pressable onPress={() => handleLogin(false)} accessibilityRole="button" style={styles.laterBtn}>
              <Text style={[styles.laterLabel, { color: colors.textSecondary }]}>합치지 않고 로그인</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.linkRow}>
        <Text style={[styles.link, { color: colors.textSecondary }]}>계정이 없으신가요?</Text>
        <TextLink label="계정 만들기" onPress={() => navigation.navigate('Signup')} />
      </View>

      {navigation.canGoBack() && (
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.laterBtn}>
          <Text style={[styles.laterLabel, { color: colors.textSecondary }]}>나중에 하기</Text>
        </Pressable>
      )}
    </AuthSheetLayout>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    marginTop: 14,
    marginBottom: 6,
  },
  firstLabel: {
    marginTop: 0,
  },
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
    marginBottom: 10,
  },
  forgotBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotLabel: typography.label,
  wakeNotice: {
    ...typography.caption,
    marginTop: 10,
    textAlign: 'center',
  },
  linkRow: {
    height: 44,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  link: typography.body,
  laterBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterLabel: {
    ...typography.body,
    ...weight(600),
  },
  mergeBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mergeTitle: typography.sectionTitle,
  desc: {
    ...typography.bodySm,
    marginTop: 6,
  },
  mergeButtons: {
    marginTop: 16,
    gap: 4,
  },
});
