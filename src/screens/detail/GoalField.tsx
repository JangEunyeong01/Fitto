import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';

interface GoalFieldProps {
  title: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onCommit: (value: number) => void;
}

// README: 목표량 직접 설정. 입력 중엔 자유롭게 두고, 포커스를 벗어날 때 범위로 clamp해 커밋한다.
// 시안 07: 칸은 140 폭으로 고정하고 단위를 바로 옆에 붙인다. 카드 전체로 늘리면 네 자리 숫자에 너무 길다.
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
          accessibilityLabel={title}
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
  title: typography.cardTitle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  input: {
    width: 140,
  },
  unit: {
    fontSize: 14,
    ...weight(600),
  },
  range: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    marginTop: 8,
  },
});
