import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import TextField from '../../components/TextField';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { alpha, brand, radius, selection, typography, weight } from '../../theme/tokens';
import { useToastStore } from '../../store/useToastStore';
import type { TagOption } from '../../constants/codes';
import type { TagSelection } from '../../store/useAppStore';

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
 * README "태그 + 직접 입력 단계 구조" (건강 상태·식단 취향·못 먹는 음식 공통).
 * 2열 태그 그리드 → 직접 입력 + 추가 → 선택 칩(× 제거) → 없음 링크.
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
  const { colors, mode } = useTheme();
  const showToast = useToastStore((s) => s.show);
  const [draft, setDraft] = useState('');

  const addCustom = () => {
    const input = draft.trim();
    if (!input) {
      showToast('내용을 입력해 주세요');
      return;
    }
    // 목록에 있는 걸 직접 적었으면 그 태그를 켜준다. 같은 뜻이 코드와 문자열로 둘 다 남지 않게.
    const known = tags.find((t) => t.label === input);
    if (known) {
      if (!value.codes.includes(known.code)) onToggle(known.code);
      else showToast('이미 선택했어요');
      setDraft('');
      return;
    }
    if (value.custom.includes(input)) {
      showToast('이미 선택했어요');
      return;
    }
    onToggleCustom(input);
    setDraft('');
  };

  return (
    <View>
      <View style={styles.grid}>
        {tags.map((tag) => {
          const on = value.codes.includes(tag.code);
          return (
            <Pressable
              key={tag.code}
              onPress={() => onToggle(tag.code)}
              style={styles.gridSlot}
              // 여러 개를 고를 수 있는 태그라 checkbox로 알린다.
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={tag.label}
            >
              <View style={[on && styles.tagShadow]}>
                <BlurView
                  intensity={20}
                  tint={mode === 'dark' ? 'dark' : 'light'}
                  style={[styles.tag, { borderColor: on ? colors.borderSelected : colors.borderInput }]}
                >
                  <View style={[styles.tagInner, { backgroundColor: on ? selection.bg : colors.surface }]}>
                    <Text style={[styles.tagText, { color: colors.textPrimary }, weight(on ? 700 : 500)]} numberOfLines={1}>
                      {tag.label}
                    </Text>
                  </View>
                </BlurView>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>직접 입력</Text>
      <View style={styles.inputRow}>
        <TextField
          onBackground
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addCustom}
          placeholder={placeholder}
          returnKeyType="done"
          // 서버가 받는 직접 입력 태그 길이와 같은 값. 넘기면 동기화 때 거절당한다.
          maxLength={20}
          style={styles.input}
        />
        {/* 화면의 주요 액션은 하단 "다음"이다. 여기까지 그라데이션을 쓰면 CTA가 둘로 보여서 아웃라인으로 낮췄다. */}
        <Pressable
          onPress={addCustom}
          style={[styles.addBtn, { borderColor: colors.borderInput, backgroundColor: colors.surfaceSolid }]}
          accessibilityRole="button"
        >
          <Text style={[styles.addLabel, { color: colors.textPrimary }]}>추가</Text>
        </Pressable>
      </View>

      {/* 그리드에 있는 태그는 위에서 이미 선택 표시가 되므로 여기에는 직접 적은 값만 나열한다. */}
      {value.custom.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>직접 입력한 항목</Text>
          <View style={styles.chipWrap}>
            {value.custom.map((item) => (
              <Pressable
                key={item}
                onPress={() => onToggleCustom(item)}
                style={[styles.chip, { backgroundColor: selection.bg, borderColor: colors.borderSelected }]}
                accessibilityRole="button"
                accessibilityLabel={`${item} 지우기`}
                hitSlop={{ top: 6, bottom: 6 }}
              >
                <Text style={[styles.chipText, { color: colors.textPrimary }]}>{item}</Text>
                <Icon name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Pressable onPress={onClear} style={styles.noneWrap}>
        <Text style={[styles.noneText, { color: colors.textSecondary }]}>{noneLabel}</Text>
      </Pressable>
    </View>
  );
}

const GAP = 9;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -GAP / 2,
  },
  gridSlot: {
    width: '50%',
    paddingHorizontal: GAP / 2,
    paddingBottom: GAP,
  },
  tagShadow: {
    shadowColor: alpha(brand.blue, 0.22),
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
    borderRadius: 14,
  },
  tag: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tagInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  tagText: typography.input,
  sectionLabel: {
    ...typography.label,
    marginTop: 12,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
  },
  addBtn: {
    width: 66,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: typography.buttonLabelSm,
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 34,
    borderRadius: radius.chip,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: typography.unit,
  noneWrap: {
    // 이 단계를 건너뛰는 유일한 방법이라 글자 높이만큼만 눌리면 안 된다.
    marginTop: 8,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  noneText: {
    ...typography.body,
    textDecorationLine: 'underline',
  },
});
