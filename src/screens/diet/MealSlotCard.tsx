import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import Icon from '../../components/Icon';
import TextField from '../../components/TextField';
import { useTheme } from '../../theme/useTheme';
import { useAppStore, type MealItem, type MealSlot } from '../../store/useAppStore';
import { formatAmount, slotLabel } from '../../utils/meal';
import { typography } from '../../theme/tokens';

interface MealSlotCardProps {
  /** 이 카드가 보여주는 날짜(dateKey). 식단 탭에서 날짜를 넘기면 삭제·메모도 그 날 기록에 한다. */
  date: string;
  slot: MealSlot;
  items: MealItem[];
  memo?: string;
  onAdd: (slot: MealSlot) => void;
}

// README: 카드마다 제목 + 합계 kcal, 항목 행(이름 / 양 / kcal), 비어 있으면 점선 `+ {슬롯} 추가`.
// 명세 F-022: 항목 ✕ 삭제, 카드 오른쪽 위 + 로 이 끼니에 음식 추가, 끼니별 메모.
export default function MealSlotCard({ date, slot, items, memo, onAdd }: MealSlotCardProps) {
  const { colors } = useTheme();
  const removeMealItem = useAppStore((s) => s.removeMealItem);
  const setMealMemo = useAppStore((s) => s.setMealMemo);
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

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{label}</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.total, { color: colors.textSecondary }]}>{total.toLocaleString()} kcal</Text>
          <Pressable
            onPress={() => onAdd(slot)}
            hitSlop={8}
            style={[styles.plusBtn, { borderColor: colors.borderDivider }]}
            accessibilityRole="button"
            accessibilityLabel={`${label}에 음식 추가`}
          >
            <Icon name="plus" size={14} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {items.length === 0 ? (
        <Pressable onPress={() => onAdd(slot)} style={[styles.emptyBtn, { borderColor: colors.borderDivider }]}>
          <Text style={[styles.emptyLabel, { color: colors.textSecondary }]}>+ {label} 추가</Text>
        </Pressable>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.itemAmount, { color: colors.textSecondary }]}>{formatAmount(item)}</Text>
              <Text style={[styles.itemKcal, { color: colors.textPrimary }]}>{item.kcal}</Text>
              <Pressable
                onPress={() => removeMealItem(date, slot, item.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} 삭제`}
              >
                <Icon name="close" size={15} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <TextField
        size="sm"
        clearable
        value={draft}
        onChangeText={setDraft}
        onEndEditing={commitMemo}
        onBlur={commitMemo}
        placeholder="메모 추가"
        maxLength={80}
        style={styles.memo}
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
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: typography.sectionTitle,
  total: typography.label,
  plusBtn: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtn: {
    marginTop: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: typography.unit,
  list: {
    marginTop: 10,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    ...typography.rowLabel,
    flex: 1,
  },
  itemAmount: typography.caption,
  itemKcal: {
    ...typography.value,
    minWidth: 34,
    textAlign: 'right',
  },
  memo: {
    marginTop: 12,
  },
});
