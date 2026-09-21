import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/useTheme';
import Icon from '../../components/Icon';

interface DetailHeaderProps {
  title: string;
}

// README: 서브 화면은 좌상단 34×34 글래스 뒤로가기 버튼(‹)으로 직전 탭으로 돌아간다.
export default function DetailHeader({ title }: DetailHeaderProps) {
  const navigation = useNavigation();
  const { colors, mode, typography } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
        <BlurView
          intensity={25}
          tint={mode === 'dark' ? 'dark' : 'light'}
          style={[styles.backBtn, { borderColor: colors.borderGlass }]}
        >
          <View style={[styles.backInner, { backgroundColor: colors.surface }]}>
            <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
          </View>
        </BlurView>
      </Pressable>
      <Text style={[typography.subScreenTitle, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  backInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
