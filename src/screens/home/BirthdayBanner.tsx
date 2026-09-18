import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { birthday, radius, typography } from '../../theme/tokens';

interface BirthdayBannerProps {
  name: string;
  onPress: () => void;
}

// 프로토타입 명세: 헤더 아래 전폭 버튼. 라벤더→피치 반투명 그라데이션 + 블러 + 흰 테두리.
export default function BirthdayBanner({ name, onPress }: BirthdayBannerProps) {
  const { colors, mode, shadow } = useTheme();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, shadow, { opacity: pressed ? 0.85 : 1 }]}>
      <BlurView
        intensity={30}
        tint={mode === 'dark' ? 'dark' : 'light'}
        style={[styles.blur, { borderColor: colors.stroke }]}
      >
        <LinearGradient
          colors={birthday.bannerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.6 }}
          style={styles.inner}
        >
          <LinearGradient
            colors={birthday.avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          />
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.txt }]} numberOfLines={1}>
              오늘은 {name}님의 생일이에요
            </Text>
            <Text style={[styles.sub, { color: colors.sub }]} numberOfLines={1}>
              피또의 축하 메시지 열어보기
            </Text>
          </View>
          <Icon name="chevronRight" size={17} color={colors.sub} />
        </LinearGradient>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginTop: 14,
    borderRadius: radius.optionRow,
  },
  blur: {
    borderRadius: radius.optionRow,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: typography.value,
  sub: {
    ...typography.caption,
    marginTop: 2,
  },
});
