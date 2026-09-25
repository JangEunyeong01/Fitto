import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import TextLink from '../../components/TextLink';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import AuthSheetLayout from './AuthSheetLayout';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { signup, importGuestData } from '../../api/auth';
import { toImportPayload } from '../../api/mappers';
import { ApiError, NetworkError } from '../../api/client';
import { useWakeNotice } from '../../hooks/useWakeNotice';

/**
 * 계정 만들기(명세 3장, 4장).
 *
 * 온보딩에서 이미 프로필을 받았으므로 여기서는 이메일과 비밀번호만 받는다.
 * 가입에 성공하면 기기에 쌓아둔 기록을 서버로 올린다.
 */
export default function SignupScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const profile = useAppStore((s) => s.profile);
  const persona = useAppStore((s) => s.persona);
  const startDate = useAppStore((s) => s.startDate);
  const signIn = useAuthStore((s) => s.signIn);
  const showToast = useToastStore((s) => s.show);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const wakeNotice = useWakeNotice(busy);
  /** 칸별 오류. 서버가 돌려준 errors[].field를 해당 칸 아래에 붙인다(명세 0-6). */
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  /** 누를 때 한 번 검사한다. 조건이 덜 찬 버튼(inactive)을 누르면 무엇이 빠졌는지 칸 아래에 알려준다. */
  const validate = (): boolean => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = '이메일을 입력해 주세요';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = '이메일 형식을 확인해 주세요';
    if (password.length < 8) next.password = '8자 이상으로 입력해 주세요';
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) next.password = '영문과 숫자를 모두 포함해 주세요';
    setFieldErrors(next);
    return !next.email && !next.password;
  };

  const handleSignup = async () => {
    if (busy) return;
    if (!validate()) return;
    setBusy(true);

    try {
      const result = await signup({
        email: email.trim(),
        password,
        profile: {
          name: profile.nickname,
          gender: profile.gender,
          age: profile.age,
          height: profile.height,
          weight: profile.weight,
          targetWeight: profile.targetWeight,
          activityLevel: profile.activity,
          goal: profile.goalType,
          diseases: profile.conditions,
          customDiseases: profile.customConditions,
          preferredFoods: profile.preferredFoods,
          customPreferredFoods: profile.customPreferredFoods,
          allergies: profile.allergies,
          customAllergies: profile.customAllergies,
          personality: persona,
        },
        // 게스트로 쓴 기간을 이어받는다(F-008). 안 보내면 서버가 가입 시각을 시작일로 잡아
        // "피또와 함께한 지 N일"이 1일로 되돌아간다.
        startedAt: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
      });

      signIn({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
      });

      // 가입과 기록 이전은 따로 실패할 수 있다. 이전이 실패해도 계정은 이미 만들어졌으므로
      // 로그인 상태는 유지하고, 다음 실행 때 다시 시도하면 된다(모든 기록에 ID가 있어 중복되지 않는다).
      try {
        // 스냅샷은 보내는 시점의 값을 그대로 쓴다. 화면이 구독할 필요가 없어 getState로 꺼낸다.
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
        showToast(count > 0 ? `기록 ${count}개를 계정에 옮겼어요` : '계정을 만들었어요');
      } catch {
        showToast('계정은 만들었지만 기록 옮기기는 실패했어요. 나중에 다시 시도할게요');
      }

      // 온보딩 직후에 들어온 경우에는 가입과 동시에 화면 구성이 홈으로 바뀐다(RootNavigator).
      // 그때는 돌아갈 화면이 없으므로 확인하고 부른다.
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      // 서버가 준 문장을 그대로 보여준다(명세 0-6). 칸에 속한 오류는 그 칸 아래로, 나머지는 토스트로.
      if (e instanceof ApiError && e.code === 'EMAIL_DUPLICATED') {
        setFieldErrors({ email: e.message });
      } else if (e instanceof ApiError && e.fields.length > 0) {
        const next: { email?: string; password?: string } = {};
        e.fields.forEach((f) => {
          if (f.field === 'email' || f.field === 'password') next[f.field] = f.reason;
        });
        setFieldErrors(next);
        if (!next.email && !next.password) showToast(e.message);
      } else if (e instanceof ApiError || e instanceof NetworkError) {
        showToast(e.message);
      } else {
        showToast('가입에 실패했어요. 잠시 후 다시 시도해 주세요');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthSheetLayout
      title={'피또랑\n계속 기록해요'}
      subtitle="지금까지 기록한 내용은 계정으로 함께 옮겨져요."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    >
      <Text style={[styles.label, styles.firstLabel, { color: colors.textSecondary }]}>이메일</Text>
      <TextField
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          // 다시 입력을 시작하면 오류를 걷는다. 치는 동안 빨간 칸이 계속 떠 있으면 압박이 된다.
          if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
        }}
        placeholder="fitto@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        maxLength={254}
        error={fieldErrors.email}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>비밀번호</Text>
      {/*
        비밀번호 조건은 한 번만 말한다(시안 규칙 18). 시안은 칸 안 안내 글씨였는데, 치기 시작하면 사라지고
        안내 글씨 색도 대비가 모자라서 칸 아래 도움말로 옮겼다.
      */}
      <TextField
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
        }}
        autoCapitalize="none"
        secureTextEntry
        revealable
        maxLength={64}
        error={fieldErrors.password}
        helper="영문과 숫자를 섞어 8자 이상"
      />

      <View style={styles.buttonWrap}>
        <PrimaryButton
          label="계정 만들기"
          onPress={handleSignup}
          loading={busy}
          inactive={!email.trim() || password.length < 8}
        />
      </View>

      {wakeNotice && <Text style={[styles.wakeNotice, { color: colors.textSecondary }]}>{wakeNotice}</Text>}

      <View style={styles.linkRow}>
        <Text style={[styles.link, { color: colors.textSecondary }]}>이미 계정이 있나요?</Text>
        <TextLink label="로그인" onPress={() => navigation.navigate('Login')} />
      </View>

      {/* 가입은 선택이라는 걸 분명히 한다. 막다른 길처럼 보이지 않게 빠져나가는 길을 둔다. */}
      {navigation.canGoBack() && (
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.laterBtn}>
          <Text style={[styles.laterLabel, { color: colors.textSecondary }]}>나중에 하기</Text>
        </Pressable>
      )}

      <Text style={[styles.note, { color: colors.textSecondary }]}>
        계정이 없어도 앱의 모든 기능을 쓸 수 있어요. 계정은 기록을 백업하고 기기를 옮길 때 필요해요.
      </Text>
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
  buttonWrap: {
    marginTop: 20,
  },
  wakeNotice: {
    ...typography.caption,
    marginTop: 10,
    textAlign: 'center',
  },
  linkRow: {
    height: 44,
    marginTop: 8,
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
  note: {
    ...typography.caption,
    lineHeight: 12 * 1.5,
    marginTop: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
});
