import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarSpace } from '../../navigation/TabBar';
import { useRoute } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import DetailHeader from '../detail/DetailHeader';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { findTerms, TermsId } from '../../data/terms';

/** 약관 본문(시안 39). 카드 없이 조 제목과 문단만 쌓는다. 설정 > 약관 및 정책에서 들어온다. */
export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useRoute().params as { id: TermsId };
  const doc = findTerms(id);

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title={doc.title} />
        <View style={styles.body}>
          <TermsBody id={id} />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

/** 시행일과 조 제목·문단. 이 화면과 가입 동의 시트가 같이 쓴다. */
export function TermsBody({ id }: { id: TermsId }) {
  const { colors } = useTheme();
  const doc = findTerms(id);
  return (
    <>
      <Text style={[styles.effective, { color: colors.textSecondary }]}>시행일 {doc.effective}</Text>
      {doc.sections.map((s, i) => (
        <View key={s.heading} style={{ marginTop: i === 0 ? 20 : 28 }}>
          <Text style={[styles.heading, { color: colors.textPrimary }]} accessibilityRole="header">
            {s.heading}
          </Text>
          <Text style={[styles.paragraph, { color: colors.textPrimary }]}>{s.body}</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  body: {
    paddingHorizontal: 4,
  },
  effective: {
    ...typography.caption,
    lineHeight: 18,
  },
  heading: {
    fontSize: 15,
    ...weight(700),
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 14 * 1.7,
    marginTop: 8,
  },
});
