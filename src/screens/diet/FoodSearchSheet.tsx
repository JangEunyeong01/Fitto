import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../../components/Badge';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { alpha, brand, overlay, radius, selection, typography } from '../../theme/tokens';
import { FOODS, findAllergyHit, type Food } from '../../data/foods';
import { useAppStore } from '../../store/useAppStore';
import { useFoodSearchStore } from '../../store/useFoodSearchStore';
import { useToastStore } from '../../store/useToastStore';
import { dateKey } from '../../utils/timeOfDay';

/**
 * README 4장 "음식 검색 바텀시트".
 * 알레르기 판정은 온보딩에서 받은 못 먹는 음식(profile.allergies) 기준으로 한다.
 * 추가 시 저녁이 비어 있으면 저녁, 아니면 간식으로 들어간다.
 */
export default function FoodSearchSheet() {
  const { open, hide, recent, addRecent, date: targetDate } = useFoodSearchStore();
  const { colors, radius: r, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  // 식단 탭에서 지난 날짜를 보다가 열었으면 그 날에, 빠른 기록처럼 날짜 없이 열었으면 오늘에 넣는다.
  const date = targetDate ?? dateKey();
  const avoid = useAppStore((s) => s.profile.allergies);
  const addMealItem = useAppStore((s) => s.addMealItem);
  const record = useAppStore((s) => s.dailyRecords[date]);
  const showToast = useToastStore((s) => s.show);

  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return FOODS;
    return FOODS.filter((f) => f.name.includes(q));
  }, [query]);

  const handleAdd = (food: Food) => {
    const hit = findAllergyHit(food, avoid);
    if (hit) {
      showToast('알레르기 성분이 포함된 음식이에요');
      return;
    }
    const slot = (record?.meals.저녁.length ?? 0) === 0 ? '저녁' : '간식';
    addMealItem(date, slot, {
      id: `${food.id}-${Date.now()}`,
      name: food.name,
      amount: food.amount,
      kcal: food.kcal,
    });
    addRecent(food.name);
    showToast('기록에 추가했어요');
  };

  if (!open) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={[styles.backdrop, { backgroundColor: overlay.sheetBackdrop }]} onPress={hide} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.solid,
            paddingHorizontal: spacing.screenX,
            paddingBottom: insets.bottom + 16,
            borderTopLeftRadius: r.sheetTop,
            borderTopRightRadius: r.sheetTop,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.line }]} />

        <View style={[styles.searchRow, { borderColor: colors.stroke, backgroundColor: colors.card }]}>
          <Icon name="search" size={17} color={colors.sub} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="음식 이름을 검색하세요"
            placeholderTextColor={colors.sub}
            style={[styles.searchInput, { color: colors.txt }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} style={[styles.clearBtn, { backgroundColor: colors.ink }]}>
              <Icon name="close" size={13} color={colors.sub} />
            </Pressable>
          )}
        </View>

        {recent.length > 0 && (
          <View style={styles.recentRow}>
            {recent.map((k) => (
              <Pressable
                key={k}
                onPress={() => setQuery(k)}
                style={[styles.recentChip, { borderColor: colors.line, backgroundColor: colors.card2 }]}
              >
                <Text style={[styles.recentText, { color: colors.sub }]}>{k}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {results.length === 0 && (
            <Text style={[styles.empty, { color: colors.sub }]}>검색 결과가 없어요.</Text>
          )}
          {results.map((food) => {
            const hit = findAllergyHit(food, avoid);
            return (
              <View
                key={food.id}
                style={[
                  styles.row,
                  { borderColor: colors.line },
                  hit && { backgroundColor: alpha(brand.peach, 0.14), opacity: 0.75 },
                ]}
              >
                <View style={styles.rowText}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.txt }]}>{food.name}</Text>
                    <Badge
                      label={hit ? hit : '가능'}
                      color={hit ? alpha(brand.peach, 0.28) : alpha(brand.mint, 0.28)}
                      textColor={colors.txt}
                    />
                  </View>
                  <Text style={[styles.meta, { color: colors.sub }]}>
                    {food.amount}
                    {food.note ? ` · ${food.note}` : ''}
                  </Text>
                </View>
                <Text style={[styles.kcal, { color: colors.txt }]}>{food.kcal}</Text>
                <Pressable
                  onPress={() => handleAdd(food)}
                  style={[
                    styles.addBtn,
                    hit
                      ? { backgroundColor: colors.ink }
                      : { backgroundColor: selection.bg, borderColor: selection.border, borderWidth: 1 },
                  ]}
                >
                  <Text style={[styles.addLabel, { color: hit ? colors.sub : colors.txt }]}>
                    {hit ? '제외' : '추가'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 940,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '82%',
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    ...typography.input,
    flex: 1,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  recentChip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.chip,
    borderWidth: 1,
    justifyContent: 'center',
  },
  recentText: typography.label,
  results: {
    marginTop: 12,
  },
  empty: {
    ...typography.body,
    paddingVertical: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: typography.rowLabel,
  meta: typography.caption,
  kcal: typography.sectionTitle,
  addBtn: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: typography.value,
});
