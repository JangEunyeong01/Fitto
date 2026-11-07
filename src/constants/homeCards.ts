/**
 * 홈 카드 종류와 기본값. 저장소(useAppStore)와 기기 저장소 마이그레이션(store/appMigrate)이 같이 쓴다.
 * RN을 부르지 않는 파일이라 점검 스크립트가 node로 바로 읽는다.
 */
export type CardId = 'kcal' | 'water' | 'act' | 'steps' | 'ex' | 'week' | 'period';

// B 히어로 순서: 칼로리 전폭 → 물·걸음 반폭 2열 → 활동 → 운동 → 주간 → 생리.
export const DEFAULT_CARD_ORDER: CardId[] = ['kcal', 'water', 'steps', 'act', 'ex', 'week', 'period'];

/**
 * 숨길 수 없는 기본 카드. 전부 숨겨서 홈이 텅 비는 걸 막는다.
 * 순서는 바꿀 수 있고 숨기기만 제한한다.
 */
export const ESSENTIAL_CARDS: CardId[] = ['kcal', 'steps'];

/**
 * 처음부터 숨겨 두는 카드. 활동 카드는 걸음(걸음 카드)·운동 시간(운동 카드)·소모 칼로리(칼로리 카드)를
 * 다시 모아 보여줄 뿐이라, 기본 홈에선 같은 숫자가 두 번씩 나왔다. 지우지 않고 카드 순서 시트에서 켤 수 있게 둔다.
 */
export const DEFAULT_CARD_HIDDEN: CardId[] = ['act'];
