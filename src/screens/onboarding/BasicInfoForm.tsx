import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TextField from '../../components/TextField';
import SelectChip from '../../components/SelectChip';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';
import { GENDERS } from '../../constants/codes';
import type { ObInfo } from '../../store/useAppStore';

interface BasicInfoFormProps {
  value: ObInfo;
  onChange: (patch: Partial<ObInfo>) => void;
}

// README 2단계: 이름 / 성별 3분할 / 나이·키·몸무게 3열 숫자 입력.
// 라벨은 네 항목 모두에 붙인다. 성별만 라벨이 없으면 한 줄 건너뛴 것처럼 보였다.
export default function BasicInfoForm({ value, onChange }: BasicInfoFormProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.root}>
      <Field label="이름">
        <TextField
          onBackground
          clearable
          value={value.name}
          onChangeText={(t) => onChange({ name: t })}
          placeholder="피또가 부를 이름"
          maxLength={20}
        />
      </Field>

      <Field label="성별">
        <View style={styles.row}>
          {GENDERS.map((g) => (
            <SelectChip
              key={g.code}
              label={g.label}
              selected={value.gender === g.code}
              onPress={() => onChange({ gender: g.code })}
              size="field"
              fill
              onBackground
            />
          ))}
        </View>
      </Field>

      <View style={styles.row}>
        <Field label="나이" style={styles.col}>
          <TextField
            onBackground
            value={value.age}
            onChangeText={(t) => onChange({ age: t.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            center
          />
        </Field>
        <Field label="키 (cm)" style={styles.col}>
          <TextField
            onBackground
            value={value.height}
            onChangeText={(t) => onChange({ height: t.replace(/[^0-9.]/g, '') })}
            keyboardType="numeric"
            center
          />
        </Field>
        <Field label="몸무게 (kg)" style={styles.col}>
          <TextField
            onBackground
            value={value.weight}
            onChangeText={(t) => onChange({ weight: t.replace(/[^0-9.]/g, '') })}
            keyboardType="numeric"
            center
          />
        </Field>
      </View>

      <Text style={[styles.notice, { color: colors.textSecondary }]}>
        입력한 정보는 기기에만 저장되고 언제든 프로필에서 수정할 수 있어요.
      </Text>
    </View>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.field, style]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  fieldLabel: typography.label,
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  col: {
    flex: 1,
  },
  notice: {
    ...typography.bodySm,
    marginTop: 2,
  },
});
