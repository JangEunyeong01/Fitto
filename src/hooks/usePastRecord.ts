import { useEffect, useState } from 'react';
import { isDateLoaded, pullDate } from '../sync/pullDate';
import { useAuthStore } from '../store/useAuthStore';

/**
 * 날짜를 바꿀 때 그 날짜 기록을 서버에서 받아온다. 받는 동안 true.
 *
 * 로그인 때 받아오는 건 최근 이틀치뿐이라, 달력을 넘겨 지난 날짜를 열면 서버에는 있는 기록이
 * 화면에는 비어 보인다. 화면이 "기록이 없어요"라고 단정하기 전에 한 번 확인한다.
 */
export function usePastRecord(date: string): boolean {
  const status = useAuthStore((s) => s.status);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== 'member' || isDateLoaded(date)) return;

    let alive = true;
    setLoading(true);
    pullDate(date).finally(() => {
      // 날짜를 빠르게 넘기면 먼저 보낸 요청이 나중에 끝난다. 지난 요청의 결과로 상태를 바꾸지 않는다.
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [date, status]);

  return loading;
}
