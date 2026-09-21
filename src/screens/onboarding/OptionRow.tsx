import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/useTheme';
import { brand, radius, selection, typography } from '../../theme/tokens';

interface OptionRowProps {
  title: string;
  desc?: string;
  selected: boolean;
  onPress: () => void;
}

// README: 선택 옵션 행 — 패딩 15/16, r18, 글래스. 선택 시 테두리 blue.9, 배경 blue.16,
// 그림자 blue.24, 우측 20px 원형 마커가 6px solid blue 링으로 채워짐.
export default function OptionRow({ title, desc, selected, onPress }: OptionRowProps) {
  const { colors, mode } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={styles.wrap}
      // 여럿 중 하나를 고르는 행이라 radio로 알린다. 예전에는 스크린리더가 누를 수 있는 요소인지도 몰랐다.
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={desc ? `${title}, ${desc}` : title}
    >
      <View
        style={[
          styles.shadowWrap,
          selected && { shadowColor: selection.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 18, elevation: 4 },
        ]}
      >
        <BlurView intensity={25} tint={mode === 'dark' ? 'dark' : 'light'} style={[styles.blur, { borderColor: selected ? colors.borderSelected : colors.borderInput }]}>
          <View
            style={[
              styles.inner,
              { backgroundColor: selected ? selection.bg : colors.surface },
            ]}
          >
            <View style={styles.textCol}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
              {!!desc && <Text style={[styles.desc, { color: colors.textSecondary }]}>{desc}</Text>}
            </View>
            <View style={[styles.marker, { borderColor: selected ? colors.borderSelected : colors.borderInput }]}>
              {selected && <View style={styles.markerFill} />}
            </View>
          </View>
        </BlurView>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  shadowWrap: {
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
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  textCol: {
    flex: 1,
    gap: 3,
  },
  title: typography.itemTitle,
  desc: typography.bodySm,
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerFill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 6,
    borderColor: brand.blue,
  },
});
