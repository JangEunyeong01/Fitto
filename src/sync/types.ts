import type { MealSlot } from '../store/useAppStore';

/**
 * 서버로 보낼 작업 한 건.
 *
 * 화면은 늘 기기 저장소를 보고 그린다. 서버로 보내는 일은 여기 쌓아두고 나중에 처리한다 —
 * 그래야 비행기 모드에서도 기록이 되고, 버튼을 누른 순간 화면이 먼저 바뀐다.
 *
 * kind별 payload는 명세의 요청 본문과 같은 모양이라, 보낼 때 변환할 게 거의 없다.
 */
export type SyncOp =
  | { kind: 'meal.add'; date: string; mealType: MealSlot; itemId: string }
  | { kind: 'meal.remove'; mealItemId: string }
  | { kind: 'meal.memo'; date: string; mealType: MealSlot; memo: string | null }
  | { kind: 'workout.add'; date: string; workoutId: string }
  | { kind: 'workout.remove'; workoutId: string }
  | { kind: 'water.put'; date: string }
  | { kind: 'steps.put'; date: string }
  | { kind: 'weight.put'; date: string }
  | { kind: 'weight.remove'; date: string }
  | { kind: 'period.settings' }
  | { kind: 'period.daily'; date: string }
  | { kind: 'profile.patch' };

/**
 * 큐에 담긴 항목.
 *
 * payload를 통째로 들고 있지 않고 "무엇이 바뀌었는지"만 적는 이유:
 * 보내는 시점에 기기 저장소에서 최신 값을 읽어 보내면, 같은 대상에 여러 번 수정이 쌓여도
 * 마지막 상태 한 번만 보내면 된다. 물을 다섯 번 누른 걸 다섯 번 보낼 이유가 없다.
 */
export interface OutboxItem {
  id: string;
  op: SyncOp;
  createdAt: number;
  /** 실패 횟수. 일정 횟수를 넘기면 버린다(같은 요청을 무한히 재시도하지 않는다). */
  tries: number;
}

/** 설정 화면에서 "무엇을 못 올렸는지" 보여줄 때 쓰는 이름. 개발 용어(kind)를 그대로 쓰지 않는다. */
export function describeOp(op: SyncOp): string {
  switch (op.kind) {
    case 'meal.add':
      return `${op.date} 식단 기록`;
    case 'meal.remove':
      return '식단 기록 삭제';
    case 'meal.memo':
      return `${op.date} 식사 메모`;
    case 'workout.add':
      return `${op.date} 운동 기록`;
    case 'workout.remove':
      return '운동 기록 삭제';
    case 'water.put':
      return `${op.date} 물 기록`;
    case 'steps.put':
      return `${op.date} 걸음 수`;
    case 'weight.put':
      return `${op.date} 체중`;
    case 'weight.remove':
      return `${op.date} 체중 삭제`;
    case 'period.settings':
      return '생리 주기 설정';
    case 'period.daily':
      return `${op.date} 생리 기록`;
    case 'profile.patch':
      return '프로필';
  }
}

/** 같은 대상에 대한 작업인지. 큐에 이미 있으면 새로 쌓지 않고 자리만 유지한다. */
export function isSameTarget(a: SyncOp, b: SyncOp): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  switch (a.kind) {
    case 'water.put':
    case 'steps.put':
    case 'weight.put':
    case 'weight.remove':
    case 'period.daily':
      return a.date === (b as typeof a).date;
    case 'meal.memo':
      return a.date === (b as typeof a).date && a.mealType === (b as typeof a).mealType;
    case 'period.settings':
    case 'profile.patch':
      return true;
    default:
      // 기록 추가·삭제는 대상이 각각 다르므로 합치지 않는다.
      return false;
  }
}
