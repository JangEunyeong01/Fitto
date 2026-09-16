/**
 * 내장 재료표 (README 5장, 100g 기준). 구현 시 공공데이터포털 식품영양성분 API로 대체한다.
 * allergyTag는 음식 검색(foods.ts)과 같은 코드 체계(constants/codes.ts의 AVOID_TAGS)를 쓴다.
 */
export interface Ingredient {
  name: string;
  kcal100: number;
  carbs100: number;
  protein100: number;
  fat100: number;
  allergyTag?: string;
}

export const INGREDIENTS: Ingredient[] = [
  { name: '닭가슴살', kcal100: 165, carbs100: 0, protein100: 31, fat100: 3.6 },
  { name: '현미밥', kcal100: 111, carbs100: 23, protein100: 2.6, fat100: 0.9 },
  { name: '계란', kcal100: 155, carbs100: 1.1, protein100: 13, fat100: 11, allergyTag: 'egg' },
  { name: '두부', kcal100: 76, carbs100: 1.9, protein100: 8, fat100: 4.8, allergyTag: 'soy' },
  { name: '연어', kcal100: 208, carbs100: 0, protein100: 20, fat100: 13, allergyTag: 'seafood' },
  { name: '브로콜리', kcal100: 34, carbs100: 7, protein100: 2.8, fat100: 0.4 },
  { name: '고구마', kcal100: 86, carbs100: 20, protein100: 1.6, fat100: 0.1 },
  { name: '아보카도', kcal100: 160, carbs100: 9, protein100: 2, fat100: 15 },
  { name: '올리브유', kcal100: 884, carbs100: 0, protein100: 0, fat100: 100 },
  { name: '우유', kcal100: 60, carbs100: 4.8, protein100: 3.2, fat100: 3.3, allergyTag: 'dairy' },
  { name: '아몬드', kcal100: 579, carbs100: 22, protein100: 21, fat100: 50, allergyTag: 'nuts' },
  { name: '땅콩버터', kcal100: 588, carbs100: 20, protein100: 25, fat100: 50, allergyTag: 'nuts' },
];

export interface RecipeLine {
  name: string;
  grams: number;
  kcal100: number;
  carbs100: number;
  protein100: number;
  fat100: number;
  allergyTag?: string;
}

export interface NutritionTotals {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  /** 매크로 칼로리 비율(%). 탄×4 + 단×4 + 지×9 기준. */
  carbsPct: number;
  proteinPct: number;
  fatPct: number;
}

// README: 재료 100g 기준값 × (g/100) 합산. 매크로 칼로리 = 탄×4, 단×4, 지×9.
export function calcNutrition(lines: RecipeLine[]): NutritionTotals {
  const totals = lines.reduce(
    (acc, l) => {
      const ratio = l.grams / 100;
      acc.kcal += l.kcal100 * ratio;
      acc.carbs += l.carbs100 * ratio;
      acc.protein += l.protein100 * ratio;
      acc.fat += l.fat100 * ratio;
      return acc;
    },
    { kcal: 0, carbs: 0, protein: 0, fat: 0 }
  );

  const carbsKcal = totals.carbs * 4;
  const proteinKcal = totals.protein * 4;
  const fatKcal = totals.fat * 9;
  const macroKcal = carbsKcal + proteinKcal + fatKcal;

  return {
    kcal: Math.round(totals.kcal),
    carbs: Math.round(totals.carbs * 10) / 10,
    protein: Math.round(totals.protein * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    carbsPct: macroKcal > 0 ? Math.round((carbsKcal / macroKcal) * 100) : 0,
    proteinPct: macroKcal > 0 ? Math.round((proteinKcal / macroKcal) * 100) : 0,
    fatPct: macroKcal > 0 ? Math.round((fatKcal / macroKcal) * 100) : 0,
  };
}

/** README 코멘트 규칙을 위에서부터 순서대로 적용한다(경고가 우선). */
export function getNutritionComment(lines: RecipeLine[], totals: NutritionTotals, avoid: string[]): string {
  if (lines.length === 0) return '재료를 추가하면 영양 분석을 보여드려요.';

  const hit = lines.find((l) => l.allergyTag && avoid.includes(l.allergyTag));
  if (hit) return `${hit.name}은(는) 못 먹는 음식으로 등록돼 있어요. 다른 재료로 바꿔보세요.`;

  if (totals.kcal > 800) return `총 ${totals.kcal.toLocaleString()}kcal이에요. 2인분으로 나눠 드시는 걸 권해요.`;
  if (totals.fatPct >= 40) return `지방 비율이 ${totals.fatPct}%로 높아요. 기름을 줄여보세요.`;
  if (totals.proteinPct >= 20) return `단백질 비율 ${totals.proteinPct}%. 균형 잡힌 구성이에요!`;
  return `단백질 비율이 ${totals.proteinPct}%로 낮아요. 단백질 재료를 더해보세요.`;
}
