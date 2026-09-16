// 체중 기록에서 화면에 필요한 값들을 뽑는다. 저장은 useAppStore.weightLog(날짜키 → kg).

/** 입력 허용 범위. 온보딩·프로필의 몸무게 제한과 같은 값을 쓴다. */
export const WEIGHT_LIMITS = { min: 25, max: 250 };

export interface WeightPoint {
  date: string; // dateKey (YYYY-MM-DD)
  kg: number;
}

/** 오래된 날짜부터 정렬해서 돌려준다. 그래프와 목록이 같은 순서를 쓰게 하려고 한 곳에서 정렬한다. */
export function toSortedPoints(log: Record<string, number>): WeightPoint[] {
  return Object.keys(log)
    .sort()
    .map((date) => ({ date, kg: log[date] }));
}

export interface WeightSummary {
  latest: WeightPoint | null;
  /** 직전 기록 대비 증감(kg). 기록이 하나뿐이면 null. */
  change: number | null;
  /** 목표까지 남은 kg. 목표가 없으면 null. 목표를 지났으면 음수. */
  toTarget: number | null;
  /** 목표 달성 여부. 감량·증량 어느 방향인지 첫 기록 기준으로 판단한다. */
  reachedTarget: boolean;
  /**
   * 직전 대비 변화가 목표 쪽으로 간 것인지. 목표가 없으면 null.
   * 증량이 목표인 사람에게 "늘었다"를 경고색으로 보여주면 안 되므로 색은 이 값으로 정한다.
   */
  movingToTarget: boolean | null;
  min: number | null;
  max: number | null;
}

export function summarize(points: WeightPoint[], targetWeight: number | null): WeightSummary {
  if (points.length === 0) {
    return {
      latest: null,
      change: null,
      toTarget: null,
      reachedTarget: false,
      movingToTarget: null,
      min: null,
      max: null,
    };
  }

  const latest = points[points.length - 1];
  const prev = points.length >= 2 ? points[points.length - 2] : null;
  const kgs = points.map((p) => p.kg);
  const change = prev ? round1(latest.kg - prev.kg) : null;

  let toTarget: number | null = null;
  let reachedTarget = false;
  let movingToTarget: boolean | null = null;
  if (targetWeight != null) {
    toTarget = round1(latest.kg - targetWeight);
    // 첫 기록이 목표보다 무거웠으면 감량, 가벼웠으면 증량으로 본다.
    const losing = points[0].kg >= targetWeight;
    reachedTarget = losing ? latest.kg <= targetWeight : latest.kg >= targetWeight;
    if (change != null && change !== 0) movingToTarget = losing ? change < 0 : change > 0;
  }

  return {
    latest,
    change,
    toTarget,
    reachedTarget,
    movingToTarget,
    min: Math.min(...kgs),
    max: Math.max(...kgs),
  };
}

export interface WeightChartData {
  points: { x: number; y: number }[];
  /** 목표선의 y(0~1). 목표가 없으면 null. */
  targetY: number | null;
}

/**
 * 꺾은선 그래프용 좌표(0~1). y는 위가 1이다.
 *
 * 체중은 변화 폭이 작아서(50→51kg) 최소~최대를 그대로 쓰면 1kg 차이가 화면 전체를 오르내려
 * 과장돼 보인다. 최소 표시 범위(minSpan)를 둬서 완만하게 그린다.
 *
 * 목표선도 반드시 이 함수 안에서 같은 자로 계산한다. 데이터만으로 스케일을 잡고
 * 목표를 따로 계산하면 점선이 곡선과 다른 축 위에 놓여 위치가 아무 의미가 없어진다.
 */
export function buildChartData(
  points: WeightPoint[],
  targetWeight: number | null,
  minSpan = 4
): WeightChartData {
  if (points.length === 0) return { points: [], targetY: null };

  const kgs = points.map((p) => p.kg);
  // 목표가 있으면 범위에 함께 넣는다. 곡선이 조금 눌리더라도 "목표까지 얼마나"가 보여야 한다.
  if (targetWeight != null) kgs.push(targetWeight);

  const lo = Math.min(...kgs);
  const hi = Math.max(...kgs);
  const mid = (lo + hi) / 2;
  const span = Math.max(hi - lo, minSpan);
  const bottom = mid - span / 2;
  const toY = (kg: number) => (kg - bottom) / span;

  return {
    points: points.map((p, i) => ({
      // 점이 하나면 나누기 0이 되므로 가운데에 찍는다.
      x: points.length === 1 ? 0.5 : i / (points.length - 1),
      y: toY(p.kg),
    })),
    targetY: targetWeight == null ? null : toY(targetWeight),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
