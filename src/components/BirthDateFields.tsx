import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TextField from './TextField';
import { useTheme } from '../theme/useTheme';
import { weight } from '../theme/tokens';

export interface BirthDateValue {
  year: string;
  month: string;
  day: string;
}

interface BirthDateFieldsProps {
  value: BirthDateValue;
  onChange: (patch: Partial<BirthDateValue>) => void;
  /** 칸에서 나갈 때. 프로필은 여기서 저장하고, 온보딩은 다음 버튼에서 한꺼번에 검사한다. */
  onCommit?: () => void;
  onBackground?: boolean;
}

/**
 * 생년월일 세 칸(시안 17·28). 연도 칸만 1.5배로 넓고, "년·월·일"은 칸 밖 오른쪽에 붙인다.
 * 온보딩과 프로필이 같은 모양이라 한 군데 뒀다.
 */
export default function BirthDateFields({ value, onChange, onCommit, onBackground }: BirthDateFieldsProps) {
  const parts: {
    key: keyof BirthDateValue;
    unit: string;
    a11y: string;
    placeholder: string;
    maxLength: number;
    flex: number;
  }[] = [
    { key: 'year', unit: '년', a11y: '태어난 연도', placeholder: '1998', maxLength: 4, flex: 1.5 },
    { key: 'month', unit: '월', a11y: '태어난 월', placeholder: '3', maxLength: 2, flex: 1 },
    { key: 'day', unit: '일', a11y: '태어난 일', placeholder: '14', maxLength: 2, flex: 1 },
  ];

  return (
    <View style={styles.row}>
      {parts.map((p) => (
        <Part key={p.key} unit={p.unit} flex={p.flex}>
          <TextField
            value={value[p.key]}
            onChangeText={(t) => onChange({ [p.key]: t.replace(/[^0-9]/g, '') })}
            onEndEditing={onCommit}
            onBlur={onCommit}
            placeholder={p.placeholder}
            maxLength={p.maxLength}
            keyboardType="number-pad"
            accessibilityLabel={p.a11y}
            onBackground={onBackground}
            center
            style={styles.input}
          />
        </Part>
      ))}
    </View>
  );
}

function Part({ unit, flex, children }: { unit: string; flex: number; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.part, { flex }]}>
      {children}
      <Text style={[styles.unit, { color: colors.textSecondary }]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  part: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  input: {
    flex: 1,
  },
  unit: {
    fontSize: 14,
    ...weight(600),
  },
});
