import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import PrimaryButton from '../../components/PrimaryButton';
import OptionRow from '../onboarding/OptionRow';
import TagPicker from '../onboarding/TagPicker';
import { useTheme } from '../../theme/useTheme';
import { weight } from '../../theme/tokens';
import type { TagOption } from '../../constants/codes';
import type { TagSelection } from '../../store/useAppStore';

interface ChoiceSheetProps<T extends string> {
  visible: boolean;
  title: string;
  options: readonly { code: T; label: string; desc?: string }[];
  value: T | null;
  onSave: (value: T) => void;
  onClose: () => void;
}

/**
 * 하나를 고르는 목록 시트(시안 17-1). 줄 모양은 온보딩과 같은 OptionRow.
 * 고르는 즉시 저장하지 않고 "저장"에서 반영한다 — 목표가 바뀌면 목표 칼로리가 다시 계산돼서,
 * 훑어보며 눌러보는 동안 숫자가 따라 움직이면 혼란스럽다.
 */
export function ChoiceSheet<T extends string>({ visible, title, options, value, onSave, onClose }: ChoiceSheetProps<T>) {
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
        {options.map((o, i) => (
          <OptionRow
            key={o.code}
            title={o.label}
            desc={o.desc}
            selected={draft === o.code}
            onPress={() => setDraft(o.code)}
            divider={i > 0}
          />
        ))}
      </View>
    </BottomSheet>
  );
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

/** 여러 개를 고르는 칩 시트(시안 17-2). 안쪽은 온보딩과 같은 TagPicker, 여기서는 "저장"을 누를 때 반영한다. */
export function TagSheet({ visible, title, tags, value, placeholder, onSave, onClose }: TagSheetProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<TagSelection>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const toggle = (list: string[], item: string) =>
    list.includes(item) ? list.filter((v) => v !== item) : [...list, item];

  return (
    <BottomSheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={
        <PrimaryButton
          label="저장"
          onPress={() => {
            onSave(draft);
            onClose();
          }}
        />
      }
    >
      <Text style={[styles.hint, { color: colors.textSecondary }]}>여러 개 고를 수 있어요.</Text>
      <TagPicker
        tags={tags}
        value={draft}
        onToggle={(code) => setDraft((d) => ({ ...d, codes: toggle(d.codes, code) }))}
        onToggleCustom={(item) => setDraft((d) => ({ ...d, custom: toggle(d.custom, item) }))}
        onClear={() => setDraft({ codes: [], custom: [] })}
        placeholder={placeholder}
        noneLabel="해당사항 없음"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 13,
    ...weight(400),
    lineHeight: 13 * 1.5,
    marginTop: -2,
    marginBottom: 10,
  },
});
