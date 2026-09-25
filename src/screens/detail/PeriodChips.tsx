import React from 'react';
import { View, StyleSheet } from 'react-native';
import SegmentedControl from '../../components/SegmentedControl';

export type Period = 'day' | 'week' | 'month';

const OPTIONS: { value: Period; label: string }[] = [
  { value: 'day', label: '일간' },
  { value: 'week', label: '주간' },
  { value: 'month', label: '월간' },
];

interface PeriodChipsProps {
  value: Period;
  onChange: (p: Period) => void;
}

// 일간/주간/월간. 늘 하나가 골라져 있어서 떨어진 칩 대신 붙은 세그먼트(시안 07·08).
export default function PeriodChips({ value, onChange }: PeriodChipsProps) {
  return (
    <View style={styles.wrap}>
      <SegmentedControl options={OPTIONS} value={value} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
});
