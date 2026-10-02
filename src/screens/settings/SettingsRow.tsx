import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';

/** 카드 안 줄의 좌우 여백. 구분선도 이만큼 들여 긋는다(시안 06·18). */
export const ROW_PAD = 18;

interface SettingsRowProps {
  label: string;
  /** 줄 아래 한 줄 더. 들어가 보기 전에 알아야 하는 값만 적는다. */
  desc?: string | null;
  descTone?: 'normal' | 'danger';
  value?: string;
  chevron?: boolean;
  right?: React.ReactNode;
  danger?: boolean;
  onPress?: () => void;
  a11yHint?: string;
}

/**
 * 설정·계정 화면의 한 줄(52, 설명이 있으면 64). 오른쪽은 값 글씨(+ ›), 스위치 같은 컨트롤(right), 아무것도 없음 중 하나.
 * onPress가 있으면 줄 전체가 버튼이다. 카드는 noPadding으로 두고 줄이 좌우 여백을 가진다.
 */
export default function SettingsRow({
  label,
  desc,
  descTone = 'normal',
  value,
  chevron,
  right,
  danger,
  onPress,
  a11yHint,
}: SettingsRowProps) {
  const { colors } = useTheme();

  const body = (
    <>
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: danger ? colors.textDanger : colors.textPrimary }]}>{label}</Text>
        {desc ? (
          <Text
            style={[styles.desc, { color: descTone === 'danger' ? colors.textDanger : colors.textSecondary }]}
            numberOfLines={1}
          >
            {desc}
          </Text>
        ) : null}
      </View>
      {value != null && <Text style={[styles.value, { color: colors.textSecondary }]}>{value}</Text>}
      {right}
      {chevron && <Icon name="chevronRight" size={16} color={danger ? colors.textDanger : colors.textSecondary} />}
    </>
  );

  const rowStyle = [styles.row, desc ? styles.rowTall : null];
  if (!onPress) return <View style={rowStyle}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={a11yHint}
      style={({ pressed }) => [rowStyle, pressed && { backgroundColor: colors.fillMuted }]}
    >
      {body}
    </Pressable>
  );
}

/** 줄 사이 얇은 선. 왼쪽만 들여 긋는다. */
export function RowDivider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.borderDivider }]} />;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    paddingHorizontal: ROW_PAD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTall: {
    minHeight: 64,
    paddingVertical: 10,
  },
  textCol: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 15,
    ...weight(600),
  },
  desc: typography.caption,
  value: {
    fontSize: 14,
    ...weight(400),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: ROW_PAD,
  },
});
