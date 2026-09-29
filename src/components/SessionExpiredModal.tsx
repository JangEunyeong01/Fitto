import React from 'react';
import { useNavigation } from '@react-navigation/native';
import AlertModal from './AlertModal';
import { useAuthStore } from '../store/useAuthStore';
import { useOutboxStore } from '../store/useOutboxStore';

/**
 * 로그인이 풀렸을 때 한 번 띄우는 안내(명세 4장, 시안 36).
 *
 * 예전에는 토큰 갱신이 거절되면 조용히 로그아웃됐다. 화면은 그대로라 알 방법이 없고,
 * 기록은 기기에만 쌓이다가 폰을 바꿀 때 사라진다. 복구하려면 사용자가 움직여야 하는 오류라
 * 토스트가 아니라 확인을 받는 창으로 띄운다.
 */
export default function SessionExpiredModal() {
  const navigation = useNavigation<any>();
  const visible = useAuthStore((s) => s.sessionExpired);
  const dismiss = useAuthStore((s) => s.dismissSessionExpired);
  const pendingCount = useOutboxStore((s) => s.items.length);

  const goLogin = () => {
    dismiss();
    // 설정 탭 안의 로그인 화면으로 보낸다. 탭을 먼저 옮겨야 그 스택이 살아난다.
    navigation.navigate('Main', { screen: 'Settings', params: { screen: 'Login' } });
  };

  return (
    <AlertModal
      visible={visible}
      onClose={dismiss}
      title="로그인이 풀렸어요"
      body={`기록은 이 기기에 그대로 있어요.${
        pendingCount > 0 ? ` 아직 올리지 못한 기록 ${pendingCount}건은 다시 로그인하면 이어서 올라가요.` : ''
      }`}
      primaryLabel="다시 로그인"
      onPrimary={goLogin}
      laterLabel="나중에"
    />
  );
}
