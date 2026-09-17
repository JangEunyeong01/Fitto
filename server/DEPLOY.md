# 배포와 배포 후 확인

환경변수 목록은 `.env.example`에 있습니다. 여기에는 **올린 뒤에 확인하는 절차**를 적습니다.

설정이 틀려도 서버는 대개 잘 뜹니다. 그래서 눈으로 보고 넘어가면 놓칩니다.
아래는 전부 명령 한 줄로 확인할 수 있는 것만 모았습니다. `<도메인>`을 실제 주소로 바꿔서 그대로 실행하면 됩니다.

## 부팅이 거부되는 설정

다음은 서버가 아예 뜨지 않습니다(`StartupSecurityCheck`). 로그에 `[설정 오류]`로 원인이 찍힙니다.

- `JWT_SECRET`이 비었거나 32바이트 미만, 또는 개발용 기본값
- 운영인데 `DB_URL`·`DB_USER`·`CORS_ORIGINS`가 비어 있음
- 운영인데 `ddl-auto`가 `update`
- `CORS_ORIGINS`에 `*`·`localhost`·`127.0.0.1`·평문 `http`가 들어 있음

## 배포 후 확인

### 1. 살아 있는지

```bash
curl -i https://<도메인>/health
```

`200`이어야 합니다.

### 2. HTTP로 들어가면 HTTPS로 보내는지

```bash
curl -I http://<도메인>/health
```

`301` 또는 `308`이고 `Location`이 `https://`여야 합니다.
이건 대개 앞단(Render·Railway 등)이 처리합니다. 평문으로 200이 나오면 호스팅 쪽 설정을 봐야 합니다.

### 3. HSTS가 붙는지

```bash
curl -sI https://<도메인>/health | grep -i strict-transport
```

`Strict-Transport-Security: max-age=31536000 ; includeSubDomains`가 나와야 합니다.

안 나오면 프록시 뒤에서 HTTPS를 인식하지 못한 것입니다. `forward-headers-strategy: framework`가 켜져 있어야
`X-Forwarded-Proto`를 읽어서 이 헤더를 붙입니다.

### 4. 허용하지 않은 주소에서 부를 수 없는지

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS https://<도메인>/users/me -H "Origin: https://evil.example.com" -H "Access-Control-Request-Method: GET"
```

`403`이어야 합니다. `200`이면 `CORS_ORIGINS`가 잘못 들어간 것입니다.

### 5. 응답 헤더

```bash
curl -sI https://<도메인>/health
```

이 세 개가 있어야 합니다.

| 헤더 | 값 | 없으면 |
|------|-----|--------|
| `X-Content-Type-Options` | `nosniff` | 브라우저가 JSON을 HTML로 추측해 실행할 수 있음 |
| `X-Frame-Options` | `DENY` | 다른 사이트가 iframe으로 감쌀 수 있음 |
| `Content-Type` | `application/json` | — |

### 6. 요청 크기 제한

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<도메인>/auth/login -H "Content-Type: application/json" -H "Transfer-Encoding: chunked" -d '{}'
```

`413`이어야 합니다. 길이를 밝히지 않는 요청을 받지 않는다는 뜻입니다.

## 앱 빌드

`EXPO_PUBLIC_API_URL`은 **빌드할 때 번들에 박혀서 나중에 고칠 수 없습니다.**

`https://`로 시작하지 않으면 운영 빌드가 첫 실행에서 에러를 냅니다(`src/api/client.ts`).
개발 빌드에서는 이 검사를 하지 않으므로 `http://localhost:8080`을 그대로 쓸 수 있습니다.
