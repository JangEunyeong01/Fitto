import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../../components/Badge';
import HighlightText from '../../components/HighlightText';
import Icon from '../../components/Icon';
import SelectChip from '../../components/SelectChip';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import { useTheme } from '../../theme/useTheme';
import { alpha, brand, overlay, radius, selection, typography } from '../../theme/tokens';
import { FOODS, findAllergyHit, gramsPerServing, type Food } from '../../data/foods';
import { useAppStore, type MealSlot } from '../../store/useAppStore';
import { AVOID_TAGS, DISEASE_TAGS, MEAL_SLOTS, labelOf, type MealUnit } from '../../constants/codes';
import { newId } from '../../utils/id';
import { cautionReason, findCautionHit } from '../../utils/foodCaution';
import { slotLabel } from '../../utils/meal';
import { useFoodSearchStore } from '../../store/useFoodSearchStore';
import { useToastStore } from '../../store/useToastStore';
import { dateKey } from '../../utils/timeOfDay';
import { searchByName } from '../../utils/hangul';

const MAX_SERVINGS = 10;
const MAX_GRAMS = 2000;

/** 끼니를 정하지 않고 열었을 때 기본값. 지금 시각에 가장 가까운 식사로 둔다. */
function guessSlot(now = new Date()): MealSlot {
  const h = now.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 15) return 'lunch';
  if (h >= 17 && h < 21) return 'dinner';
  return 'snack';
}

/**
 * README 4장 "음식 검색 바텀시트" + 명세 F-023: 검색 → 양 입력 → 칼로리 자동 계산 → 저장.
 * 알레르기 판정은 온보딩에서 받은 못 먹는 음식(profile.allergies) 기준으로 한다.
 */
export default function FoodSearchSheet() {
  const open = useFoodSearchStore((s) => s.open);
  if (!open) return null;
  // 폼을 따로 두어 닫힐 때 언마운트시킨다. 명세의 "닫으면 입력값 초기화"가 이걸로 해결된다.
  return <FoodSearchForm />;
}

