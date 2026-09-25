import React from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { lightColors, radius, typography, weight } from '../../theme/tokens';
import { FITTO_HELLO } from '../../theme/assets';

/**
 * 로그인·계정 만들기 화면의 틀(시안 21-B·22-B).
 *
 * 위는 피또 블루 그라데이션 + 인사, 아래는 흰 시트 안에 폼. 피또가 시트 너머로 고개를 내민다.
 * 다른 계정 폼(비밀번호 찾기·변경 등)은 카드 없이 바탕 위에 둔다 — 이 틀은 "처음 만나는" 두 화면에만 쓴다(시안 규칙 14).
 *
 * 그라데이션은 시간대와 상관없이 고정이다(시안 규칙 10). 시간대 색은 홈에서만 쓴다.
 */
const HEADER_GRADIENT = ['#A6D2E8', '#84BFDF'] as const;

/**
 * 그라데이션 위 글씨는 라이트·다크와 상관없이 짙은 남색이다. 바탕이 늘 밝은 하늘색이라서.
 * 설명 글씨는 시안의 #5C7282가 하늘색 위에서 약 3:1이라, 한 단계 진하게 올렸다(4.5:1 이상).
 */
const HEADER_TITLE = lightColors.textPrimary;
const HEADER_SUB = '#34506A';

/** 상태 표시줄 아래로 시트가 시작되는 높이(시안 기준 292 − 상태 표시줄 44). */
const HEADER_BODY = 248;
/** 피또 전신 그림 비율(578×731). 폭 128이면 높이 약 162. */
const FITTO_W = 128;
const FITTO_H = Math.round((FITTO_W * 731) / 578);

interface AuthSheetLayoutProps {
  /**
   * 화면 이름("로그인", "계정 만들기"). 뒤로가기 옆에 둔다.
   * 시안엔 없었는데, 큰 인사("다시 만나서 반가워요")만으로는 무슨 화면인지 한눈에 알기 어려웠다.
   */
  heading: string;
  title: string;
  subtitle: string;
  onBack?: () => void;
  children: React.ReactNode;
}

export default function AuthSheetLayout({ heading, title, subtitle, onBack, children }: AuthSheetLayoutProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        // 시트의 둥근 위 모서리 뒤로도 파랑이 보이게 시트 시작점보다 40 더 내려 깐다.
        style={[styles.gradient, { height: insets.top + HEADER_BODY + 40 }]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: insets.top + HEADER_BODY }}>
          {/* 상세 화면과 같은 머리줄: 뒤로가기 화살표 + 화면 이름(시안 규칙 15). */}
          <View style={[styles.headerRow, { top: insets.top + 8 }]}>
            {onBack ? (
              <Pressable
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="뒤로"
                style={styles.back}
              >
                <Icon name="chevronLeft" size={24} color={HEADER_TITLE} />
              </Pressable>
            ) : (
              <View style={styles.backSpacer} />
            )}
            <Text style={[styles.heading, { color: HEADER_TITLE }]} accessibilityRole="header">
              {heading}
            </Text>
          </View>

          <View style={[styles.hello, { top: insets.top + 84 }]}>
            <Text style={[styles.title, { color: HEADER_TITLE }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: HEADER_SUB }]}>{subtitle}</Text>
          </View>

          {/* 장식이라 스크린리더는 건너뛴다. 아래쪽은 시트가 덮어서 고개만 내민 모양이 된다. */}
          <Image
            source={FITTO_HELLO}
            style={[styles.fitto, { top: insets.top + 130 }]}
            resizeMode="contain"
            accessible={false}
          />
        </View>

        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surfaceSolid, shadowColor: colors.shadowColor, paddingBottom: insets.bottom + 120 },
          ]}
        >
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerRow: {
    position: 'absolute',
    left: 6,
    right: 16,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 뒤로가기가 없을 때(첫 화면)도 제목 자리는 같게 둔다.
  backSpacer: {
    width: 18,
  },
  heading: typography.subScreenTitle,
  hello: {
    position: 'absolute',
    left: 24,
    width: 220,
  },
  title: {
    ...typography.onboardingTitle,
    letterSpacing: -0.5,
    lineHeight: 24 * 1.3,
  },
  subtitle: {
    ...typography.body,
    ...weight(500),
    marginTop: 8,
  },
  fitto: {
    position: 'absolute',
    right: 18,
    width: FITTO_W,
    height: FITTO_H,
  },
  sheet: {
    flexGrow: 1,
    borderTopLeftRadius: radius.sheetTop,
    borderTopRightRadius: radius.sheetTop,
    paddingTop: 28,
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
});
