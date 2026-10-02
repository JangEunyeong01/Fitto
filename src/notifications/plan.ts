import type { Alarms, Persona } from '../store/useAppStore';
import { personaCopy } from '../copy/persona';
import { addDays, getUpcomingDates, toDateKey, type PeriodSettings } from '../utils/periodCycle';

/**
 * 기기 알림 계획 — "언제, 무슨 문구로 울릴지" 목록만 만든다(예약은 schedule.ts).
 *
 * 시간 계산이 몰리는 곳이라 기기·화면과 떼어 순수 함수로 둔다. scripts/check-notify.mjs가
 * 방해 금지 시간, 자정을 넘는 구간, 이미 지난 시각, 목표를 채운 날 같은 경우를 돌려 본다.
 *
 * 로컬 알림은 예약할 때 문구가 정해진다. 그래서 물·식사를 기록하거나 앱을 열 때마다
 * 다시 계획해 "목표까지 ○ml"를 최신 값으로 바꾸고, 이미 한 일은 알림에서 뺀다.
 */

export type NotifyTarget = 'home' | 'diet' | 'period';

export interface PlannedNotification {
  id: string;
  at: Date;
  title: string;
  body: string;
  target: NotifyTarget;
}

export interface PlanInput {
  now: Date;
  alarms: Alarms;
  persona: Persona;
  waterGoal: number;
  /** 날짜별 마신 물(ml). 오늘 것만 쓴다. */
  waterByDate: Record<string, number>;
  /** 날짜별로 기록한 끼니. 기록한 끼니의 그날 알림은 뺀다. */
  mealsLogged: Record<string, string[]>;
  period: { on: boolean; setupDone: boolean; settings: PeriodSettings };
}

/** 물·식사는 앱을 자주 여니 사흘치만. 주 1회 알림과 생리는 일주일 앞까지 본다. iOS는 예약을 64개까지만 둔다. */
const DAILY_DAYS = 3;
const WEEKLY_DAYS = 7;

const MEALS = [
  { code: 'breakfast', label: '아침' },
  { code: 'lunch', label: '점심' },
  { code: 'dinner', label: '저녁' },
] as const;

/** 방해 금지가 꺼져 있을 때 물 알림을 보낼 깨어 있는 시간. */
const DEFAULT_DAY = { from: '08:00', to: '22:00' };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** dateKey 날짜의 hh:mm(분)을 기기 시간대 Date로. */
function at(dateKey: string, minutes: number): Date {
  const [y, mo, d] = dateKey.split('-').map(Number);
  return new Date(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

/** 방해 금지 시간 안인지. 22:30–07:00처럼 자정을 넘는 구간도 다룬다. */
export function inQuiet(minutes: number, alarms: Alarms): boolean {
  if (!alarms.quiet) return false;
  const from = toMinutes(alarms.quietFrom);
  const to = toMinutes(alarms.quietTo);
  if (from === to) return false;
  return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

export function planNotifications(input: PlanInput): PlannedNotification[] {
  const { now, alarms, persona } = input;
  const today = toDateKey(now);
  const out: PlannedNotification[] = [];

  const push = (n: PlannedNotification) => {
    if (n.at.getTime() <= now.getTime()) return;
    const minutes = n.at.getHours() * 60 + n.at.getMinutes();
    if (inQuiet(minutes, alarms)) return;
    out.push(n);
  };

  for (let i = 0; i < DAILY_DAYS; i++) {
    const day = addDays(today, i);

    if (alarms.water && input.waterGoal > 0) {
      // 오늘은 지금까지 마신 만큼 빼고, 다음 날부터는 0부터.
      const drunk = i === 0 ? input.waterByDate[day] ?? 0 : 0;
      const remain = input.waterGoal - drunk;
      if (remain > 0) {
        // 깨어 있는 시간 = 방해 금지가 끝나는 때부터 시작하는 때까지.
        const from = toMinutes(alarms.quiet ? alarms.quietTo : DEFAULT_DAY.from);
        let to = toMinutes(alarms.quiet ? alarms.quietFrom : DEFAULT_DAY.to);
        if (to <= from) to += 24 * 60;
        const step = alarms.waterEvery * 60;
        for (let m = from + step; m < to && m < 24 * 60; m += step) {
          push({
            id: `water-${day}-${m}`,
            at: at(day, m),
            title: '물 마시기',
            body: (personaCopy.waterAlarm[persona] as (v: { remain: number }) => string)({ remain }),
            target: 'home',
          });
        }
      }
    }

    if (alarms.meal) {
      const logged = input.mealsLogged[day] ?? [];
      MEALS.forEach((meal, idx) => {
        const time = alarms.mealTimes[idx];
        if (!time || logged.includes(meal.code)) return;
        push({
          id: `meal-${day}-${meal.code}`,
          at: at(day, toMinutes(time)),
          title: `${meal.label} 기록`,
          body: personaCopy.mealAlarm[persona]({ meal: meal.label }),
          target: 'diet',
        });
      });
    }
  }

  for (let i = 0; i < WEEKLY_DAYS; i++) {
    const day = addDays(today, i);
    const weekday = at(day, 0).getDay(); // 0 일요일, 1 월요일

    if (alarms.weigh && weekday === 1) {
      push({ id: `weigh-${day}`, at: at(day, toMinutes('08:30')), title: '체중 기록', body: personaCopy.weighAlarm[persona](), target: 'home' });
    }
    if (alarms.report && weekday === 0) {
      push({ id: `report-${day}`, at: at(day, toMinutes('20:00')), title: '주간 리포트', body: personaCopy.reportAlarm[persona](), target: 'home' });
    }
  }

  const { period } = input;
  if (alarms.period && period.on && period.setupDone) {
    const { nextStart } = getUpcomingDates(today, period.settings);
    const dayBefore = addDays(nextStart, -1);
    if (dayBefore >= today && dayBefore <= addDays(today, WEEKLY_DAYS)) {
      push({
        id: `period-${nextStart}`,
        at: at(dayBefore, toMinutes('09:00')),
        // 내용을 숨기기로 했으면 잠금화면에는 무엇에 대한 알림인지조차 안 보이게 한다.
        title: alarms.periodPreview ? '생리 예정' : '피또',
        body: alarms.periodPreview ? personaCopy.periodAlarm[persona]() : '피또가 알려줄 게 있어요',
        target: 'period',
      });
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
