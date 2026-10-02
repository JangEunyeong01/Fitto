import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HighlightText from '../../components/HighlightText';
import Icon from '../../components/Icon';
import SelectChip from '../../components/SelectChip';
import SegmentedControl from '../../components/SegmentedControl';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import { useTheme } from '../../theme/useTheme';
import { overlay, typography, weight } from '../../theme/tokens';
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
/** 시트 좌우 여백. 카드 안쪽 여백(18)과 맞춘다(시안 14~16). */
const SHEET_PAD = 18;

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
  const { colors, radius: r } = useTheme();
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
            paddingHorizontal: SHEET_PAD,
            paddingBottom: insets.bottom + 16,
            borderTopLeftRadius: r.sheetTop,
            borderTopRightRadius: r.sheetTop,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.borderDivider }]} />
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {picked ? picked.name : '음식 추가'}
          </Text>
          <Pressable onPress={hide} accessibilityRole="button" accessibilityLabel="닫기" style={styles.closeBtn}>
            <Icon name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {picked ? (
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.pickedMeta, { color: colors.textSecondary }]}>
              {picked.amount} 기준 {picked.kcal}kcal{picked.note ? ` · ${picked.note}` : ''}
            </Text>

            {/* 끼니는 늘 하나가 골라져 있어서 붙은 세그먼트(시안 15). */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>끼니</Text>
            <SegmentedControl
              options={MEAL_SLOTS.map((s) => ({ value: s.code, label: s.label }))}
              value={slot}
              onChange={setSlot}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>양</Text>
            <View style={styles.amountRow}>
              <TextField
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                accessibilityLabel={unit === 'serving' ? '양(인분)' : '양(g)'}
                center
                style={styles.amountInput}
              />
              {/* 숫자 칸과 높이(48)를 맞춘다. 그램 정보가 없는 음식(1인분·1장)은 g로 바꿀 수 없어 글씨만 둔다. */}
              {grams != null ? (
                <View style={styles.unitSeg}>
                  <SegmentedControl
                    options={[
                      { value: 'serving' as MealUnit, label: '인분' },
                      { value: 'g' as MealUnit, label: 'g' },
                    ]}
                    value={unit}
                    onChange={switchUnit}
                    height={48}
                  />
                </View>
              ) : (
                <Text style={[styles.unitText, { color: colors.textSecondary }]}>인분</Text>
              )}
              <Text style={[styles.kcalPreview, { color: colors.textPrimary }]}>{kcal > 0 ? `${kcal}kcal` : ''}</Text>
            </View>

            <PrimaryButton label="기록하기" onPress={save} inactive={!validQty} style={styles.saveBtn} />
            <Pressable onPress={() => setPicked(null)} accessibilityRole="button" style={styles.backLink}>
              <Text style={[styles.backLabel, { color: colors.textSecondary }]}>다른 음식 고르기</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <>
            {/* 초성 예시는 뺐다. 초성 검색은 그대로 되고, 안내가 길면 칸이 설명서처럼 보인다(시안 14). */}
            <View style={styles.searchWrap}>
              <TextField
                leftIcon="search"
                clearable
                value={query}
                onChangeText={setQuery}
                placeholder="음식 검색"
                accessibilityLabel="음식 검색"
              />
            </View>

            {recent.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.recentScroll}
                contentContainerStyle={styles.recentRow}
              >
                {recent.map((k) => (
                  <SelectChip key={k} label={k} selected={false} onPress={() => pickRecent(k)} />
                ))}
              </ScrollView>
            )}

            <ScrollView style={styles.results} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {results.length === 0 && (
                <Text style={[styles.empty, { color: colors.textSecondary }]}>검색 결과가 없어요.</Text>
              )}
              {results.map(({ item: food, match }, i) => {
                const hit = findAllergyHit(food, avoid);
                const caution = hit ? null : findCautionHit(food, conditions);
                // 배지 대신 설명 줄 끝에 한 마디. 알레르기는 오류색 굵은 글씨, 질환 주의는 주의색(시안 14).
                const flag = hit
                  ? { text: `${labelOf(AVOID_TAGS, hit)} 포함`, color: colors.textDanger }
                  : caution
                    ? { text: `${labelOf(DISEASE_TAGS, caution)} 주의`, color: colors.textWarn }
                    : null;
                return (
                  <Pressable
                    key={food.id}
                    onPress={() => pick(food)}
                    accessibilityRole="button"
                    accessibilityLabel={hit ? `${food.name}, ${flag?.text}, 제외` : `${food.name} ${food.kcal}kcal 추가`}
                    style={({ pressed }) => [
                      styles.row,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDivider },
                      { opacity: hit ? 0.6 : pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={styles.rowText}>
                      <HighlightText
                        text={food.name}
                        match={match}
                        style={[styles.name, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      />
                      <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
                        {food.amount}
                        {caution ? ` · ${cautionReason(caution)}` : !hit && food.note ? ` · ${food.note}` : ''}
                        {flag && (
                          <>
                            {' · '}
                            <Text style={[styles.flag, { color: flag.color }]}>{flag.text}</Text>
                          </>
                        )}
                      </Text>
                    </View>
                    <Text style={[styles.kcal, { color: colors.textPrimary }]}>{food.kcal}</Text>
                    <Text style={[styles.addLabel, { color: hit ? colors.textSecondary : colors.textAccent }]}>
                      {hit ? '제외' : '추가'}
                    </Text>
                  </Pressable>
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
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    height: 44,
  },
  title: {
    ...typography.sheetTitle,
    flex: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    marginRight: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    marginTop: 6,
    marginBottom: 6,
  },
  recentScroll: {
    marginTop: 6,
    flexGrow: 0,
  },
  recentRow: {
    gap: 8,
  },
  results: {
    marginTop: 6,
  },
  empty: {
    ...typography.body,
    paddingVertical: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 8,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    ...weight(600),
  },
  meta: {
    fontSize: 12,
    marginTop: 3,
  },
  flag: weight(700),
  kcal: {
    fontSize: 15,
    ...weight(700),
  },
  // 줄 전체가 누르는 영역이라 글씨만 둔다. 줄 높이 60이 44를 넘는다.
  addLabel: {
    fontSize: 14,
    ...weight(600),
  },
  pickedMeta: {
    fontSize: 13,
    ...weight(400),
    lineHeight: 13 * 1.5,
    marginTop: -2,
  },
  label: {
    ...typography.label,
    marginTop: 14,
    marginBottom: 6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountInput: {
    width: 80,
  },
  unitSeg: {
    width: 140,
  },
  unitText: {
    fontSize: 15,
    ...weight(600),
  },
  kcalPreview: {
    fontSize: 17,
    ...weight(700),
    flex: 1,
    textAlign: 'right',
  },
  saveBtn: {
    marginTop: 18,
  },
  backLink: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 4,
  },
  backLabel: {
    fontSize: 14,
    ...weight(600),
  },
});
