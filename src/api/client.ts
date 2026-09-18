import type { ApiErrorBody } from './types';

/**
 * 서버 호출 공통 처리. 화면은 이 파일을 직접 쓰지 않고 리소스별 함수를 거친다.
 * 주소는 EXPO_PUBLIC_API_URL로 받는다(빌드에 그대로 박히므로 비밀값은 넣지 않는다).
 */

/**
 * 개발용 주소가 그대로 배포되는 걸 막는다.
 *
 * 이 값은 빌드할 때 번들에 박혀서 나중에 고칠 수 없다. 그런데 틀려도 티가 안 난다 —
 * 게스트는 서버를 안 부르므로 앱이 멀쩡히 돌고, 로그인한 사람만 동기화가 조용히 실패한다.
 * 그래서 첫 실행에서 바로 드러나도록 여기서 끊는다.
 *
 * 평문 http는 안드로이드가 기본으로 차단하기도 한다. 주소가 http면 배포된 앱은 어차피 못 쓴다.
 */
function checkApiUrl(url: string, isDev: boolean): string {
  if (isDev) {
    return url;
  }
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL이 비어 있습니다. 빌드 환경변수를 확인해 주세요.');
  }
  if (url.startsWith('http://')) {
    throw new Error(`운영 빌드의 서버 주소는 https여야 합니다: ${url}`);
  }
  return url;
}

const BASE_URL = checkApiUrl(process.env.EXPO_PUBLIC_API_URL ?? '', __DEV__);

/** 서버가 내려준 에러. message는 그대로 토스트에 띄울 수 있는 한국어 문장이다(명세 0-6). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: { field: string; reason: string }[];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.status;
    this.code = body.code;
    this.fields = body.errors ?? [];
  }
}

/** 서버에 닿지 못했을 때. 오프라인 큐에 쌓을지 판단하는 기준이 된다. */
export class NetworkError extends Error {
  constructor() {
    super('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
    this.name = 'NetworkError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Bearer 토큰. 세션 관리는 인증을 붙일 때 이 위층에서 한다. */
  token?: string | null;
  query?: Record<string, string | number | undefined>;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, query } = options;

  const search = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined) search.append(k, String(v));
  });
  const qs = search.toString();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}${qs ? `?${qs}` : ''}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError();
  }

  // 204 No Content(삭제 계열)는 본문이 없다.
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // 서버가 형식을 못 지킨 응답(프록시 502 등)도 같은 모양으로 감싸 화면 처리를 하나로 둔다.
    const parsed: ApiErrorBody =
      data && typeof data.code === 'string'
        ? data
        : { status: res.status, code: 'UNKNOWN', message: '잠시 후 다시 시도해 주세요.' };
    throw new ApiError(parsed);
  }

  return data as T;
}
