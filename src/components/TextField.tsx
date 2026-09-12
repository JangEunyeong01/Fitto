import React, { useRef } from 'react';
import { TextInput, View, Pressable, StyleSheet, StyleProp, TextStyle, TextInputProps } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../theme/useTheme';
import { typography } from '../theme/tokens';

type FieldSize = 'md' | 'sm';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** md: 화면에 바로 놓이는 폼 입력, sm: 카드·시트 안에 끼워 넣는 좁은 입력. */
  size?: FieldSize;
  center?: boolean;
  /**
   * 카드 안이 아니라 배경 그라데이션 위에 바로 놓일 때(온보딩, 레시피 이름).
   * 이때만 유리 표면(card/stroke)을 쓴다 — 카드 위에서 이 색을 쓰면 카드와
   * 같은 흰색이라 입력창이 통째로 사라진다.
   */
  onBackground?: boolean;
  /** 값이 있을 때 오른쪽에 X를 띄워 한 번에 지운다(명세 F-003·F-040 이름 입력). */
  clearable?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * 앱의 모든 텍스트 입력. 원래 화면마다 높이(50/46/44/42)와 라운드(15/13)가 제각각이었고,
 * 카드 안에서도 유리 색을 그대로 써서 테두리가 안 보이는 화면이 있었다.
 * placeholder 색과 테마 색은 여기서 붙이므로 호출부에서 넘기지 않는다.
 */
export default function TextField({ size = 'md', center, onBackground, clearable, style, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const input = (
    <TextInput
      ref={inputRef}
      placeholderTextColor={colors.sub}
      style={[
        styles.base,
        sizeStyles[size],
        center && styles.center,
        {
          backgroundColor: onBackground ? colors.card : colors.ink,
          borderColor: onBackground ? colors.stroke : colors.line,
          color: colors.txt,
        },
        clearable && styles.clearablePad,
        style,
      ]}
      {...rest}
    />
  );

  if (!clearable) return input;

  return (
    <View>
      {input}
      {!!rest.value && (
        <Pressable
          // 지우는 건 대개 다시 쓰려는 거라 포커스를 입력창으로 되돌린다.
          onPress={() => {
            rest.onChangeText?.('');
            inputRef.current?.focus();
          }}
          hitSlop={8}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="입력 지우기"
        >
          <Icon name="close" size={14} color={colors.sub} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...typography.input,
    borderWidth: 1,
    // 웹에서 input은 min-width가 auto라 flex:1을 줘도 기본 너비 밑으로 안 줄어든다.
    // 생일 월/일이나 레시피 탄단지처럼 한 줄에 여러 개 놓으면 부모를 넘어간다.
    minWidth: 0,
  },
  center: {
    textAlign: 'center',
  },
  // X 버튼 자리만큼 비워 긴 이름이 버튼 밑으로 들어가지 않게 한다.
  clearablePad: {
    paddingRight: 40,
  },
  clearBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const sizeStyles = StyleSheet.create({
  md: {
    height: 46,
    borderRadius: 15,
    paddingHorizontal: 14,
  },
  sm: {
    height: 42,
    borderRadius: 13,
    paddingHorizontal: 12,
  },
});