function FoodSearchForm() {
  const { hide, recent, addRecent, date: targetDate, slot: targetSlot } = useFoodSearchStore();
  const { colors, radius: r, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  // 식단 탭에서 지난 날짜를 보다가 열었으면 그 날에, 빠른 기록처럼 날짜 없이 열었으면 오늘에 넣는다.
  const date = targetDate ?? dateKey();
  const avoid = useAppStore((s) => s.profile.allergies);
  const conditions = useAppStore((s) => s.profile.conditions);
  const addMealItem = useAppStore((s) => s.addMealItem);
  const showToast = useToastStore((s) => s.show);

  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [slot, setSlot] = useState<MealSlot>(targetSlot ?? guessSlot());
  const [unit, setUnit] = useState<MealUnit>('serving');
  const [amount, setAmount] = useState('1');

  // 초성으로도 찾는다("ㄱㅊ" → 곱창구이). 걸린 자리를 같이 받아 그 글자만 색을 입힌다.
  const results = useMemo(() => searchByName(FOODS, query, (f) => f.name), [query]);

  const pick = (food: Food) => {
    if (findAllergyHit(food, avoid)) {
      showToast('알레르기 성분이 포함된 음식이에요');
      return;
    }
    // 질환 주의는 막지 않고 알려만 준다(명세 F-023). 먹을지 말지는 사용자가 정한다.
    const caution = findCautionHit(food, conditions);
    if (caution) showToast(`${labelOf(DISEASE_TAGS, caution)} 주의 · ${cautionReason(caution)}`);
    setPicked(food);
    setUnit('serving');
    setAmount('1');
  };

  // 명세 F-024: 최근 음식을 누르면 그 음식 기본값으로 바로 양 입력 단계로 간다.
  const pickRecent = (name: string) => {
    const food = FOODS.find((f) => f.name === name);
    if (food) pick(food);
    else setQuery(name);
  };

  const grams = picked ? gramsPerServing(picked) : null;
  const qty = parseFloat(amount);
  const maxQty = unit === 'serving' ? MAX_SERVINGS : MAX_GRAMS;
  const validQty = Number.isFinite(qty) && qty > 0 && qty <= maxQty;
  const kcal =
    picked && validQty
      ? Math.round(unit === 'serving' || !grams ? picked.kcal * qty : (picked.kcal * qty) / grams)
      : 0;

  // 단위를 바꿔도 먹은 양은 그대로 두고 숫자만 환산한다(1공기 ↔ 210g).
  const switchUnit = (next: MealUnit) => {
    if (next === unit || !grams) return;
    const q = validQty ? qty : next === 'g' ? 1 : grams;
    setAmount(next === 'g' ? String(Math.round(q * grams)) : String(Math.round((q / grams) * 10) / 10));
    setUnit(next);
  };

  const save = () => {
    if (!picked) return;
    if (!validQty) {
      showToast(
        unit === 'serving' ? `양은 ${MAX_SERVINGS}인분 이하로 입력해 주세요` : `양은 ${MAX_GRAMS}g 이하로 입력해 주세요`
      );
      return;
    }
    addMealItem(date, slot, {
      id: newId(),
      name: picked.name,
      amount: qty,
      unit,
      // 인분으로 기록하면 그 1인분이 뭐였는지 같이 남긴다. 나중에 음식 데이터가 바뀌어도 기록은 그대로다.
      servingLabel: unit === 'serving' ? picked.amount : undefined,
      kcal,
    });
    addRecent(picked.name);
    showToast(`${slotLabel(slot)}에 추가했어요`);
    // 한 번에 여러 음식을 넣는 경우가 많아 닫지 않고 목록으로 돌아간다.
    setPicked(null);
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={[styles.backdrop, { backgroundColor: overlay.sheetBackdrop }]} onPress={hide} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surfaceSolid,
            paddingHorizontal: spacing.screenX,
            paddingBottom: insets.bottom + 16,
            borderTopLeftRadius: r.sheetTop,
            borderTopRightRadius: r.sheetTop,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.borderDivider }]} />
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{picked ? picked.name : '음식 추가'}</Text>
          <Pressable onPress={hide} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기">
            <Icon name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {picked ? (
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {picked.amount} 기준 {picked.kcal}kcal{picked.note ? ` · ${picked.note}` : ''}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>끼니</Text>
            <View style={styles.chipRow}>
              {MEAL_SLOTS.map((s) => (
                <SelectChip
                  key={s.code}
                  label={s.label}
                  selected={slot === s.code}
                  onPress={() => setSlot(s.code)}
                  size="sm"
                  fill
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>양</Text>
            <View style={styles.amountRow}>
              <TextField
                size="sm"
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                center
                style={styles.amountInput}
              />
              {/* 그램 정보가 없는 음식(1인분·1장)은 g로 바꿀 수 없다. */}
              <SelectChip label="인분" selected={unit === 'serving'} onPress={() => switchUnit('serving')} size="sm" />
              {grams != null && (
                <SelectChip label="g" selected={unit === 'g'} onPress={() => switchUnit('g')} size="sm" />
              )}
              <Text style={[styles.kcalPreview, { color: colors.textPrimary }]}>{kcal > 0 ? `${kcal}kcal` : ''}</Text>
            </View>

            <PrimaryButton label="기록하기" onPress={save} inactive={!validQty} style={styles.saveBtn} />
            <Pressable onPress={() => setPicked(null)} style={styles.backLink} hitSlop={8}>
              <Text style={[styles.backLabel, { color: colors.textSecondary }]}>다른 음식 고르기</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <>
            <View style={[styles.searchRow, { borderColor: colors.borderGlass, backgroundColor: colors.surface }]}>
              <Icon name="search" size={16} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="음식 이름 또는 초성 (예: ㄱㅊ)"
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} style={[styles.clearBtn, { backgroundColor: colors.fillMuted }]}>
                  <Icon name="close" size={16} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {recent.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recentScroll}
                contentContainerStyle={styles.recentRow}
              >
                {recent.map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => pickRecent(k)}
                    style={[styles.recentChip, { borderColor: colors.borderDivider, backgroundColor: colors.surfaceSubtle }]}
                  >
                    <Text style={[styles.recentText, { color: colors.textSecondary }]}>{k}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
              {results.length === 0 && (
                <Text style={[styles.empty, { color: colors.textSecondary }]}>검색 결과가 없어요.</Text>
              )}
              {results.map(({ item: food, match }) => {
                const hit = findAllergyHit(food, avoid);
                const caution = hit ? null : findCautionHit(food, conditions);
                return (
                  <View
                    key={food.id}
                    style={[
                      styles.row,
                      { borderColor: colors.borderDivider },
                      hit && { backgroundColor: alpha(brand.peach, 0.14), opacity: 0.75 },
                    ]}
                  >
                    <View style={styles.rowText}>
                      <View style={styles.nameRow}>
                        <HighlightText text={food.name} match={match} style={[styles.name, { color: colors.textPrimary }]} />
                        <Badge
                          label={
                            hit
                              ? labelOf(AVOID_TAGS, hit)
                              : caution
                                ? `${labelOf(DISEASE_TAGS, caution)} 주의`
                                : '가능'
                          }
                          tone={hit ? 'danger' : caution ? 'warn' : 'good'}
                        />
                      </View>
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>
                        {food.amount}
                        {caution ? ` · ${cautionReason(caution)}` : food.note ? ` · ${food.note}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.kcal, { color: colors.textPrimary }]}>{food.kcal}</Text>
                    <Pressable
                      onPress={() => pick(food)}
                      style={[
                        styles.addBtn,
                        hit
                          ? { backgroundColor: colors.fillMuted }
                          : { backgroundColor: selection.bg, borderColor: selection.border, borderWidth: 1 },
                      ]}
                    >
                      <Text style={[styles.addLabel, { color: hit ? colors.textSecondary : colors.textPrimary }]}>
                        {hit ? '제외' : '추가'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: typography.sheetTitle,
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 14,
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
  recentScroll: {
    marginTop: 12,
    flexGrow: 0,
  },
  recentRow: {
    gap: 8,
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: typography.value,
  label: {
    ...typography.label,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    width: 80,
  },
  kcalPreview: {
    ...typography.value,
    flex: 1,
    textAlign: 'right',
  },
  saveBtn: {
    marginTop: 18,
  },
  backLink: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  backLabel: typography.label,
});
