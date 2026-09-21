import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import SelectChip from '../../components/SelectChip';
import Icon from '../../components/Icon';
import TextField from '../../components/TextField';
import DetailHeader from '../detail/DetailHeader';
import NutritionCard from './NutritionCard';
import { useTheme } from '../../theme/useTheme';
import { radius, selection, typography } from '../../theme/tokens';
import { INGREDIENTS, calcNutrition, type Ingredient, type RecipeLine } from '../../data/ingredients';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { newId } from '../../utils/id';
import { dateKey } from '../../utils/timeOfDay';

// 서버가 받는 상한과 같은 값이다. 여기서 안 막으면 저장은 되지만 동기화에서 거절당해 기록이 사라진다.
const MAX_GRAMS = 5000;
const MAX_KCAL_100G = 900;

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
  // 이름이 겹치면 사용자가 넣은 값이 이깁니다 — 안 그러면 칩이 두 개 생기고,
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

  const addLine = () => {
    const g = parseInt(grams, 10);
    if (!picked) {
      showToast('재료를 선택해 주세요');
      return;
    }
    if (!Number.isFinite(g) || g <= 0) {
      showToast('그램 수를 입력해 주세요');
      return;
    }
    if (g > MAX_GRAMS) {
      showToast(`재료는 한 번에 ${MAX_GRAMS}g까지 넣을 수 있어요`);
      return;
    }
    const ing = allIngredients.find((i) => i.name === picked);
    if (!ing) return;
    setLines((prev) => [...prev, { ...ing, grams: g }]);
    setGrams('');
    setPicked(null);
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

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="나만의 레시피" />

        {/* 실제 앱에서는 카메라/갤러리 선택으로 연결한다. */}
        <Pressable onPress={() => showToast('사진 첨부는 실기기에서 카메라·갤러리로 연결돼요')}>
          <View style={[styles.photoSlot, { borderColor: colors.borderGlass, backgroundColor: colors.surfaceSubtle }]}>
            <Text style={[styles.photoText, { color: colors.textSecondary }]}>+ 사진 첨부</Text>
          </View>
        </Pressable>

        <TextField
          onBackground
          value={name}
          onChangeText={setName}
          placeholder="레시피 이름"
          maxLength={30}
          style={styles.nameInput}
        />

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>재료 선택</Text>
          <View style={styles.chipWrap}>
            {allIngredients.map((ing) => (
              <SelectChip
                key={ing.name}
                label={ing.name}
                selected={picked === ing.name}
                onPress={() => setPicked(picked === ing.name ? null : ing.name)}
                size="sm"
              />
            ))}
          </View>

          <View style={styles.addRow}>
            <TextField
              size="sm"
              value={grams}
              onChangeText={(t) => setGrams(t.replace(/[^0-9]/g, ''))}
              placeholder="g"
              keyboardType="numeric"
              style={styles.gramInput}
            />
            <PrimaryButton small label="재료 추가 (g)" onPress={addLine} style={styles.addBtn} />
          </View>

          <Pressable onPress={() => setCustomOpen((v) => !v)} style={[styles.customToggle, { borderColor: colors.borderInput }]}>
            <Text style={[styles.customToggleLabel, { color: colors.textSecondary }]}>목록에 없는 재료 직접 입력</Text>
          </Pressable>

          {customOpen && (
            <View style={styles.customForm}>
              <TextField size="sm" value={cName} onChangeText={setCName} placeholder="재료명" maxLength={30} />
              <TextField
                size="sm"
                value={cKcal}
                onChangeText={(t) => setCKcal(t.replace(/[^0-9.]/g, ''))}
                placeholder="100g당 kcal (필수)"
                keyboardType="numeric"
              />
              <View style={styles.macroInputRow}>
                <TextField
                  size="sm"
                  value={cCarbs}
                  onChangeText={(t) => setCCarbs(t.replace(/[^0-9.]/g, ''))}
                  placeholder="탄 g"
                  keyboardType="numeric"
                  center
                  style={styles.macroInput}
                />
                <TextField
                  size="sm"
                  value={cProtein}
                  onChangeText={(t) => setCProtein(t.replace(/[^0-9.]/g, ''))}
                  placeholder="단 g"
                  keyboardType="numeric"
                  center
                  style={styles.macroInput}
                />
                <TextField
                  size="sm"
                  value={cFat}
                  onChangeText={(t) => setCFat(t.replace(/[^0-9.]/g, ''))}
                  placeholder="지 g"
                  keyboardType="numeric"
                  center
                  style={styles.macroInput}
                />
              </View>
              <PrimaryButton small label="이 재료로 추가" onPress={addCustom} />
            </View>
          )}
        </GlassCard>

        {lines.length > 0 && (
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>재료 목록</Text>
            <View style={styles.lineList}>
              {lines.map((l, i) => (
                <View key={`${l.name}-${i}`} style={styles.lineRow}>
                  <Text style={[styles.lineName, { color: colors.textPrimary }]}>{l.name}</Text>
                  <Text style={[styles.lineGram, { color: colors.textSecondary }]}>{l.grams}g</Text>
                  <Text style={[styles.lineKcal, { color: colors.textPrimary }]}>{Math.round((l.kcal100 * l.grams) / 100)}</Text>
                  <Pressable onPress={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={8}>
                    <Icon name="close" size={15} color={colors.textSecondary} />
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
            <View style={styles.savedList}>
              {recipes.map((r) => (
                <View key={r.id} style={styles.savedRow}>
                  <View style={styles.savedTextCol}>
                    <Text style={[styles.savedName, { color: colors.textPrimary }]}>{r.name}</Text>
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
                    style={[styles.savedBtn, { borderColor: selection.border, backgroundColor: selection.bg }]}
                  >
                    <Text style={[styles.savedBtnLabel, { color: colors.textPrimary }]}>식단에 추가</Text>
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
  cardTitle: typography.sectionTitle,
  photoSlot: {
    height: 150,
    borderRadius: radius.optionRow,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoText: typography.unit,
  nameInput: {
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  gramInput: {
    width: 96,
    textAlign: 'center',
  },
  addBtn: {
    flex: 1,
  },
  customToggle: {
    marginTop: 12,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customToggleLabel: typography.label,
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
  lineList: {
    marginTop: 10,
    gap: 8,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lineName: {
    ...typography.rowLabel,
    flex: 1,
  },
  lineGram: typography.bodySm,
  lineKcal: {
    ...typography.value,
    minWidth: 40,
    textAlign: 'right',
  },
  remove: {
    fontSize: 16,
    paddingHorizontal: 4,
  },
  saveBtn: {
    marginBottom: 12,
  },
  savedList: {
    marginTop: 10,
    gap: 10,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedTextCol: {
    flex: 1,
    gap: 3,
  },
  savedName: typography.rowLabel,
  savedMeta: typography.caption,
  savedBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBtnLabel: typography.label,
});
