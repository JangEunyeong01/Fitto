import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';

/**
 * 토큰 전용 저장소.
 *
 * AsyncStorage는 암호화하지 않는다. 기기를 루팅하거나 백업을 뜨면 파일이 그대로 읽힌다.
 * 토큰이 읽히면 비밀번호 없이 그 계정으로 API를 부를 수 있으므로,
 * 네이티브에서는 OS가 관리하는 저장소(iOS 키체인 / 안드로이드 Keystore)에 둔다.
 *
 * 웹에는 그런 저장소가 없다. react-native-web으로도 돌리고 있어서 플랫폼을 보고 갈라준다.
 * 웹은 여전히 평문이지만, 브라우저에서 돌리는 이상 어디에 두든 스크립트가 읽을 수 있어
 * 저장 위치를 바꾼다고 나아지지 않는다. 대신 accessToken 수명을 30분으로 짧게 잡아뒀다.
 *
 * SecureStore는 값 하나에 2KB 제한이 있다. 여기 담는 건 토큰 두 개와 이메일이라 여유가 있다.
 */
const secure: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

export const tokenStorage: StateStorage = Platform.OS === 'web' ? AsyncStorage : secure;
