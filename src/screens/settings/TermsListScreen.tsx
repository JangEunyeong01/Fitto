import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarSpace } from '../../navigation/TabBar';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import DetailHeader from '../detail/DetailHeader';
import SettingsRow, { RowDivider } from './SettingsRow';
import { TERMS } from '../../data/terms';

/** 설정 > 약관 및 정책. 가입할 때 동의한 문서를 나중에도 다시 볼 수 있게 한다. */
export default function TermsListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="약관 및 정책" />
        <GlassCard noPadding>
          {TERMS.map((t, i) => (
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
});
