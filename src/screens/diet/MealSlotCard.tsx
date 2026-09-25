import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Platform, StyleSheet, type TextStyle } from 'react-native';
import GlassCard from '../../components/GlassCard';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { useAppStore, type MealItem, type MealSlot } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { formatAmount, slotLabel } from '../../utils/meal';
import { typography, weight } from '../../theme/tokens';

interface MealSlotCardProps {
  /** 이 카드가 보여주는 날짜(dateKey). 식단 탭에서 날짜를 넘기면 삭제·메모도 그 날 기록에 한다. */
  date: string;
  slot: MealSlot;
  items: MealItem[];
  memo?: string;
  onAdd: (slot: MealSlot) => void;
}

/**
 * 기록된 끼니 한 장(시안 04). 비어 있는 끼니는 카드로 만들지 않는다 — 식단 화면이 "다른 끼니" 한 줄로 모은다(시안 규칙 11).
 *
 * 명세 F-022: 항목 ✕ 삭제, 오른쪽 위 + 로 이 끼니에 음식 추가, 끼니별 메모.
 * 삭제는 묻지 않고 바로 지우고 토스트에서 되살린다(시안 규칙 24).
 */
export default function MealSlotCard({ date, slot, items, memo, onAdd }: MealSlotCardProps) {
  const { colors } = useTheme();
  const addMealItem = useAppStore((s) => s.addMealItem);
  const removeMealItem = useAppStore((s) => s.removeMealItem);
  const setMealMemo = useAppStore((s) => s.setMealMemo);
  const showToast = useToastStore((s) => s.show);
  const total = items.reduce((a, i) => a + i.kcal, 0);

  const label = slotLabel(slot);

  const [draft, setDraft] = useState(memo ?? '');
  // 날짜를 넘기면 같은 카드가 다른 날 메모를 보여줘야 해서, 저장된 값이 바뀌면 입력칸도 맞춘다.
  useEffect(() => {
    setDraft(memo ?? '');
  }, [memo, date]);
  const commitMemo = () => {
    if (draft.trim() !== (memo ?? '')) setMealMemo(date, slot, draft);
  };

  const remove = (item: MealItem) => {
    removeMealItem(date, slot, item.id);
    showToast(`${item.name} 기록을 지웠어요`, {
      label: '실행 취소',
      onPress: () => addMealItem(date, slot, item),
    });
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{label}</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.total, { color: colors.textSecondary }]}>{total.toLocaleString()} kcal</Text>
          <Pressable
            onPress={() => onAdd(slot)}
            // 상자 없이 + 만. 보이는 36에 사방 4씩 더해 누르는 영역 44.
            hitSlop={4}
            style={styles.plusBtn}
            accessibilityRole="button"
            accessibilityLabel={`${label}에 음식 추가`}
          >
            <Icon name="plus" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.itemAmount, { color: colors.textSecondary }]}>{formatAmount(item)}</Text>
            <Text style={[styles.itemKcal, { color: colors.textPrimary }]}>{item.kcal}</Text>
            <Pressable
              onPress={() => remove(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} 삭제`}
              style={styles.removeBtn}
            >
              <Icon name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* 메모는 칸 없이 얇은 선 아래 한 줄로. 쓰는 사람이 적어서 입력칸이 카드마다 떠 있으면 무겁다. */}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onEndEditing={commitMemo}
        onBlur={commitMemo}
        placeholder="메모 추가"
        placeholderTextColor={colors.textPlaceholder}
        maxLength={80}
        accessibilityLabel={`${label} 메모`}
        style={[
          styles.memo,
          { color: colors.textPrimary, borderTopColor: colors.borderDivider },
          // 웹 브라우저 기본 포커스 테두리를 끈다(입력칸과 같은 처리).
          Platform.OS === 'web' && ({ outlineStyle: 'none' } as unknown as TextStyle),
        ]}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 22,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: typography.cardTitle,
  total: typography.unit,
  plusBtn: {
    width: 36,
    height: 36,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    marginTop: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  itemName: {
    fontSize: 14,
    ...weight(600),
    flex: 1,
  },
  itemAmount: {
    fontSize: 13,
    ...weight(400),
  },
  itemKcal: {
    fontSize: 14,
    ...weight(600),
    minWidth: 40,
    textAlign: 'right',
  },
  removeBtn: {
    width: 44,
    height: 44,
    marginRight: -14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memo: {
    ...typography.bodySm,
    marginTop: 8,
    height: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
  },
});
