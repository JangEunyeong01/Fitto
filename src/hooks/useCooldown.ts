import { useEffect, useState } from 'react';

/**
 * 몇 초 동안 다시 못 누르게 하는 카운트다운. [남은 초, 시작하기]
 *
 * 서버가 코드 재발송을 1분에 한 번으로 막아서, 화면도 그동안 버튼을 막고 남은 시간을 보여준다.
 * 안 막으면 눌러도 아무 일이 없는 것처럼 보인다(서버는 조용히 거절한다).
 */
export function useCooldown(): [number, (seconds: number) => void] {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  return [left, setLeft];
}
