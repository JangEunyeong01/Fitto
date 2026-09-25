import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Platform, StyleSheet, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import SelectChip from '../../components/SelectChip';
import HighlightText from '../../components/HighlightText';
import Icon from '../../components/Icon';
import TextField from '../../components/TextField';
import DetailHeader from '../detail/DetailHeader';
import NutritionCard from './NutritionCard';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { INGREDIENTS, calcNutrition, type Ingredient, type RecipeLine } from '../../data/ingredients';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { newId } from '../../utils/id';
import { dateKey } from '../../utils/timeOfDay';
import { searchByName } from '../../utils/hangul';

// 서버가 받는 상한과 같은 값이다. 여기서 안 막으면 저장은 되지만 동기화에서 거절당해 기록이 사라진다.
const MAX_GRAMS = 5000;
const MAX_KCAL_100G = 900;
/** "최근 쓴 재료" 칩 개수. 한 줄 반을 넘기면 검색 칸보다 무거워진다(시안 13). */
const RECENT_LIMIT = 5;

/** 웹 브라우저가 입력칸에 그리는 기본 포커스 테두리를 끈다(TextField와 같은 처리). */
const noWebOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

/**
 * 나만의 레시피(시안 13·13-1).
 *
 * 재료는 칩을 늘어놓는 대신 검색 칸 하나로 찾는다. 기본 재료와 직접 넣은 재료를 함께, 초성으로도 찾는다.
 * 고르면 "재료 · 양 입력 g | 추가" 한 줄이 뜨고, 찾는 게 없으면 결과 맨 아래에서 바로 직접 추가로 넘어간다.
 */
