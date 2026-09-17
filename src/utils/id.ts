/**
 * 기록 ID 생성기.
 *
 * 서버는 모든 기록 ID를 UUID v4로 받는다(명세 0-2). 앱이 ID를 만들어 보내기 때문에
 * 형식이 다르면 요청 본문 파싱 단계에서 거절당한다.
 *
 * 예전에는 `${Date.now()}`를 썼는데, 같은 밀리초에 두 건을 만들면 ID가 겹치고
 * 서버에 올릴 때도 형식이 맞지 않았다.
 */
export function newId(): string {
  // 웹·최신 런타임에는 표준 구현이 있다. 있으면 그걸 쓴다.
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }

  // 없으면 난수로 v4 형식을 만든다. getRandomValues는 React Native에도 있다.
  const bytes = new Uint8Array(16);
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // v4 표시와 variant 비트를 규격대로 맞춘다.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 서버에 보낼 수 있는 형식인지. 예전 방식으로 만든 ID를 걸러낼 때 쓴다. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
