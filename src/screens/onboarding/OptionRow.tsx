import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { brand, weight } from '../../theme/tokens';

interface OptionRowProps {
  title: string;
  desc?: string;
  selected: boolean;
  onPress: () => void;
  /** 위 줄과 가르는 얇은 선. 첫 줄만 false. */
  divider?: boolean;
}

/**
 * 하나를 고르는 목록의 한 줄(시안 17-1·29). 이름·설명과 오른쪽 동그라미.
 * 예전엔 줄마다 유리 박스였는데, 카드 한 장 안에 얇은 선으로 나눈다. 카드(또는 시트)는 부르는 쪽이 감싼다.
 * 온보딩(활동량·목표·피또 성격)과 프로필 시트가 같이 쓴다.
 */
export default function OptionRow({ title, desc, selected, onPress, divider }: OptionRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      // 여럿 중 하나를 고르는 줄이라 radio로 알린다.
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={desc ? `${title}, ${desc}` : title}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.fillMuted }]}
    >
      {divider && <View style={[styles.divider, { backgroundColor: colors.borderDivider }]} />}
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.textPrimary }, selected && weight(700)]}>{title}</Text>
        {!!desc && <Text style={[styles.desc, { color: colors.textSecondary }]}>{desc}</Text>}
      </View>
      <RadioMark on={selected} />
    </Pressable>
  );
}

/** 안 고름은 빈 원, 고름은 파란 원 + 진한 체크. 색만이 아니라 체크 모양으로도 구분된다. */
function RadioMark({ on }: { on: boolean }) {
  const { colors } = useTheme();
  if (on) {
    return (
      <View style={[styles.mark, { backgroundColor: brand.blue }]}>
        <Icon name="check" size={16} color={colors.textOnPrimary} strokeWidth={2.4} />
      </View>
    );
  }
  return <View style={[styles.mark, styles.markOff, { borderColor: colors.borderInput }]} />;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // 선은 좌우를 18씩 들여 글씨 폭에 맞춘다(시안 17-1·29).
  divider: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: StyleSheet.hairlineWidth,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    ...weight(600),
  },
  desc: {
    fontSize: 12,
    marginTop: 3,
  },
  mark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOff: {
    borderWidth: 1.5,
  },
});