export default function RecipeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const recipes = useAppStore((s) => s.recipes);
  const customIngredients = useAppStore((s) => s.customIngredients);
  const addRecipe = useAppStore((s) => s.addRecipe);
  const addCustomIngredient = useAppStore((s) => s.addCustomIngredient);
  const addMealItem = useAppStore((s) => s.addMealItem);
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState('');
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [grams, setGrams] = useState('');

  // 직접 입력 폼
  const [customOpen, setCustomOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cKcal, setCKcal] = useState('');
  const [cCarbs, setCCarbs] = useState('');
  const [cProtein, setCProtein] = useState('');
  const [cFat, setCFat] = useState('');

  // 내장 재료 + 직접 넣은 재료를 한 목록으로 합친다.
  // 이름이 겹치면 사용자가 넣은 값이 이긴다 — 안 그러면 같은 이름이 두 번 나오고,
  // 이름으로 찾을 때 앞쪽 내장값이 잡혀서 직접 입력한 수치가 무시된다.
  const allIngredients: Ingredient[] = useMemo(() => {
    const byName = new Map<string, Ingredient>();
    for (const ing of INGREDIENTS) byName.set(ing.name, ing);
    for (const c of customIngredients) {
      byName.set(c.name, {
        name: c.name,
        kcal100: c.kcal100,
        carbs100: c.carbs100,
        protein100: c.protein100,
        fat100: c.fat100,
      });
    }
    return [...byName.values()];
  }, [customIngredients]);

  // 최근 쓴 재료는 저장한 레시피에서 꺼낸다(최신 레시피가 앞). 따로 기록을 두지 않아도 된다.
  const recentNames = useMemo(() => {
    const known = new Set(allIngredients.map((i) => i.name));
    const seen = new Set<string>();
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        if (known.has(ing.name)) seen.add(ing.name);
        if (seen.size >= RECENT_LIMIT) return [...seen];
      }
    }
    return [...seen];
  }, [recipes, allIngredients]);

  const searching = query.trim().length > 0;
  const results = useMemo(
    () => (searching ? searchByName(allIngredients, query, (i) => i.name) : []),
    [allIngredients, query, searching]
  );

  const pick = (ingName: string) => {
    setPicked(ingName);
    setQuery('');
    setGrams('');
  };

  const gramsNum = parseInt(grams, 10);
  const gramsReady = Number.isFinite(gramsNum) && gramsNum > 0;

  const addLine = () => {
    if (!picked) return;
    if (!gramsReady) {
      showToast('양을 g으로 입력해 주세요');
      return;
    }
    if (gramsNum > MAX_GRAMS) {
      showToast(`재료는 한 번에 ${MAX_GRAMS}g까지 넣을 수 있어요`);
      return;
    }
    const ing = allIngredients.find((i) => i.name === picked);
    if (!ing) return;
    setLines((prev) => [...prev, { ...ing, grams: gramsNum }]);
    setGrams('');
    setPicked(null);
  };

  // 지운 줄은 같은 자리에 되살린다. 순서가 바뀌면 되돌렸는지 알아보기 어렵다.
  const removeLine = (index: number) => {
    const removed = lines[index];
    setLines((prev) => prev.filter((_, i) => i !== index));
    showToast(`${removed.name} 뺐어요`, {
      label: '실행 취소',
      onPress: () => setLines((prev) => [...prev.slice(0, index), removed, ...prev.slice(index)]),
    });
  };

  const openCustom = () => {
    setCName(query.trim());
    setCustomOpen(true);
    setQuery('');
  };

  const addCustom = () => {
    const kcal = parseFloat(cKcal);
    if (!cName.trim()) {
      showToast('재료명을 입력해 주세요');
      return;
    }
    if (!Number.isFinite(kcal) || kcal <= 0) {
      showToast('100g당 kcal을 입력해 주세요');
      return;
    }
    if (kcal > MAX_KCAL_100G) {
      showToast(`100g당 ${MAX_KCAL_100G}kcal까지 입력할 수 있어요`);
      return;
    }
    const ing = {
      name: cName.trim(),
      kcal100: kcal,
      carbs100: parseFloat(cCarbs) || 0,
      protein100: parseFloat(cProtein) || 0,
      fat100: parseFloat(cFat) || 0,
    };
    addCustomIngredient(ing);
    setPicked(ing.name);
    setCustomOpen(false);
    setCName('');
    setCKcal('');
    setCCarbs('');
    setCProtein('');
    setCFat('');
    showToast('재료 목록에 추가했어요');
  };

  const saveRecipe = () => {
    if (!name.trim()) {
      showToast('레시피 이름을 입력해 주세요');
      return;
    }
    if (lines.length === 0) {
      showToast('재료를 하나 이상 추가해 주세요');
      return;
    }
    const totals = calcNutrition(lines);
    addRecipe({
      id: newId(),
      name: name.trim(),
      photoUri: null,
      ingredients: lines.map((l) => ({ name: l.name, grams: l.grams, kcal: Math.round((l.kcal100 * l.grams) / 100) })),
      totalKcal: totals.kcal,
    });
    setName('');
    setLines([]);
    showToast('레시피를 저장했어요');
  };

  const divider = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDivider };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DetailHeader title="나만의 레시피" />

        {/* 실제 앱에서는 카메라/갤러리 선택으로 연결한다. */}
        <Pressable
          onPress={() => showToast('사진 첨부는 실기기에서 카메라·갤러리로 연결돼요')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.photoSlot, { backgroundColor: colors.fillMuted, opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="plus" size={24} color={colors.textSecondary} />
          <Text style={[styles.photoText, { color: colors.textSecondary }]}>사진 첨부</Text>
        </Pressable>

        <TextField
          value={name}
          onChangeText={setName}
          placeholder="레시피 이름"
          maxLength={30}
          accessibilityLabel="레시피 이름"
          style={styles.nameInput}
        />

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>재료 선택</Text>
          <View style={styles.searchWrap}>
            <TextField
              size="sm"
              leftIcon="search"
              clearable
              value={query}
              onChangeText={setQuery}
              placeholder="재료 검색"
              accessibilityLabel="재료 검색"
            />
          </View>

          {searching ? (
            <View style={styles.results}>
              {results.map(({ item, match }, i) => (
                <Pressable
                  key={item.name}
                  onPress={() => pick(item.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name} 고르기`}
                  style={({ pressed }) => [styles.resultRow, i > 0 && divider, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <HighlightText
                    text={item.name}
                    match={match}
                    style={[styles.resultName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  />
                  <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>100g {item.kcal100}kcal</Text>
                </Pressable>
              ))}
              {/* 찾는 게 없을 때 폼을 따로 찾아가게 하지 않는다. 쓴 이름 그대로 직접 추가로 넘긴다. */}
              <Pressable
                onPress={openCustom}
                accessibilityRole="button"
                style={({ pressed }) => [styles.customLink, results.length > 0 && divider, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Icon name="plus" size={16} color={colors.textPrimary} strokeWidth={2} />
                <Text style={[styles.customLinkLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                  '{query.trim()}' 직접 추가 · 100g당 칼로리 입력
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {recentNames.length > 0 && (
                <>
                  <Text style={[styles.recentLabel, { color: colors.textSecondary }]}>최근 쓴 재료</Text>
                  <View style={styles.chipWrap}>
                    {recentNames.map((n) => (
                      <SelectChip
                        key={n}
                        label={n}
                        selected={picked === n}
                        onPress={() => (picked === n ? setPicked(null) : pick(n))}
                      />
                    ))}
                  </View>
                </>
              )}

              {picked && (
                // 고른 재료 한 줄: 이름 · 양 입력 g | 추가. 양을 넣기 전엔 "추가"를 흐리게 둔다.
                <View style={[styles.entryRow, { backgroundColor: colors.fillMuted }]}>
                  <Text style={[styles.entryName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {picked}
                  </Text>
                  <TextInput
                    value={grams}
                    onChangeText={(t) => setGrams(t.replace(/[^0-9]/g, ''))}
                    onSubmitEditing={addLine}
                    placeholder="양 입력"
                    placeholderTextColor={colors.textPlaceholder}
                    keyboardType="number-pad"
                    maxLength={4}
                    autoFocus
                    accessibilityLabel={`${picked} 양(g)`}
                    style={[styles.entryInput, { color: colors.textPrimary }, noWebOutline]}
                  />
                  <Text style={[styles.entryUnit, { color: colors.textSecondary }]}>g</Text>
                  <View style={[styles.entryDivider, { backgroundColor: colors.fillStrong }]} />
                  <Pressable
                    onPress={addLine}
                    accessibilityRole="button"
                    accessibilityLabel={`${picked} 추가`}
                    accessibilityState={{ disabled: !gramsReady }}
                    style={styles.entryAdd}
                  >
                    <Text style={[styles.entryAddLabel, { color: gramsReady ? colors.textAccent : colors.textPlaceholder }]}>
                      추가
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {customOpen && (
            <View style={styles.customForm}>
              <TextField value={cName} onChangeText={setCName} placeholder="재료명" maxLength={30} />
              <TextField
                value={cKcal}
                onChangeText={(t) => setCKcal(t.replace(/[^0-9.]/g, ''))}
                placeholder="100g당 kcal (필수)"
                keyboardType="numeric"
              />
              <View style={styles.macroInputRow}>
                <TextField
                  value={cCarbs}
                  onChangeText={(t) => setCCarbs(t.replace(/[^0-9.]/g, ''))}
                  placeholder="탄 g"
                  keyboardType="numeric"
                  center
                  style={styles.macroInput}
                />
                <TextField
                  value={cProtein}
                  onChangeText={(t) => setCProtein(t.replace(/[^0-9.]/g, ''))}
                  placeholder="단 g"
                  keyboardType="numeric"
                  center
                  style={styles.macroInput}
                />
                <TextField
                  value={cFat}
                  onChangeText={(t) => setCFat(t.replace(/[^0-9.]/g, ''))}
                  placeholder="지 g"
                  keyboardType="numeric"
                  center
                  style={styles.macroInput}
                />
              </View>
              {/* 칠한 버튼은 아래 "레시피 저장" 하나만. 폼 버튼은 글씨로. */}
              <View style={styles.customBtns}>
                <PrimaryButton label="취소" variant="text" size="md" onPress={() => setCustomOpen(false)} />
                <PrimaryButton label="이 재료로 추가" variant="text" size="md" onPress={addCustom} />
              </View>
            </View>
          )}
        </GlassCard>

        {lines.length > 0 && (
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>재료 목록</Text>
            <View style={styles.lineList}>
              {lines.map((l, i) => (
                <View key={`${l.name}-${i}`} style={[styles.lineRow, i > 0 && divider]}>
                  <Text style={[styles.lineName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {l.name}
                  </Text>
                  <Text style={[styles.lineGram, { color: colors.textSecondary }]}>{l.grams}g</Text>
                  <Text style={[styles.lineKcal, { color: colors.textPrimary }]}>{Math.round((l.kcal100 * l.grams) / 100)}</Text>
                  <Pressable
                    onPress={() => removeLine(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`${l.name} 빼기`}
                    style={styles.removeBtn}
                  >
                    <Icon name="close" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        <NutritionCard lines={lines} />

        <PrimaryButton label="레시피 저장" onPress={saveRecipe} style={styles.saveBtn} />

        {recipes.length > 0 && (
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>저장한 레시피</Text>
            <View style={styles.lineList}>
              {recipes.map((r, i) => (
                <View key={r.id} style={[styles.savedRow, i > 0 && divider]}>
                  <View style={styles.savedTextCol}>
                    <Text style={[styles.savedName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>
                      {r.ingredients.length}개 재료 · {r.totalKcal.toLocaleString()}kcal
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      addMealItem(dateKey(), 'dinner', {
                        id: newId(),
                        name: r.name,
                        amount: 1,
                        unit: 'serving',
                        kcal: r.totalKcal,
                      });
                      showToast('오늘 저녁에 추가했어요');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.name} 식단에 추가`}
                    style={({ pressed }) => [styles.savedBtn, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.savedBtnLabel, { color: colors.textAccent }]}>식단에 추가</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: typography.cardTitle,
  photoSlot: {
    height: 132,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  photoText: {
    fontSize: 14,
    ...weight(600),
  },
  nameInput: {
    marginBottom: 12,
  },
  searchWrap: {
    marginTop: 12,
  },
  // 결과 목록은 마지막 줄(44)이 바닥 여백 몫을 해서 카드 아래 여백을 8 당긴다(시안 13-1).
  results: {
    marginTop: 6,
    marginBottom: -8,
  },
  resultRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  resultName: {
    fontSize: 15,
    ...weight(600),
    flex: 1,
  },
  resultMeta: {
    fontSize: 13,
    ...weight(400),
  },
  customLink: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  customLinkLabel: {
    fontSize: 14,
    ...weight(600),
    flexShrink: 1,
  },
  recentLabel: {
    fontSize: 12,
    ...weight(600),
    marginTop: 14,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  entryRow: {
    height: 40,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  entryName: {
    fontSize: 14,
    ...weight(600),
    flex: 1,
  },
  entryInput: {
    width: 56,
    height: 40,
    fontSize: 14,
    textAlign: 'right',
    padding: 0,
  },
  entryUnit: {
    fontSize: 14,
    ...weight(600),
  },
  entryDivider: {
    width: 1,
    height: 18,
    marginLeft: 4,
  },
  // 보이는 줄은 40이지만 누르는 영역은 위아래로 2씩 넘겨 44를 맞춘다.
  entryAdd: {
    height: 44,
    marginVertical: -2,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  entryAddLabel: {
    fontSize: 14,
    ...weight(700),
  },
  customForm: {
    marginTop: 12,
    gap: 8,
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroInput: {
    flex: 1,
  },
  customBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  lineList: {
    marginTop: 4,
    marginBottom: -10,
  },
  lineRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lineName: {
    fontSize: 14,
    ...weight(600),
    flex: 1,
  },
  lineGram: {
    fontSize: 13,
    ...weight(400),
  },
  lineKcal: {
    fontSize: 14,
    ...weight(600),
    width: 40,
    textAlign: 'right',
  },
  removeBtn: {
    width: 44,
    height: 44,
    marginRight: -14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    marginBottom: 12,
  },
  savedRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedTextCol: {
    flex: 1,
    gap: 3,
  },
  savedName: {
    fontSize: 14,
    ...weight(600),
  },
  savedMeta: typography.caption,
  savedBtn: {
    height: 44,
    justifyContent: 'center',
  },
  savedBtnLabel: {
    fontSize: 14,
    ...weight(600),
  },
});
