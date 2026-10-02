import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/useTheme';
import Icon from '../../components/Icon';

interface DetailHeaderProps {
  title: string;
}

/**
 * 하위 화면 머리(시안 07~13). 박스 없이 화살표 아이콘만 두고 제목을 바로 옆에 붙인다.
 * 누르는 영역은 44인데 화살표가 글씨 줄에 맞아 보이도록 왼쪽으로 10 당겨 둔다.
 */
export default function DetailHeader({ title }: DetailHeaderProps) {
  const navigation = useNavigation();
  const { colors, typography } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="뒤로"
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="chevronLeft" size={24} color={colors.textPrimary} />
      </Pressable>
      <Text style={[typography.subScreenTitle, styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    marginLeft: -10,
    marginBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
});
