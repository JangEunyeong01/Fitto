import type { Persona } from '../store/useAppStore';

/**
 * 홈 헤더 브리핑(기준서 1장 "상태 먼저").
 *
 * 두 줄로 나눈다.
 * - **기본 줄**: 오늘 수분·칼로리. 숫자만 말하고 판단하지 않는다
 * - **이벤트 줄**: 오늘 특별한 일이 있을 때만. 격려와 안내만 하고 지적하지 않는다
 *
 * 걸음 수는 넣지 않는다. 센서를 연결하기 전에는 할 말이 없고, 연결한 뒤에도 재촉하지 않는다
 * (관절 질환이 있는 사람에게 "더 걸으세요"는 해가 된다).
 *
 * 순수 함수라 화면 없이 확인할 수 있다. 규칙이 바뀌면 여기만 고친다.
 */

export interface BriefingInput {
  persona: Persona;
  name: string;
  /** 시간대 인사("좋은 아침"). utils/timeOfDay의 timeSlots에서 온다 */
  timeGreeting: string;
  water: number;
  waterGoal: number;
  consumedKcal: number;
  kcalGoal: number;
  /** 오늘 운동한 시간 합(분) */
  exerciseMinutes: number;
  /** 오늘 운동으로 소모한 칼로리 */
  burnedKcal: number;
  /** 생리 기능을 켰는지. 끈 사람에게는 생리 이벤트를 만들지 않는다 */
  periodOn: boolean;
  /** 오늘이 생리 주기 며칠째인지(1일차 = 시작일). 기능이 꺼져 있거나 설정 전이면 null */
  periodCycleDay: number | null;
  /** 다음 생리 시작까지 남은 일수. 모르면 null */
  daysUntilPeriod: number | null;
  /** 오늘까지 이어서 기록한 날 수(오늘 포함) */
  streakDays: number;
}

export interface Briefing {
  /** "늦은 밤이에요, 은영님" */
  greeting: string;
  /** 항상 있는 한 줄 */
  base: string;
  /** 오늘 특별한 일이 있을 때만. 없으면 null — 빈 줄을 억지로 채우지 않는다 */
  event: string | null;
}

/** 이 정도 움직였으면 하루를 잘 보낸 것으로 본다. 둘 중 하나만 넘으면 된다. */
const ACTIVE_MINUTES = 30;
const ACTIVE_KCAL = 300;

/** 생리 예정 안내를 며칠 전부터 할지. 너무 이르면 매일 뜨는 잔소리가 된다. */
const PERIOD_NOTICE_DAYS = 2;

function baseLine(persona: Persona, v: { water: number; consumedKcal: number; remainKcal: number }): string {
  const kcal = v.consumedKcal.toLocaleString();
  const water = v.water.toLocaleString();
  const remain = v.remainKcal.toLocaleString();

  // 숫자만 말한다. "부족해요"·"초과했어요" 같은 판단은 이벤트 줄에서도 하지 않는다.
  switch (persona) {
    case 'friendly':
      return `지금까지 ${kcal}kcal 드셨고, 물은 ${water}ml 마셨어요`;
    case 'strict':
      return `섭취 ${kcal}kcal · 물 ${water}ml · 남은 칼로리 ${remain}kcal`;
    case 'neutral':
      return `오늘 ${kcal}kcal · 물 ${water}ml`;
  }
}

function emptyLine(persona: Persona): string {
  switch (persona) {
    case 'friendly':
      return '오늘 첫 기록을 남겨볼까요?';
    case 'strict':
      return '오늘 기록이 아직 없습니다.';
    case 'neutral':
      return '오늘 기록이 없어요.';
  }
}

/**
 * 오늘의 이벤트 한 줄. 위에서부터 먼저 걸리는 하나만 고른다.
 *
 * 1 생리 시작일 → 2 생리 예정 → 3 많이 움직인 날 → 4 물 목표 달성 → 5 연속 기록
 * 생리 관련은 기능을 켠 사람에게만. 생일은 배너가 따로 있어 여기서는 다루지 않는다.
 */
function eventLine(persona: Persona, v: BriefingInput & { waterDone: boolean; active: boolean }): string | null {
  if (v.periodOn && v.periodCycleDay === 1) {
    return {
      friendly: '오늘부터네요. 무리하지 말고 천천히 가요',
      strict: '생리 1일차입니다. 강도 높은 운동은 미루세요.',
      neutral: '생리 1일차예요.',
    }[persona];
  }

  if (v.periodOn && v.daysUntilPeriod !== null && v.daysUntilPeriod > 0 && v.daysUntilPeriod <= PERIOD_NOTICE_DAYS) {
    const d = v.daysUntilPeriod;
    return {
      friendly: `${d}일 뒤에 시작할 때예요. 물을 조금 더 챙겨요`,
      strict: `생리 예정 ${d}일 전입니다. 수분과 철분을 챙기세요.`,
      neutral: `생리 예정 ${d}일 전이에요.`,
    }[persona];
  }

  if (v.active) {
    const m = v.exerciseMinutes;
    return {
      friendly: `${m}분이나 움직이셨어요. 오늘 잘하셨어요`,
      strict: `운동 ${m}분 · 소모 ${v.burnedKcal}kcal. 목표대로 채웠습니다.`,
      neutral: `오늘 운동 ${m}분, 소모 ${v.burnedKcal}kcal이에요.`,
    }[persona];
  }

  if (v.waterDone) {
    return {
      friendly: '물 목표를 다 채웠어요. 피또가 촉촉해졌어요',
      strict: '수분 목표 달성.',
      neutral: '물 목표를 채웠어요.',
    }[persona];
  }

  // 3일 이상 이어질 때만. 이틀은 흐름이라고 부르기 이르다.
  if (v.streakDays >= 3) {
    const d = v.streakDays;
    return {
      friendly: `${d}일째 이어서 기록 중이에요. 이 흐름 좋아요`,
      strict: `${d}일 연속 기록 중입니다.`,
      neutral: `${d}일째 기록하고 있어요.`,
    }[persona];
  }

  return null;
}

/**
 * 받침이 있으면 "이에요", 없으면 "예요".
 * "좋은 아침이에요"는 맞고 "나른한 오후이에요"는 틀리다. 한글 코드값(0xAC00~)에서 받침 여부를 계산한다.
 */
function ieyo(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  const hasFinalConsonant = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return hasFinalConsonant ? '이에요' : '예요';
}

export function buildBriefing(v: BriefingInput): Briefing {
  const hasRecord = v.water > 0 || v.consumedKcal > 0 || v.exerciseMinutes > 0;
  const remainKcal = Math.max(0, v.kcalGoal - v.consumedKcal);

  return {
    greeting: `${v.timeGreeting}${ieyo(v.timeGreeting)}, ${v.name}님`,
    base: hasRecord
      ? baseLine(v.persona, { water: v.water, consumedKcal: v.consumedKcal, remainKcal })
      : emptyLine(v.persona),
    event: eventLine(v.persona, {
      ...v,
      waterDone: v.waterGoal > 0 && v.water >= v.waterGoal,
      active: v.exerciseMinutes >= ACTIVE_MINUTES || v.burnedKcal >= ACTIVE_KCAL,
    }),
  };
}
