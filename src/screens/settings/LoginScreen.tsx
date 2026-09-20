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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const signIn = useAuthStore((s) => s.signIn);
  const setProfile = useAppStore((s) => s.setProfile);
  const setGoals = useAppStore((s) => s.setGoals);
  const setPersona = useAppStore((s) => s.setPersona);
  const showToast = useToastStore((s) => s.show);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
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
      signIn({ accessToken: result.accessToken, refreshToken: result.refreshToken, email: result.user.email });

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
      if (e instanceof ApiError || e instanceof NetworkError) {
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
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="로그인" />

        <GlassCard style={styles.card}>
          <Text style={[styles.label, { color: colors.sub }]}>이메일</Text>
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="fitto@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            maxLength={254}
          />

          <Text style={[styles.label, { color: colors.sub }]}>비밀번호</Text>
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호"
            autoCapitalize="none"
            secureTextEntry
            maxLength={64}
          />

          <View style={styles.buttonWrap}>
            <PrimaryButton label="로그인" onPress={submit} loading={busy} inactive={!email.trim() || !password} />
          </View>

          {/* 무료 서버가 잠들어 있으면 1분 넘게 걸린다. 스피너만 돌면 고장으로 보인다. */}
          {wakeNotice && <Text style={[styles.wakeNotice, { color: colors.sub }]}>{wakeNotice}</Text>}

          {/* 로그인 화면에서 막히지 않게 가입으로 가는 길을 둔다. 비밀번호 찾기는 메일 발송을 붙인 뒤에 넣는다. */}
          <Pressable onPress={() => navigation.navigate('Signup')} style={styles.linkRow}>
            <Text style={[styles.link, { color: colors.txt }]}>계정이 없으신가요? 계정 만들기</Text>
          </Pressable>
        </GlassCard>

        {/* 기기에 기록이 있을 때만 묻는다. 둘 중 하나를 고르기 전에는 로그인하지 않는다. */}
        {askMerge && (
          <GlassCard style={styles.card}>
            <Text style={[styles.mergeTitle, { color: colors.txt }]}>이 기기의 기록을 어떻게 할까요?</Text>
            <Text style={[styles.desc, { color: colors.sub }]}>
              계정에 이미 있는 날짜는 계정 기록을 그대로 두고, 없는 날짜만 채워요.
            </Text>

            <View style={styles.mergeButtons}>
              <PrimaryButton label="계정에 합치기" onPress={() => handleLogin(true)} loading={busy} />
              <PrimaryButton label="합치지 않고 로그인" onPress={() => handleLogin(false)} small />
            </View>
          </GlassCard>
        )}
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
  mergeTitle: typography.sectionTitle,
  desc: {
    ...typography.bodySm,
    marginTop: 6,
  },
  mergeButtons: {
    marginTop: 16,
    gap: 8,
  },
});
