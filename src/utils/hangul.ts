/**
 * 초성 검색.
 *
 * "ㄱㅊ"로 곱창구이를, "ㅃㄹㄱ"로 빠르게 걷기를 찾는다. 재료·운동 이름은 길고 타자가 귀찮아서,
 * 검색창에 두세 글자만 치고 고르는 게 실제로 더 빠르다.
 *
 * 찾은 자리(시작 위치와 길이)를 함께 돌려준다. 화면에서 그 부분만 색을 입히려면 위치가 필요하다.
 * 초성 한 글자는 한글 한 글자에서 나오므로, 초성으로 맞춘 위치가 원래 글자 위치와 그대로 맞는다.
 */

/** 한글 유니코드 순서대로. `(코드 - 0xAC00) / 588`이 이 배열의 자리가 된다. */
const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const CHOSUNG_SPAN = 588; // 중성 21 × 종성 28

/**
 * 된소리는 자판에서 shift를 눌러야 나온다. "ㄱㄷㄱ"로 깍두기를 찾으려는 사람을 빈손으로 보내지 않는다.
 * 반대 방향(ㄲ로 ㄱ 찾기)은 열어두지 않는다 — 굳이 shift를 눌렀다면 된소리를 찾는 중이다.
 */
const TENSE: Record<string, string> = {
  ㄱ: 'ㄲ',
  ㄷ: 'ㄸ',
  ㅂ: 'ㅃ',
  ㅅ: 'ㅆ',
  ㅈ: 'ㅉ',
};

/** 완성된 한글 한 글자의 초성. 한글이 아니면 null. */
export function chosungOf(char: string): string | null {
  const code = char.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return null;
  return CHOSUNG[Math.floor((code - HANGUL_START) / CHOSUNG_SPAN)];
}

/** 자음 한 글자(ㄱ~ㅎ)인지. 키보드에서 치는 호환 자모 기준. */
function isChosungChar(char: string): boolean {
  return CHOSUNG.includes(char);
}

function charMatches(target: string, q: string): boolean {
  if (isChosungChar(q)) {
    const cho = chosungOf(target);
    if (cho === null) return target === q; // 이름에 자음이 그대로 들어간 경우(예: "ㄱ자 스트레칭")
    return cho === q || cho === TENSE[q];
  }
  return target.toLowerCase() === q.toLowerCase();
}

export interface MatchRange {
  start: number;
  length: number;
}

/**
 * 검색어가 이름의 어디에 걸리는지. 안 걸리면 null.
 *
 * 초성과 일반 글자를 섞어 쳐도 된다("김ㅊ"). 글자 단위로 각각 판단한다.
 */
export function matchRange(text: string, query: string): MatchRange | null {
  const q = query.trim();
  if (!q) return null;
  if (q.length > text.length) return null;

  for (let start = 0; start + q.length <= text.length; start++) {
    let hit = true;
    for (let i = 0; i < q.length; i++) {
      if (!charMatches(text[start + i], q[i])) {
        hit = false;
        break;
      }
    }
    if (hit) return { start, length: q.length };
  }
  return null;
}

/**
 * 검색어로 목록을 거른다. 걸린 자리를 함께 담아 화면이 그 부분만 색칠할 수 있게 한다.
 * 검색어가 비면 전부 돌려준다(자리는 null).
 */
export function searchByName<T>(
  items: readonly T[],
  query: string,
  nameOf: (item: T) => string
): { item: T; match: MatchRange | null }[] {
  const q = query.trim();
  if (!q) return items.map((item) => ({ item, match: null }));

  const found: { item: T; match: MatchRange }[] = [];
  items.forEach((item) => {
    const match = matchRange(nameOf(item), q);
    if (match) found.push({ item, match });
  });
  // 앞에서 걸린 것부터. "치킨"을 찾을 때 "치킨"이 "양념 치킨"보다 위로 온다.
  found.sort((a, b) => a.match.start - b.match.start);
  return found;
}
