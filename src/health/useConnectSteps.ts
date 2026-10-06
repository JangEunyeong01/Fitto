import { useState } from 'react';
import { useToastStore } from '../store/useToastStore';
import { connectSteps } from './useStepRunner';
import { openInstallPage } from './steps';

/**
 * 걸음 연결 버튼이 쓰는 훅(홈 걸음 카드·걸음 상세·설정). 결과마다 무엇을 하면 되는지 토스트로 알려준다.
 * 연결은 권한 창 → 한 달치 읽기라 몇 초 걸려서 진행 중 표시(busy)도 같이 준다.
 */
export function useConnectSteps() {
  const showToast = useToastStore((s) => s.show);
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await connectSteps();
      if (result === 'connected') showToast('걸음 수를 연결했어요');
      else if (result === 'denied') showToast('걸음 읽기를 허용해야 연결돼요');
      else if (result === 'needs-install') {
        showToast('헬스 커넥트가 필요해요', { label: '설치하기', onPress: openInstallPage });
      } else showToast('이 기기에서는 걸음 수를 읽을 수 없어요');
    } catch {
      showToast('연결하지 못했어요. 잠시 후 다시 시도해 주세요');
    } finally {
      setBusy(false);
    }
  };

  return { connect, busy };
}
