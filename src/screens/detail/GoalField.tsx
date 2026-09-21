import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';

interface GoalFieldProps {
  title: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onCommit: (value: number) => void;
}

// README: 목표량 직접 설정. 입력 중엔 자유롭게 두고, 포커스를 벗어날 때 범위로 clamp해 커밋한다.
export default function GoalField({ title, value, min, max, unit, onCommit }: GoalFieldProps) {
  const { colors } = useTheme();
  const [text, setText] = useState(String(value));

  // 스토어의 목표값이 외부에서 바뀌면(예: 온보딩 재실행) 입력값도 따라간다.
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
    const clamped = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value;
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <View style={styles.row}>
        <TextField
          value={text}
          onChangeText={(t) => setText(t.replace(/[^0-9]/g, ''))}
          onEndEditing={commit}
          onBlur={commit}
          keyboardType="numeric"
          style={styles.input}
        />
        <Text style={[styles.unit, { color: colors.textSecondary }]}>{unit}</Text>
      </View>
      <Text style={[styles.range, { color: colors.textSecondary }]}>
        {min.toLocaleString()} ~ {max.toLocaleString()}
        {unit} 사이로 설정할 수 있어요.
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  title: typography.sectionTitle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  input: {
    // 목표 숫자는 이 카드의 주인공이라 입력 안 글자만 크게 쓴다.
    ...typography.buttonLabel,
    flex: 1,
  },
  unit: typography.rowLabel,
  range: {
    ...typography.caption,
    marginTop: 8,
  },
});
