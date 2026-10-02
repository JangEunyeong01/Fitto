import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radius, typography, weight } from '../theme/tokens';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** 입력칸 옆에 붙을 때는 그 칸 높이(48)에 맞춘다. 기본 40. */
  height?: number;
}

/**
 * 붙은 세그먼트. 성격 3택·인분/g처럼 **늘 하나가 골라져 있는** 값에만 쓴다.
 *
 * 시안 규칙 13: 아무것도 안 고른 상태가 있을 수 있으면(성별 미입력 등) 붙은 세그먼트 대신 떨어진 칩을 쓴다.
 * 붙어 있으면 "하나는 반드시 골라져 있다"로 읽히기 때문이다. 그래서 value에 null을 받지 않는다.
 *
 * 트랙은 회색 면, 고른 칸은 흰 면 + 약한 그림자. 색 말고 굵기(600 → 700)도 같이 바뀐다.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  height = 40,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, { height, backgroundColor: colors.fillMuted }]}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            // 트랙 높이 40이면 위아래 2씩 더해 누르는 영역 44를 맞춘다.
            hitSlop={{ top: Math.max(0, (44 - height) / 2), bottom: Math.max(0, (44 - height) / 2) }}
            style={[
              styles.segment,
              selected && [styles.selected, { backgroundColor: colors.surfaceSolid, shadowColor: colors.shadowColor }],
            ]}
          >
            <Text
              style={[
                typography.label,
                weight(selected ? 700 : 600),
                { color: selected ? colors.textPrimary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.button,
    padding: 3,
  },
  segment: {
    flex: 1,
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
});
