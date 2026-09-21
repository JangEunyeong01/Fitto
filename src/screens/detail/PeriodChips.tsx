import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { radius, selection, typography, weight } from '../../theme/tokens';

export type Period = 'day' | 'week' | 'month';

const OPTIONS: { key: Period; label: string }[] = [
  { key: 'day', label: '일간' },
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
];

interface PeriodChipsProps {
  value: Period;
  onChange: (p: Period) => void;
}

// README: 기간 칩 3개(일간/주간/월간).
export default function PeriodChips({ value, onChange }: PeriodChipsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {OPTIONS.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.chip,
              {
                backgroundColor: on ? selection.bg : colors.surface,
                borderColor: on ? selection.border : colors.borderGlass,
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.textPrimary }, weight(on ? 700 : 500)]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    height: 38,
    borderRadius: radius.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: typography.body,
});
