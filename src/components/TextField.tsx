import React, { useRef, useState } from 'react';
import { TextInput, View, Text, Pressable, StyleSheet, StyleProp, TextStyle, TextInputProps } from 'react-native';
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
   * 이때만 유리 면을 쓴다.
   */
  onBackground?: boolean;
  /** 값이 있을 때 오른쪽에 X를 띄워 한 번에 지운다(명세 F-003·F-040 이름 입력). */
  clearable?: boolean;
  /**
   * 오류 문구. 있으면 테두리를 바꾸고 **칸 아래에 문구를 함께 띄운다.**
   * 테두리 색만 바꾸면 색 구분이 어려운 사용자에게는 오류가 전달되지 않는다(UI 기준서 5-2).
   */
  error?: string | null;
  /** 칸 아래 도움말. 오류가 있으면 오류가 대신 보인다. */
  helper?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * 앱의 모든 텍스트 입력.
 *
 * 상태: default → focus(focusRing 2px) → filled / error(오류 테두리 2px + 칸 아래 문구·아이콘).
 * 오류는 입력하는 중에는 띄우지 않는다 — 호출부가 칸을 벗어날 때나 제출할 때 error를 넘긴다.
 * placeholder 색과 테마 색은 여기서 붙이므로 호출부에서 넘기지 않는다.
 */
export default function TextField({
  size = 'md',
  center,
  onBackground,
  clearable,
  error,
  helper,
  style,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const borderColor = !editable
    ? colors.borderDivider
    : error
      ? colors.textDanger
      : focused
        ? colors.focusRing
        : colors.borderInput;
  // 포커스·오류는 두께도 바꾼다. 색만 바뀌면 알아채기 어렵다.
  const borderWidth = editable && (error || focused) ? 2 : 1;

  const input = (
    <TextInput
      ref={inputRef}
      editable={editable}
      placeholderTextColor={colors.textPlaceholder}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      accessibilityState={{ disabled: !editable }}
      // 스크린리더가 칸과 오류를 함께 읽는다.
      accessibilityHint={error ?? helper}
      style={[
        styles.base,
        sizeStyles[size],
        center && styles.center,
        {
          backgroundColor: !editable ? colors.surfaceMuted : onBackground ? colors.surface : colors.surfaceSolid,
          borderColor,
          borderWidth,
          // 테두리가 두꺼워질 때 글씨가 1px 밀리지 않게 안쪽 여백을 줄여 맞춘다.
          paddingHorizontal: sizeStyles[size].paddingHorizontal - (borderWidth - 1),
          color: editable ? colors.textPrimary : colors.textDisabled,
        },
        clearable && styles.clearablePad,
        style,
      ]}
      {...rest}
    />
  );

  const message = error ?? helper;

  // 문구도 X도 없으면 감싸지 않는다. 한 줄에 여러 칸을 놓는 곳(키·몸무게, 탄단지)은
  // 호출부가 style={{ flex: 1 }}을 입력칸에 직접 주므로, View로 감싸면 폭이 무너진다.
  if (!message && !clearable) return input;

  return (
    <View>
      {clearable ? (
        <View>
          {input}
          {!!rest.value && editable && (
            <Pressable
              // 지우는 건 대개 다시 쓰려는 거라 포커스를 입력창으로 되돌린다.
              onPress={() => {
                rest.onChangeText?.('');
                inputRef.current?.focus();
              }}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="입력 지우기"
            >
              <Icon name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      ) : (
        input
      )}

      {!!message && (
        <View style={styles.messageRow}>
          {!!error && <Icon name="close" size={16} color={colors.textDanger} />}
          <Text
            style={[typography.caption, styles.messageText, { color: error ? colors.textDanger : colors.textSecondary }]}
            accessibilityLiveRegion={error ? 'polite' : 'none'}
          >
            {message}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...typography.input,
    // 웹에서 input은 min-width가 auto라 flex:1을 줘도 기본 너비 밑으로 안 줄어든다.
    // 생일 월/일이나 레시피 탄단지처럼 한 줄에 여러 개 놓으면 부모를 넘어간다.
    minWidth: 0,
  },
  center: {
    textAlign: 'center',
  },
  // X 버튼 자리만큼 비워 긴 이름이 버튼 밑으로 들어가지 않게 한다.
  clearablePad: {
    paddingRight: 44,
  },
  // X는 44×44 영역을 통째로 누를 수 있게 한다. 예전에는 아이콘 14px + 여유 8이었다.
  clearBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  messageText: {
    flex: 1,
  },
});

/** 높이는 UI 기준서 7-2 기준. 폼 입력 48, 좁은 자리 44. 예전 46·42는 44 미달이 있었다. */
const sizeStyles = {
  md: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  sm: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
} as const;
