import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, StyleSheet, type TextStyle } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../theme/useTheme';
import { typography, weight } from '../theme/tokens';

const LENGTH = 6;

interface CodeInputProps {
  value: string;
  onChange: (code: string) => void;
  /** 칸 아래 오류 문구. 있으면 지금 칸 테두리도 오류색이 된다. */
  error?: string | null;
  accessibilityLabel?: string;
}

/**
 * 인증 코드 6칸(시안 24). 한 자리에 한 칸, 지금 입력할 칸에만 커서.
 *
 * 칸 여섯 개를 따로 입력창으로 만들면 붙여넣기·SMS/메일 자동완성이 첫 칸에만 들어가고 포커스 이동이 꼬인다.
 * 그래서 투명한 입력창 하나가 여섯 칸 위를 덮어 값을 받고, 칸은 그 값을 한 글자씩 그리기만 한다.
 * 칸 테두리는 없애되 지금 칸의 포커스 링은 남긴다 — 키보드로 쓰는 사람이 어디에 있는지 알아야 한다.
 */
export default function CodeInput({ value, onChange, error, accessibilityLabel = '인증 코드 6자리' }: CodeInputProps) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, LENGTH - 1);

  return (
    <View>
      <Pressable onPress={() => inputRef.current?.focus()} style={styles.row} accessible={false}>
        {Array.from({ length: LENGTH }, (_, i) => {
          const digit = value[i];
          const isActive = focused && i === active;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                { backgroundColor: colors.fillMuted },
                isActive && { borderWidth: 2, borderColor: error ? colors.textDanger : colors.focusRing },
              ]}
            >
              {digit ? (
                <Text style={[styles.digit, { color: colors.textPrimary }]}>{digit}</Text>
              ) : isActive ? (
                <View style={[styles.caret, { backgroundColor: colors.textPrimary }]} />
              ) : null}
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, LENGTH))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={LENGTH}
          caretHidden
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={error ?? undefined}
          style={[styles.hiddenInput, Platform.OS === 'web' && webHidden]}
        />
      </Pressable>
      {!!error && (
        <View style={styles.messageRow}>
          <Icon name="close" size={16} color={colors.textDanger} />
          <Text style={[typography.caption, styles.messageText, { color: colors.textDanger }]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

// 웹에서는 글자·선택 영역·포커스 테두리가 비치지 않게 한다. 칸이 대신 그린다.
const webHidden = { outlineStyle: 'none', caretColor: 'transparent' } as unknown as TextStyle;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 22,
    ...weight(700),
  },
  caret: {
    width: 2,
    height: 24,
    borderRadius: 1,
  },
  // 여섯 칸 전체를 덮는 투명 입력창. 어느 칸을 눌러도 이 창에 포커스가 간다.
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
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
