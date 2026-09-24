import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, View, Text, StyleSheet } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { useTheme } from '../theme/useTheme';
import { typography } from '../theme/tokens';
import { FITTO_FACE } from '../theme/assets';
import { useAppStore } from '../store/useAppStore';
import { useToastStore } from '../store/useToastStore';
import { confirmOwner } from '../utils/deviceAuth';

/**
 * 이만큼 나가 있다 돌아오면 다시 잠근다.
 * 0이면 카메라로 음식 사진 한 장 찍고 돌아올 때마다 지문을 대야 한다. 너무 길면 잠금 의미가 없다.
 */
const LOCK_AFTER_MS = 30_000;

/**
 * 화면 잠금. 앱 맨 위에 덮는다.
 *
 * 두 가지를 한다.
 * - **잠금**: 앱을 처음 열 때, 그리고 30초 넘게 나갔다 돌아올 때 본인 확인을 받는다
 * - **가림**: 앱이 뒤로 가는 순간 화면을 덮는다. 최근 앱 목록에 뜨는 미리보기가 이 순간 찍혀서,
 *   안 덮으면 잠금을 걸어 놔도 생리 기록이나 체중이 미리보기로 보인다
 */
export default function LockGate() {
  const { colors } = useTheme();
  const screenLock = useAppStore((s) => s.screenLock);
  const setScreenLock = useAppStore((s) => s.setScreenLock);
  const showToast = useToastStore((s) => s.show);

  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false);
  const backgroundAt = useRef<number | null>(null);
  // 인증 창(특히 안드로이드 PIN 입력)이 뜨면 앱이 잠깐 뒤로 간 것으로 잡힌다.
  // 그걸 "나갔다 옴"으로 세면 PIN을 30초 넘게 치는 동안 또 잠겨서 끝나지 않는다.
  const authenticating = useRef(false);

  // 앱을 켤 때. 저장된 설정은 비동기로 올라오므로, 올라온 뒤에 판단해야 잠금을 놓치지 않는다.
  useEffect(() => {
    const lockIfOn = () => {
      if (useAppStore.getState().screenLock) setLocked(true);
    };
    if (useAppStore.persist.hasHydrated()) {
      lockIfOn();
      return;
    }
    return useAppStore.persist.onFinishHydration(lockIfOn);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (authenticating.current) return;
      if (!useAppStore.getState().screenLock) return;

      if (next !== 'active') {
        setCovered(true);
        if (next === 'background' && backgroundAt.current === null) backgroundAt.current = Date.now();
        return;
      }

      setCovered(false);
      if (backgroundAt.current !== null && Date.now() - backgroundAt.current >= LOCK_AFTER_MS) {
        setLocked(true);
      }
      backgroundAt.current = null;
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    const result = await confirmOwner('피또 잠금 해제');
    authenticating.current = false;

    if (result === 'ok') {
      setLocked(false);
      return;
    }
    if (result === 'no-device-lock') {
      // 폰 잠금을 없앴다면 확인할 방법이 없다. 여기서 막으면 앱을 영영 못 연다.
      setScreenLock(false);
      setLocked(false);
      showToast('폰 잠금이 꺼져 있어서 화면 잠금도 껐어요');
    }
    // 취소·실패면 잠금 화면에 그대로 둔다. 버튼으로 다시 시도한다.
  }, [setScreenLock, showToast]);

  // 잠기면 바로 인증 창을 띄운다. 버튼을 한 번 더 누르게 할 이유가 없다.
  useEffect(() => {
    if (locked) unlock();
  }, [locked, unlock]);

  // 설정에서 잠금을 끄면 덮개도 바로 걷는다.
  useEffect(() => {
    if (!screenLock) {
      setLocked(false);
      setCovered(false);
    }
  }, [screenLock]);

  if (!locked && !covered) return null;

  return (
    <View style={[styles.cover, { backgroundColor: colors.bg }]} accessibilityViewIsModal>
      <Image source={FITTO_FACE} style={styles.face} resizeMode="contain" />
      {locked && (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>피또가 잠겨 있어요</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>지문·얼굴 또는 폰 비밀번호로 열 수 있어요</Text>
          <PrimaryButton label="잠금 풀기" onPress={unlock} style={styles.button} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2000,
    elevation: 2000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  face: {
    width: 96,
    height: 90,
  },
  title: {
    ...typography.itemTitle,
    marginTop: 20,
  },
  body: {
    ...typography.body,
    marginTop: 6,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
    marginTop: 28,
  },
});
