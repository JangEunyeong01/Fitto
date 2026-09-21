import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import SelectChip from '../../components/SelectChip';
import TextField from '../../components/TextField';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';

const PRESETS = [100, 200, 250, 330, 500];

interface CupSizeFieldProps {
  value: number;
  onChange: (ml: number) => void;
}

// README: 컵 100/200/250/330/500ml 칩 + 직접 입력.
export default function CupSizeField({ value, onChange }: CupSizeFieldProps) {
  const { colors } = useTheme();
  const isCustom = !PRESETS.includes(value);
  const [showCustom, setShowCustom] = useState(isCustom);
  const [draft, setDraft] = useState(isCustom ? String(value) : '');

  const commitCustom = () => {
    const n = parseInt(draft.replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(n) && n > 0) onChange(Math.min(2000, n));
  };

  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>1회 컵 용량</Text>
      <View style={styles.chipRow}>
        {PRESETS.map((size) => (
          <SelectChip
            key={size}
            label={`${size}ml`}
            selected={!showCustom && value === size}
            onPress={() => {
              setShowCustom(false);
              onChange(size);
            }}
          />
        ))}
        <SelectChip label="직접 입력" selected={showCustom} onPress={() => setShowCustom(true)} />
      </View>

      {showCustom && (
        <View style={styles.customRow}>
          <TextField
            size="sm"
            value={draft}
            onChangeText={(t) => setDraft(t.replace(/[^0-9]/g, ''))}
            placeholder={`현재 ${value}ml`}
            keyboardType="numeric"
            style={styles.input}
          />
          <PrimaryButton small label="설정" onPress={commitCustom} style={styles.setBtn} />
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  title: typography.sectionTitle,
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  input: {
    flex: 1,
  },
  setBtn: {
    width: 72,
  },
});
