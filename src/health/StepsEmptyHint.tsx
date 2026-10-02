import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import TextLink from '../components/TextLink';
import { useTheme } from '../theme/useTheme';
import { typography } from '../theme/tokens';
import { useAppStore } from '../store/useAppStore';
import { EMPTY_SOURCE_HINT, openHealthConnect } from './steps';

/**
 * 연결은 됐는데 걸음이 하나도 안 들어올 때 한 줄 안내(걸음 카드·걸음 상세).
 * "0보"만 보이면 고장인지 안 걸은 건지 모른다. 어디를 켜면 되는지와 바로가기를 같이 준다.
 */
export default function StepsEmptyHint({ compact }: { compact?: boolean }) {
  const { colors } = useTheme();
  const connected = useAppStore((s) => s.stepSource) !== 'none';
  const empty = useAppStore((s) => s.stepsSourceEmpty);
  if (!connected || !empty) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, { color: colors.textSecondary }]} numberOfLines={compact ? 3 : undefined}>
        {EMPTY_SOURCE_HINT}
      </Text>
      {Platform.OS === 'android' && <TextLink label="헬스 커넥트 열기" onPress={openHealthConnect} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    marginTop: 8,
  },
  text: {
    ...typography.caption,
    lineHeight: 18,
  },
});
