import { MEAL_SLOTS, labelOf, type MealSlotCode, type MealUnit } from '../constants/codes';

/**
 * 먹은 양은 숫자와 단위로 저장하고(API 명세 v1.1의 amount/unit), 화면 문구는 여기서 만든다.
 * 문자열로 저장하면 나중에 양을 고치거나 서버로 보낼 때 다시 파싱해야 한다.
 */
export function formatAmount(item: { amount: number; unit: MealUnit; servingLabel?: string }): string {
  if (item.unit === 'g') return `${item.amount}g`;
  const base = item.servingLabel || '1인분';
  return item.amount === 1 ? base : `${base} × ${item.amount}`;
}

export function slotLabel(slot: MealSlotCode): string {
  return labelOf(MEAL_SLOTS, slot);
}
