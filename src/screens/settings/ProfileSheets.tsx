import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Platform, StyleSheet, type TextStyle } from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import PrimaryButton from '../../components/PrimaryButton';
import SelectChip from '../../components/SelectChip';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { brand, typography, weight } from '../../theme/tokens';
import { useToastStore } from '../../store/useToastStore';
import type { TagOption } from '../../constants/codes';
import type { TagSelection } from '../../store/useAppStore';

const noWebOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

interface ChoiceSheetProps<T extends string> {
  visible: boolean;
  title: string;
  options: readonly { code: T; label: string; desc?: string }[];
  value: T | null;
  onSave: (value: T) => void;
  onClose: () => void;
}

/**
 * 하나를 고르는 목록 시트(시안 17-1). 줄마다 이름·설명과 오른쪽 동그라미.
 * 고르는 즉시 저장하지 않고 "저장"에서 반영한다 — 목표가 바뀌면 목표 칼로리가 다시 계산돼서,
 * 훑어보며 눌러보는 동안 숫자가 따라 움직이면 혼란스럽다.
 */
export function ChoiceSheet<T extends string>({ visible, title, options, value, onSave, onClose }: ChoiceSheetProps<T>) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<T | null>(value);
  // 열 때마다 지금 값에서 시작한다. 저장 안 하고 닫았다 다시 열면 고르던 게 남아 있으면 안 된다.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  return (
    <BottomSheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={
        <PrimaryButton
          label="저장"
          disabled={draft == null}
          onPress={() => {
            if (draft != null) onSave(draft);
            onClose();
          }}
        />
      }
    >
      <View accessibilityRole="radiogroup">
        {options.map((o, i) => {
          const on = draft === o.code;
          return (
            <Pressable
              key={o.code}
              onPress={() => setDraft(o.code)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.desc ? `${o.label}, ${o.desc}` : o.label}
              style={({ pressed }) => [
                styles.choiceRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDivider },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={styles.choiceText}>
                <Text style={[styles.choiceLabel, { color: colors.textPrimary }, on && weight(700)]}>{o.label}</Text>
                {!!o.desc && <Text style={[styles.choiceDesc, { color: colors.textSecondary }]}>{o.desc}</Text>}
              </View>
              <RadioMark on={on} />
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

/** 목록형 단일 선택 표시. 안 고름은 빈 원, 고름은 파란 원 + 진한 체크(시안 규칙). 색만이 아니라 체크 모양으로도 구분된다. */
function RadioMark({ on }: { on: boolean }) {
  const { colors } = useTheme();
  if (on) {
    return (
      <View style={[styles.mark, { backgroundColor: brand.blue }]}>
        <Icon name="check" size={16} color={colors.textOnPrimary} strokeWidth={2.4} />
      </View>
    );
  }
  return <View style={[styles.mark, styles.markOff, { borderColor: colors.borderInput }]} />;
}

interface TagSheetProps {
  visible: boolean;
  title: string;
  tags: readonly TagOption[];
  value: TagSelection;
  placeholder: string;
  onSave: (value: TagSelection) => void;
  onClose: () => void;
}

/**
 * 여러 개를 고르는 칩 시트(시안 17-2). 목록 칩 + 직접 입력 + "해당사항 없음".
 * 직접 적은 항목은 목록 칩 뒤에 골라진 칩으로 붙고, 누르면 빠진다.
 */
export function TagSheet({ visible, title, tags, value, placeholder, onSave, onClose }: TagSheetProps) {
  const { colors } = useTheme();
  const showToast = useToastStore((s) => s.show);
  const [codes, setCodes] = useState<string[]>(value.codes);
  const [custom, setCustom] = useState<string[]>(value.custom);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible) return;
    setCodes(value.codes);
    setCustom(value.custom);
    setDraft('');
  }, [visible, value]);

  const toggle = (list: string[], item: string) =>
    list.includes(item) ? list.filter((v) => v !== item) : [...list, item];

  const addCustom = () => {
    const input = draft.trim();
    if (!input) return;
    // 목록에 있는 걸 직접 적었으면 그 칩을 켠다. 같은 뜻이 코드와 글자로 둘 다 남지 않게.
    const known = tags.find((t) => t.label === input);
    if (known) {
      if (!codes.includes(known.code)) setCodes((c) => [...c, known.code]);
      else showToast('이미 골랐어요');
    } else if (custom.includes(input)) {
      showToast('이미 골랐어요');
    } else {
      setCustom((c) => [...c, input]);
    }
    setDraft('');
  };

  const ready = draft.trim().length > 0;

  return (
    <BottomSheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={
        <PrimaryButton
          label="저장"
          onPress={() => {
            onSave({ codes, custom });
            onClose();
          }}
        />
      }
    >
      <Text style={[styles.hint, { color: colors.textSecondary }]}>여러 개 고를 수 있어요.</Text>
      <View style={styles.chipWrap}>
        {tags.map((t) => (
          <SelectChip
            key={t.code}
            label={t.label}
            selected={codes.includes(t.code)}
            onPress={() => setCodes((c) => toggle(c, t.code))}
          />
        ))}
        {custom.map((c) => (
          <SelectChip
            key={`custom-${c}`}
            label={c}
            selected
            onPress={() => setCustom((list) => toggle(list, c))}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>직접 입력</Text>
      {/* 입력 | 지우기 × | 추가 를 한 칸 안에(시안 17-2). 칸 밖에 버튼을 두면 칠한 버튼이 둘로 보인다. */}
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
          accessibilityLabel={`${title} 직접 입력`}
          style={[styles.input, { color: colors.textPrimary }, noWebOutline]}
        />
        {ready && (
          <Pressable
            onPress={() => setDraft('')}
            accessibilityRole="button"
            accessibilityLabel="입력 지우기"
            style={styles.clearBtn}
          >
            <Icon name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
        <View style={[styles.inputDivider, { backgroundColor: colors.fillStrong }]} />
        <Pressable
          onPress={addCustom}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          style={styles.addBtn}
        >
          <Text style={[styles.addLabel, { color: ready ? colors.textAccent : colors.textPlaceholder }]}>추가</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          setCodes([]);
          setCustom([]);
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.noneBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.noneLabel, { color: colors.textSecondary }]}>해당사항 없음</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // 시안 17-1: 줄은 시트 안에서 한 번 더 들여(18) 목록이 제목보다 안쪽에 선다.
  choiceRow: {
    minHeight: 64,
    marginHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choiceText: {
    flex: 1,
  },
  choiceLabel: {
    fontSize: 15,
    ...weight(600),
  },
  choiceDesc: {
    fontSize: 12,
    marginTop: 3,
  },
  mark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOff: {
    borderWidth: 1.5,
  },
  hint: {
    fontSize: 13,
    ...weight(400),
    lineHeight: 13 * 1.5,
    marginTop: -2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
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
  noneBtn: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  noneLabel: {
    fontSize: 14,
    ...weight(600),
  },
});
