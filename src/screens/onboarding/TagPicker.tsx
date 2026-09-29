import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Platform, StyleSheet, type TextStyle } from 'react-native';
import SelectChip from '../../components/SelectChip';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useToastStore } from '../../store/useToastStore';
import type { TagOption } from '../../constants/codes';
import type { TagSelection } from '../../store/useAppStore';

const noWebOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

interface TagPickerProps {
  tags: readonly TagOption[];
  /** 목록에서 고른 코드와 직접 입력한 문자열. 저장 형식이 달라 따로 받는다. */
  value: TagSelection;
  /** 최신 상태 기준으로 토글하도록 값 하나만 넘긴다(연속 선택 시 덮어쓰기 방지). */
  onToggle: (code: string) => void;
  onToggleCustom: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  noneLabel: string;
}

/**
 * 여러 개를 고르는 태그(시안 17-2·30). 목록 칩 + 직접 입력 + "해당사항 없음".
 * 온보딩(건강 상태·식단 취향·못 먹는 음식)과 프로필 시트가 같이 쓴다.
 *
 * 직접 적은 항목은 목록 칩 뒤에 골라진 칩으로 붙고, 누르면 빠진다.
 * 입력칸은 "입력 | 지우기 × | 추가"를 한 칸 안에 둔다 — 칸 밖에 버튼을 두면 화면 아래 "다음"과 칠한 버튼이 둘로 보인다.
 */
export default function TagPicker({
  tags,
  value,
  onToggle,
  onToggleCustom,
  onClear,
  placeholder,
  noneLabel,
}: TagPickerProps) {
  const { colors } = useTheme();
  const showToast = useToastStore((s) => s.show);
  const [draft, setDraft] = useState('');
  const ready = draft.trim().length > 0;

  const addCustom = () => {
    const input = draft.trim();
    if (!input) return;
    // 목록에 있는 걸 직접 적었으면 그 칩을 켠다. 같은 뜻이 코드와 글자로 둘 다 남지 않게.
    const known = tags.find((t) => t.label === input);
    if (known) {
      if (!value.codes.includes(known.code)) onToggle(known.code);
      else showToast('이미 골랐어요');
    } else if (value.custom.includes(input)) {
      showToast('이미 골랐어요');
    } else {
      onToggleCustom(input);
    }
    setDraft('');
  };

  return (
    <View>
      <View style={styles.chipWrap}>
        {tags.map((t) => (
          <SelectChip key={t.code} label={t.label} selected={value.codes.includes(t.code)} onPress={() => onToggle(t.code)} />
        ))}
        {value.custom.map((c) => (
          <SelectChip key={`custom-${c}`} label={c} selected onPress={() => onToggleCustom(c)} />
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>직접 입력</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.fillMuted }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addCustom}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          returnKeyType="done"
          // 서버가 받는 직접 입력 태그 길이와 같은 값. 넘기면 동기화 때 거절당한다.
          maxLength={20}
          accessibilityLabel={placeholder}
          style={[styles.input, { color: colors.textPrimary }, noWebOutline]}
        />
        {ready && (
          <Pressable onPress={() => setDraft('')} accessibilityRole="button" accessibilityLabel="입력 지우기" style={styles.clearBtn}>
            <Icon name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
        <View style={[styles.inputDivider, { backgroundColor: colors.fillStrong }]} />
        <Pressable onPress={addCustom} accessibilityRole="button" accessibilityState={{ disabled: !ready }} style={styles.addBtn}>
          <Text style={[styles.addLabel, { color: ready ? colors.textAccent : colors.textPlaceholder }]}>추가</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        style={({ pressed }) => [styles.noneBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.noneLabel, { color: colors.textSecondary }]}>{noneLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    ...typography.label,
    marginTop: 14,
    marginBottom: 6,
  },
  inputRow: {
    height: 48,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    fontSize: 15,
    padding: 0,
  },
  clearBtn: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputDivider: {
    width: 1,
    height: 18,
    marginLeft: 8,
  },
  addBtn: {
    height: 44,
    marginRight: -4,
    paddingLeft: 12,
    paddingRight: 4,
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 15,
    ...weight(700),
  },
  // 이 단계를 건너뛰는 유일한 방법이라 글자 높이만큼만 눌리면 안 된다.
  noneBtn: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 8,
  },
  noneLabel: {
    fontSize: 14,
    ...weight(600),
  },
});
