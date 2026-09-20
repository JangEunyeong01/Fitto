import { useEffect, useState } from 'react';

/**
 * 오래 걸리는 요청 중에 무슨 일이 일어나고 있는지 알려주는 문구.
 *
 * 운영 서버(무료 요금제)는 15분 쉬면 잠든다. 다시 깨는 데 1분 30초쯤 걸리는데,
 * 그동안 스피너만 돌면 고장으로 보인다. 실제로 재는 건 "기다린 시간"뿐이고,
 * 서버가 자고 있는지는 알 수 없어서 문구도 단정하지 않는다.
 *
 * @param busy 요청이 진행 중인지
 * @returns 보여줄 문구. 아직 이를 때는 null
 */
export function useWakeNotice(busy: boolean): string | null {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  if (!busy) return null;
  // 3초 안에 끝나는 게 보통이다. 그 전에 문구를 띄우면 깜빡이기만 한다.
  if (elapsed < 3000) return null;
  if (elapsed < 30_000) return '서버를 깨우는 중이에요. 처음 연결은 1분 넘게 걸릴 수 있어요.';
  return '거의 다 됐어요. 조금만 더 기다려 주세요.';
}
