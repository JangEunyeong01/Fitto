import React from 'react';
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radius, typography, weight } from '../theme/tokens';

type ChipSize = 'sm' | 'md' | 'lg' | 'field';

interface SelectChipProps {
  /** 글자 한 줄. 검색 결과처럼 일부만 강조해야 하면 <HighlightText>를 넣어도 된다. */
  label: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  /**
   * sm: 알림 간격 칩, md: 일반 칩, lg: 컨디션 3택처럼 높이가 있는 칩,
   * field: 입력 필드와 나란히 놓여 높이·라운드를 맞춰야 하는 칩(온보딩 성별).
   */
  size?: ChipSize;
  /** 가로를 균등 분할해야 하는 자리(기간 칩, 컨디션 3택)에서 쓴다. */
  fill?: boolean;
  /**
   * 카드 안이 아니라 배경 그라데이션 위에 바로 놓일 때. 온보딩이 여기 해당한다.
   * 카드 위에서 쓰는 card2/line은 배경 위에서 너무 묽어 경계가 안 보인다.
   */
  onBackground?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * 고르는 칩. 알림 간격·컨디션·증상·컵 용량·기간 프리셋·재료 선택이 모두 이걸 쓴다.
 *
 * 시안 규칙 13: 기본은 **테두리 없는 회색 면**, 고르면 **흰 면 + 테두리 + 굵은 글씨**.
 * 예전처럼 고른 칩을 파랗게 칠하지 않는다 — 화면에 파랑이 퍼지면 정작 눌러야 할 버튼이 안 보인다.
 *
 * 테두리 색은 시안의 피또 블루(#89C4E1) 대신 `borderSelected`를 쓴다. 파스텔은 흰 면 위에서 1.9:1이라
 * 선택 표시로 쓰기엔 흐리다(기준 3:1). 다크 모드에서는 borderSelected가 그 파스텔이라 시안과 같아 보인다.
 * 색 말고도 면(회색 → 흰색)과 굵기(600 → 700)가 같이 바뀌어서 색만으로 전하지 않는다.
 */
export default function SelectChip({
  label,
  selected,
  onPress,
  size = 'md',
  fill,
  onBackground,
  style,
}: SelectChipProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      // 보이는 높이 36. 위아래 4씩 더해 누르는 영역 44를 맞춘다.
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.base,
        sizeStyles[size],
        fill && styles.fill,
        {
          // 온보딩처럼 그라데이션 바탕에 바로 놓이면 회색 면이 묻혀서, 그때만 반투명 흰 면을 쓴다.
          backgroundColor: selected ? colors.surfaceSolid : onBackground ? colors.surface : colors.fillMuted,
          // 테두리 두께는 늘 같게 두고 색만 바꾼다. 두께가 바뀌면 고를 때마다 글씨가 1px씩 밀린다.
          borderColor: selected ? colors.borderSelected : 'transparent',
        },
        style,
      ]}
    >
      <Text
        style={[
          size === 'sm' ? typography.label : typography.value,
          { color: selected ? colors.textPrimary : colors.textSecondary },
          weight(selected ? 700 : 600),
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.chip,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
});

const sizeStyles = StyleSheet.create({
  // 시안: 칩 높이 36, 모서리 10.
  sm: {
    height: 36,
    paddingHorizontal: 12,
  },
  md: {
    height: 36,
    paddingHorizontal: 14,
  },
  lg: {
    height: 44,
    paddingHorizontal: 12,
  },
  // TextField md와 같은 높이·라운드. 나란히 놓았을 때 어긋나지 않게 한다.
  field: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
});
