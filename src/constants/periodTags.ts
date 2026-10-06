import { SYMPTOM_TAGS, type TagOption } from './codes';

/**
 * 생리 일일 기록 항목(삼성 헬스 생리 기록 참고).
 *
 * 저장은 하루치 코드 목록 하나(`periodSymptoms`, 서버 `symptoms`)에 모두 담는다. 증상 외 항목은
 * "분류.값" 꼴로 구분한다(mood.happy, mucus.creamy …). 항목이 늘어도 서버 표·API를 바꿀 필요가 없고,
 * 증상 코드는 예전 그대로(접두어 없음)라 이미 쌓인 기록이 그대로 읽힌다.
 */
export interface TagGroup {
  key: string;
  title: string;
  options: TagOption[];
  /** 하나만 고르는 항목(점액 상태, 배란 테스트). 다른 걸 누르면 바뀐다. */
  single?: boolean;
  /** 칩이 많아 처음엔 한 줄만 보이고 펼친다. */
  collapsible?: boolean;
}

export const MOOD_TAGS: TagOption[] = [
  { code: 'mood.tired', label: '피곤함' },
  { code: 'mood.stressed', label: '스트레스' },
  { code: 'mood.happy', label: '행복함' },
  { code: 'mood.calm', label: '평온함' },
  { code: 'mood.irritated', label: '짜증남' },
  { code: 'mood.swings', label: '감정 기복' },
  { code: 'mood.anxious', label: '불안함' },
  { code: 'mood.normal', label: '보통' },
  { code: 'mood.energetic', label: '에너지 넘침' },
  { code: 'mood.lethargic', label: '무기력함' },
  { code: 'mood.excited', label: '신남' },
  { code: 'mood.tense', label: '긴장됨' },
];

export const PERIOD_TAG_GROUPS: TagGroup[] = [
  { key: 'symptom', title: '증상', options: SYMPTOM_TAGS, collapsible: true },
  { key: 'mood', title: '기분', options: MOOD_TAGS, collapsible: true },
  { key: 'sex', title: '성생활', options: [{ code: 'sex.yes', label: '성관계 있음' }] },
  {
    key: 'mucus',
    title: '자궁경부 점액',
    single: true,
    options: [
      { code: 'mucus.egg_white', label: '계란 흰자 같음' },
      { code: 'mucus.watery', label: '물 같음' },
      { code: 'mucus.creamy', label: '크림 같음' },
      { code: 'mucus.sticky', label: '끈적임' },
      { code: 'mucus.dry', label: '점액 없음' },
    ],
  },
  { key: 'spotting', title: '부정 출혈', options: [{ code: 'spotting.yes', label: '부정 출혈 있음' }] },
  {
    key: 'ovtest',
    title: '배란 테스트',
    single: true,
    options: [
      { code: 'ovtest.positive', label: '양성' },
      { code: 'ovtest.negative', label: '음성' },
    ],
  },
];

/** 직접 입력한 항목. 서버 칸이 30자라 접두어(7자)를 빼고 20자까지. */
export const CUSTOM_PREFIX = 'custom.';
export const CUSTOM_MAX = 20;

const ALL = PERIOD_TAG_GROUPS.flatMap((g) => g.options);

export function periodTagLabel(code: string): string {
  if (code.startsWith(CUSTOM_PREFIX)) return code.slice(CUSTOM_PREFIX.length);
  return ALL.find((o) => o.code === code)?.label ?? code;
}

/** 예전 컨디션 3택을 기분 칩으로(사용자 결정). */
export const CONDITION_TO_MOOD = { good: 'mood.happy', normal: 'mood.normal', bad: 'mood.tired' } as const;

/**
 * 몸이 힘든 날인지. 운동 추천이 강도를 낮출 때 쓴다(예전엔 컨디션 "나쁨" 하나로 판단했다).
 */
const ROUGH = new Set(['period_pain', 'cramp', 'pelvic_pain', 'nausea', 'mood.tired', 'mood.lethargic']);
export const isRoughDay = (codes: string[] | undefined) => !!codes?.some((c) => ROUGH.has(c));

/**
 * 자주 넣은 항목. 지금까지 기록에서 두 번 이상 나온 코드를 많이 쓴 순으로.
 * 매일 같은 증상을 넣는 사람이 긴 목록을 내려가지 않게 맨 위에 모아 준다.
 */
export function frequentTags(lists: (string[] | undefined)[], limit = 10): string[] {
  const count = new Map<string, number>();
  lists.forEach((codes) => codes?.forEach((c) => count.set(c, (count.get(c) ?? 0) + 1)));
  return [...count.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([c]) => c);
}
