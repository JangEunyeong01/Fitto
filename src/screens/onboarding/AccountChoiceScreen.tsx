import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import FittoCharacter from '../../components/FittoCharacter';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';

/** 계정이 있으면 되는 것. 없으면 못 하는 것이 아니라, 있으면 더 되는 것으로 적는다. */
const BENEFITS = [
  '기록을 서버에 백업해요',
  '폰을 바꿔도 이어서 볼 수 있어요',
  '지금까지 기록한 내용도 함께 옮겨져요',
];

/**
 * 온보딩을 마친 뒤 한 번 묻는 계정 선택(명세 3-2).
 *
 * 가입은 기능을 여는 열쇠가 아니라 저장 위치를 서버로 옮기는 스위치다. 그래서
 * 여기서 "나중에 하기"를 골라도 앱의 모든 기능을 그대로 쓴다. 묻는 건 이 화면 한 번뿐이고,
 * 그 뒤로는 설정에서만 권한다 — 매번 띄우면 게스트로 쓰겠다는 선택을 무시하는 것이 된다.
 */
export default function AccountChoiceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const nickname = useAppStore((s) => s.profile.nickname);
  const dismiss = useAppStore((s) => s.dismissAccountPrompt);

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <FittoCharacter current={4} goal={5} size={92} glowSize={112} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>기록을 어디에 저장할까요?</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            {nickname}님의 기록은 지금 이 폰에 저장돼요. 계정을 만들면 서버에도 함께 보관할 수 있어요.
          </Text>
        </View>

        <GlassCard style={styles.card}>
          <View style={styles.benefitList}>
            {BENEFITS.map((item) => (
              <Text key={item} style={[styles.benefit, { color: colors.textPrimary }]}>
                · {item}
              </Text>
            ))}
          </View>
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            계정이 없어도 앱의 모든 기능을 쓸 수 있어요. 나중에 설정에서 만들어도 기록은 그대로 옮겨져요.
          </Text>
        </GlassCard>

        <View style={styles.actions}>
          {/* 주 버튼은 한 화면에 하나. 로그인은 보조, 나중에 하기는 가장 가볍게. */}
          <PrimaryButton label="계정 만들기" onPress={() => navigation.navigate('Signup')} />
          <PrimaryButton label="이미 계정이 있어요" variant="secondary" onPress={() => navigation.navigate('Login')} />
          <PrimaryButton label="나중에 하기" variant="text" onPress={dismiss} />
        </View>
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
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    ...typography.onboardingTitle,
    textAlign: 'center',
  },
  desc: {
    ...typography.body,
    textAlign: 'center',
  },
  card: {
    marginTop: 28,
  },
  benefitList: {
    gap: 8,
  },
  benefit: typography.bodySm,
  note: {
    ...typography.caption,
    marginTop: 14,
  },
  actions: {
    marginTop: 28,
    gap: 10,
  },
});
