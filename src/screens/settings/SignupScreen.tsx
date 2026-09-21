import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import DetailHeader from '../detail/DetailHeader';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';
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
  const insets = useSafeAreaInsets();
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

  const handleSignup = async () => {
    if (busy) return;
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

      signIn({ accessToken: result.accessToken, refreshToken: result.refreshToken, email: result.user.email });

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
      // 서버가 준 문장을 그대로 보여준다(명세 0-6). 앱이 코드별 문구를 따로 들고 있지 않아도 된다.
      if (e instanceof ApiError || e instanceof NetworkError) {
        showToast(e.message);
      } else {
        showToast('가입에 실패했어요. 잠시 후 다시 시도해 주세요');
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
        <DetailHeader title="계정 만들기" />

        <GlassCard style={styles.card}>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            지금까지 기록한 내용은 계정으로 함께 옮겨져요. 다른 기기에서도 이어서 볼 수 있어요.
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>이메일</Text>
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
            onChangeText={setPassword}
            placeholder="영문과 숫자를 섞어 8자 이상"
            autoCapitalize="none"
            secureTextEntry
            maxLength={64}
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

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={[styles.link, { color: colors.textPrimary }]}>이미 계정이 있나요? 로그인</Text>
          </Pressable>
        </GlassCard>

        <Text style={[styles.note, { color: colors.textSecondary }]}>
          계정이 없어도 앱의 모든 기능을 쓸 수 있어요. 계정은 기록을 백업하고 기기를 옮길 때 필요해요.
        </Text>
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
  desc: {
    ...typography.bodySm,
    marginBottom: 4,
  },
  label: {
    ...typography.label,
    marginTop: 16,
    marginBottom: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: typography.label,
  note: {
    ...typography.caption,
    lineHeight: 11 * 1.6,
    paddingHorizontal: 4,
  },
});
