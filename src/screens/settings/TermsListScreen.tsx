import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarSpace } from '../../navigation/TabBar';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import DetailHeader from '../detail/DetailHeader';
import SettingsRow, { RowDivider } from './SettingsRow';
import { ALL_DOCS, TERMS_VERSION, formatTermsDate } from '../../data/terms';
import { useAuthStore } from '../../store/useAuthStore';
import { useReconsentStore } from '../../store/useReconsentStore';

/** 설정 > 약관 및 정책. 가입할 때 동의한 문서를 나중에도 다시 볼 수 있게 한다. */
export default function TermsListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isMember = useAuthStore((s) => s.status === 'member');
  const agreed = useAuthStore((s) => s.agreedTermsVersion);
  const showReconsent = useReconsentStore((s) => s.show);
  // "나중에"로 미룬 사람이 직접 동의할 수 있는 곳. 서버에서 동의 버전을 받아온 뒤(undefined가 아닐 때)만.
  const needsReconsent = isMember && agreed !== undefined && agreed !== TERMS_VERSION;

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="약관 및 정책" />
        {needsReconsent && (
          <GlassCard noPadding style={styles.card}>
            <SettingsRow
              label="바뀐 약관에 동의하기"
              desc={`${formatTermsDate(TERMS_VERSION)}부터 바뀐 약관이에요`}
              onPress={showReconsent}
              chevron
            />
          </GlassCard>
        )}
        <GlassCard noPadding>
          {ALL_DOCS.map((t, i) => (
            <React.Fragment key={t.id}>
              {i > 0 && <RowDivider />}
              <SettingsRow label={t.title} onPress={() => navigation.navigate('Terms', { id: t.id })} chevron />
            </React.Fragment>
          ))}
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
});
