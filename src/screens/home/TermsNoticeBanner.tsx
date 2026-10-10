import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { TERMS_HISTORY, formatTermsDate } from '../../data/terms';
import { useReconsentStore } from '../../store/useReconsentStore';
import { dateKey } from '../../utils/timeOfDay';

/**
 * 약관이 곧 바뀐다는 한 줄. 처리방침 14번의 "시행 7일 전에 앱에서 알린다"를 실제로 지키는 자리.
 * 서버가 알려준 곧 시행될 버전이 이 앱에 들어 있고, 알리기 시작하는 날(noticeFrom)이 지났을 때만 보인다.
 * 시행일이 지나면 서버의 upcoming이 비어 저절로 사라지고, 그때부터는 다시 동의 시트가 맡는다.
 */
export default function TermsNoticeBanner() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const upcoming = useReconsentStore((s) => s.upcoming);
  const next = TERMS_HISTORY.find((t) => t.version === upcoming);
  if (!next || dateKey() < next.noticeFrom) return null;

  return (
    <Pressable
      onPress={() => navigation.navigate('Settings', { screen: 'TermsList' })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { backgroundColor: colors.fillMuted, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        {formatTermsDate(next.version)}부터 약관이 바뀌어요
      </Text>
      <Text style={[styles.link, { color: colors.textAccent }]}>보기</Text>
      <Icon name="chevronRight" size={16} color={colors.textAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    ...typography.bodySm,
    flex: 1,
  },
  link: {
    fontSize: 13,
    ...weight(600),
  },
});
