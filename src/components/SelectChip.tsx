import React from 'react';
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radius, selection, typography, weight } from '../theme/tokens';

type ChipSize = 'sm' | 'md' | 'lg' | 'field';

interface SelectChipProps {
  label: string;
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
 * 선택 상태를 색으로 보여주는 칩. 알림 간격·컨디션·증상·컵 용량·기간 프리셋·재료 선택이
 * 전부 같은 모양이었는데 화면마다 따로 만들어 미묘하게 달랐다.
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
      // 보이는 높이가 30~36이라 위아래를 늘려 누르는 영역을 44 가까이 맞춘다.
      hitSlop={{ top: 6, bottom: 6 }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.base,
        sizeStyles[size],
        fill && styles.fill,
        {
          backgroundColor: selected ? selection.bg : onBackground ? colors.surface : colors.surfaceSolid,
          // 선택 여부를 면 색만으로 알리지 않는다. 테두리 굵기와 글씨 굵기도 함께 바뀐다.
          borderColor: selected ? colors.borderSelected : colors.borderInput,
          borderWidth: selected ? 1.5 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          size === 'sm' ? typography.label : typography.value,
          { color: colors.textPrimary },
          weight(selected ? 700 : 500),
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  md: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lg: {
    height: 42,
    paddingHorizontal: 12,
  },
  // TextField md와 같은 높이·라운드. 나란히 놓았을 때 어긋나지 않게 한다.
  field: {
    height: 46,
    borderRadius: 15,
    paddingHorizontal: 12,
  },
});
