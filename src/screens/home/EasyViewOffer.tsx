import React, { useEffect, useState } from 'react';
import { PixelRatio } from 'react-native';
import AlertModal from '../../components/AlertModal';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';

/** 폰 글꼴 크기가 이만큼 크면 간단히 보기가 필요한 사람일 가능성이 높다. */
const SUGGEST_FROM = 1.3;

/**
 * 폰 글씨를 크게 쓰는 사람에게 간단히 보기를 한 번만 제안한다.
 * 필요한 사람일수록 설정까지 찾아 들어가기 어려워서, 앱이 먼저 묻는다. 거절하면 다시 묻지 않는다.
 * 튜토리얼이 끝난 뒤에만 — 처음 켠 사람에게 창 두 개를 연달아 띄우지 않게.
 */
export default function EasyViewOffer() {
  const easyView = useAppStore((s) => s.easyView);
  const offered = useAppStore((s) => s.easyViewOffered);
  const tutorialDone = useAppStore((s) => s.tutorialDone);
  const setEasyView = useAppStore((s) => s.setEasyView);
  const setOffered = useAppStore((s) => s.setEasyViewOffered);
  const showToast = useToastStore((s) => s.show);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!easyView && !offered && tutorialDone && PixelRatio.getFontScale() >= SUGGEST_FROM) setVisible(true);
  }, [easyView, offered, tutorialDone]);

  const close = () => {
    setOffered();
    setVisible(false);
  };

  return (
    <AlertModal
      visible={visible}
      onClose={close}
      title="글씨를 크게 쓰고 계시네요"
      body="간단히 보기로 볼까요? 글씨가 크고 버튼이 또렷해져요. 기록은 그대로고, 설정 맨 위에서 언제든 바꿀 수 있어요."
      primaryLabel="간단히 보기로"
      onPrimary={() => {
        setEasyView(true);
        close();
        showToast('간단히 보기로 바꿨어요', { label: '되돌리기', onPress: () => setEasyView(false) });
      }}
      laterLabel="괜찮아요"
    />
  );
}
