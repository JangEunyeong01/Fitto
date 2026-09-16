# 🔌 Fitto API 명세서

> 작성일: 2026.09 | 버전: v1.1
> Base URL: `https://api.fitto.com/v1`
> 인증: JWT Bearer Token
> Content-Type: `application/json`
> 백엔드: Spring Boot (2차 도입). 1차 MVP는 기기 저장(AsyncStorage)만으로 동작한다.

---

## v1.0 → v1.1 주요 변경

| 구분 | 내용 |
|------|------|
| 흐름 | **게스트 모드 도입.** 로그인 없이 기기에 저장하며 쓰다가, 가입하면 기기 기록을 서버로 옮긴다 (`POST /me/import`) |
| 계산 | **서버 기준.** 목표 칼로리·물 목표·운동 소모 칼로리·음식 칼로리는 서버가 계산한 값이 최종값. 공식을 해리스-베네딕트 → Mifflin-St Jeor로 정정 |
| 코드값 | 목표 4개 → 6개, 활동량을 숫자(`1.375`) → 코드(`light`) 5단계로. 질환·못 먹는 음식·선호 음식·증상 목록을 앱과 맞춤. 직접 입력값은 `custom*` 배열로 분리 |
| 식단 | 양을 `amount`(숫자) + `unit`(`g`/`serving`)으로. 메모 API를 음식 단위 → 날짜+끼니 단위(`PUT /diet/memo`)로. 음식 수정(PATCH) 추가 |
| 운동 | 운동 수정(PATCH), 루틴 수정·사용 API 추가. `emoji` 제거 → `exerciseCode` |
| 수분 | 누적 `POST` 제거, 절댓값 `PUT`만 사용 (재시도해도 두 번 더해지지 않게) |
| 생리 | 컨디션 기록을 날짜별 덮어쓰기(`PUT /period/daily/{date}`)로. 기간 조회 추가. 주기 미입력 시 404 |
| 추가 | 체중, 걸음수, 직접 입력 재료, 주간 요약, 기록 전체 삭제 |
| 공통 | 클라이언트 생성 ID 허용(멱등), 생성·수정 시 리소스 전체 반환, 날짜 시간대 규칙, 에러 `code` 목록 |

---

## 구현 현황

*마지막 갱신: 2026-09-17*

| 영역 | 앱 | 서버 |
|------|-----|------|
| 인증 (4장) | 미구현 | ✅ signup·login·refresh·logout |
| 유저 (5장) | 로컬 프로필 완료 | 엔티티·목표 계산 ✅ / `GET·PATCH /users/me` 미구현 |
| 게스트 이전 (6장) | `toImportPayload` ✅ | 미구현 |
| 식단 (7장) | 완료 (로컬) | ✅ 조회·추가·수정·삭제·메모·최근 음식 |
| 운동 (8장) | 완료 (로컬) | 엔티티만 |
| 수분·걸음수·체중 (9~11장) | 완료 (로컬) | 엔티티만 |
| 생리 주기 (12장) | 완료 (로컬) | 엔티티·주기 계산 ✅ / API 미구현 |
| 요약 (13장) | 완료 (로컬) | 미구현 |
| 식품 검색 (14장) | 내장 데이터 | 미구현 |

### 명세와 구현이 다른 지점

| 항목 | 명세 | 현재 구현 | 이유 |
|------|------|-----------|------|
| `foodId` 있을 때 칼로리 계산 (2-4) | 서버가 식품 DB로 계산 | 앱이 보낸 값을 그대로 저장 | 서버에 식품 DB가 아직 없다. 14장 연동 시 서버 계산으로 바꾼다 |
| 로그인 시도 제한 (4장) | 5분 10회 | 같음. 단 메모리 카운터 | 단일 인스턴스 전제. 서버를 늘리면 Redis로 옮긴다 |

---

## 목차

0. [공통 규칙](#0-공통-규칙)
1. [코드값](#1-코드값)
2. [계산 규칙](#2-계산-규칙-서버-기준)
3. [게스트 모드와 가입 흐름](#3-게스트-모드와-가입-흐름) — [앱 상태](#3-1-앱-상태) · [화면 가드](#3-2-화면-가드) · [값이 비어 있을 때](#3-3-값이-비어-있을-때)
4. [인증](#4-인증)
5. [유저](#5-유저)
6. [게스트 데이터 이전](#6-게스트-데이터-이전)
7. [식단](#7-식단)
8. [운동](#8-운동)
9. [수분](#9-수분)
10. [걸음수](#10-걸음수)
11. [체중](#11-체중)
12. [생리 주기](#12-생리-주기)
13. [요약](#13-요약)
14. [식품 검색](#14-식품-검색)
15. [기기에만 저장하는 항목](#15-기기에만-저장하는-항목)
16. [1차 MVP 로컬 저장 구조](#16-1차-mvp-로컬-저장-구조)
17. [에러 코드](#17-에러-코드)

---

## 0. 공통 규칙

### 0-1. 날짜와 시간

| 항목 | 규칙 |
|------|------|
| `date` | 기기 기준 날짜 `YYYY-MM-DD`. 서버는 문자열 그대로 `LocalDate`로 저장하고 **시간대 변환을 하지 않는다** |
| 타임스탬프 | `createdAt`, `updatedAt` 등은 ISO 8601 UTC (`2026-09-12T03:00:00Z`) |
| 미래 날짜 | 서버는 기기의 오늘을 모르므로, 서버 UTC 날짜 + 1일보다 뒤인 `date`만 `400 INVALID_DATE` |
| 오늘이 필요한 계산 | 생리 예정일처럼 "오늘"이 기준인 조회는 `today` 쿼리 파라미터로 받는다 |

> 밤 11시 30분에 먹은 음식이 UTC로 바뀌어 다음 날 기록으로 넘어가는 문제를 막으려는 규칙이다.

### 0-2. ID와 멱등성

- 모든 ID는 UUID v4.
- 기록성 리소스(식단·운동·레시피·루틴·직접 입력 재료)의 `POST`는 요청 본문에 `id`를 넣을 수 있다.
  - 처음 보는 `id` → 생성, `201`
  - 같은 사용자의 이미 있는 `id` → 새로 만들지 않고 기존 리소스 반환, `200`
  - 다른 사용자가 쓰는 `id` → `409 ID_CONFLICT`
- `id`를 생략하면 서버가 발급한다.

> 앱은 누르는 즉시 화면에 반영(낙관적 업데이트)하고 오프라인에서도 기록을 만든다. 클라이언트가 만든 ID를 그대로 쓰면 동기화할 때 임시 ID를 바꿔치기할 필요가 없고, 네트워크 재시도로 같은 기록이 두 번 생기지 않는다.

### 0-3. 요청·응답 형식

- 생성(`POST`)·수정(`PATCH`/`PUT`)은 **리소스 전체**를 돌려준다. 앱이 응답으로 캐시를 바로 갱신한다.
- `PATCH`: 보내지 않은 필드는 유지, `null`을 보낸 필드는 비운다(nullable 필드만).
- 목록 응답은 `{ "items": [...] }`처럼 객체로 감싼다. 배열을 최상위로 돌려주지 않는다.

### 0-4. 인증 토큰

| 토큰 | 유효 기간 | 비고 |
|------|-----------|------|
| accessToken | 30분 | `Authorization: Bearer {accessToken}` |
| refreshToken | 14일 | 갱신할 때마다 새로 발급(로테이션). 이미 쓴 토큰이 다시 오면 탈취로 보고 그 사용자의 모든 refreshToken 폐기 |

인증이 필요 없는 API: `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`. 나머지는 모두 필요.

### 0-5. 단위

| 값 | 단위 |
|----|------|
| 키 | cm (소수 1자리) |
| 체중 | kg (소수 1자리) |
| 칼로리 | kcal (정수) |
| 탄수화물·단백질·지방·당류 | g (소수 1자리) |
| 나트륨 | mg (정수) |
| 수분 | ml (정수) |
| 운동 시간 | 분 (정수) |

영양소 값이 없으면 `0`이 아니라 `null`. "0g"과 "정보 없음"을 구분한다.

### 0-6. 에러 응답

```json
{
  "status": 400,
  "code": "INVALID_INPUT",
  "message": "이름은 필수 입력값입니다.",
  "errors": [
    { "field": "name", "reason": "REQUIRED" }
  ]
}
```

`errors`는 유효성 실패일 때만 있다. `message`는 화면에 그대로 띄울 수 있는 한국어 문장. 전체 목록은 [17. 에러 코드](#17-에러-코드).

---

## 1. 코드값

서버와 앱은 코드로 주고받고, 한글 라벨은 앱 화면에서만 붙인다.

### gender

| 코드 | 라벨 |
|------|------|
| `female` | 여성 |
| `male` | 남성 |

### activityLevel

| 코드 | 라벨 | 칼로리 계수 | 물 계수 |
|------|------|-------------|---------|
| `sedentary` | 거의 안 움직여요 | 1.2 | 1.0 |
| `light` | 가볍게 움직여요 | 1.375 | 1.1 |
| `moderate` | 보통이에요 | 1.55 | 1.2 |
| `active` | 많이 움직여요 | 1.725 | 1.3 |
| `very_active` | 매우 활동적이에요 | 1.9 | 1.4 |

> 계수를 숫자로 저장하면 나중에 계수를 조정할 때 저장된 데이터가 전부 어긋난다. 코드로 저장하고 계수는 서버 설정으로 둔다.

### goal

| 코드 | 라벨 | 칼로리 보정 |
|------|------|-------------|
| `lose_weight` | 체중 감량 | -350 |
| `gain_weight` | 체중 증가 | +350 |
| `maintain` | 체중 유지 | 0 |
| `health` | 건강 관리 | 0 |
| `strength` | 근력 강화 | +200 |
| `endurance` | 체력 증진 | +100 |

### personality

| 코드 | 라벨 |
|------|------|
| `friendly` | 친근형 |
| `strict` | 엄격형 |
| `neutral` | 중립형 |

### diseases (건강 상태)

| 코드 | 라벨 |
|------|------|
| `diabetes` | 당뇨 |
| `hypertension` | 고혈압 |
| `hyperlipidemia` | 고지혈증 |
| `arthritis` | 관절염 |
| `gastritis` | 위염 |
| `anemia` | 빈혈 |
| `gout` | 통풍 |
| `thyroid` | 갑상선 |

목록에 없는 질환은 `customDiseases`에 문자열로.

### preferredFoods (식단 취향)

| 코드 | 라벨 |
|------|------|
| `korean` | 한식 |
| `western` | 양식 |
| `japanese` | 일식 |
| `chinese` | 중식 |
| `bunsik` | 분식 |
| `salad` | 샐러드 |
| `vegetarian` | 채식 |
| `asian` | 아시안 |
| `bakery` | 베이커리 |

목록에 없는 취향은 `customPreferredFoods`에.

### allergies (못 먹는 음식)

알레르기뿐 아니라 먹지 않는 음식(매운 음식, 돼지고기)도 포함한다.

| 코드 | 라벨 |
|------|------|
| `nuts` | 견과류 |
| `dairy` | 유제품 |
| `seafood` | 해산물 |
| `shellfish` | 갑각류 |
| `egg` | 달걀 |
| `gluten` | 밀(글루텐) |
| `soy` | 대두 |
| `peach` | 복숭아 |
| `spicy` | 매운 음식 |
| `pork` | 돼지고기 |

목록에 없는 음식은 `customAllergies`에.

### mealType

| 코드 | 라벨 |
|------|------|
| `breakfast` | 아침 |
| `lunch` | 점심 |
| `dinner` | 저녁 |
| `snack` | 간식 |

### unit (음식 양)

| 코드 | 의미 |
|------|------|
| `g` | 그램 |
| `serving` | 인분. 1인분이 무엇인지는 `servingLabel`("1공기 210g")에 |

### exerciseCode

| 코드 | 라벨 | MET |
|------|------|-----|
| `walking` | 걷기 | 3.5 |
| `brisk_walking` | 빠르게 걷기 | 4.3 |
| `running` | 달리기 | 8.0 |
| `cycling` | 자전거 | 6.8 |
| `swimming` | 수영 | 6.0 |
| `hiking` | 등산 | 6.0 |
| `stair_climbing` | 계단 오르기 | 4.0 |
| `jump_rope` | 줄넘기 | 11.0 |
| `weight_training` | 웨이트 트레이닝 | 5.0 |
| `home_training` | 홈트 | 3.8 |
| `pilates` | 필라테스 | 3.0 |
| `yoga` | 요가 | 2.5 |
| `stretching` | 스트레칭 | 2.3 |

### 운동 설정 (workoutPreference)

| 필드 | 코드 |
|------|------|
| `intensity` | `light` 가볍게 / `normal` 보통 / `hard` 강하게 |
| `equipment` | `bodyweight` 맨손 / `machine` 기구 / `both` 둘 다 |
| `focus` | `upper` 상체 / `lower` 하체 / `full` 전신 / `cardio` 유산소 |

### 생리 컨디션

| 필드 | 코드 |
|------|------|
| `condition` | `good` 좋음 / `normal` 보통 / `bad` 나쁨 |
| `symptoms` | `cramp` 복통 / `headache` 두통 / `bloating` 부기 / `fatigue` 피로 / `irritability` 예민 / `back_pain` 허리 통증 |

---

## 2. 계산 규칙 (서버 기준)

서버가 계산한 값이 최종값이다. 앱에도 같은 공식이 있지만 **게스트 모드에서 쓰거나 저장 전에 미리 보여주는 용도**다. 가입·로그인 후에는 서버 값으로 덮어쓴다. 서버와 앱의 공식이 어긋나지 않게 아래 예시 값을 양쪽 테스트 케이스로 쓴다.

### 2-1. 목표 칼로리

```
BMR  = round(10 × 체중 + 6.25 × 키 − 5 × 나이 + s)     s: male +5, female −161   (Mifflin-St Jeor)
TDEE = round(BMR × 칼로리 계수)
targetCalorie = clamp(TDEE + 목표 보정, 1200, 5000)
```

계산 전에 입력을 자른다: 나이 10~100, 키 100~250, 체중 25~250.

> 예시: female, 26세, 165cm, 55kg, `light`, `lose_weight`
> BMR = round(550 + 1031.25 − 130 − 161) = 1290 → TDEE = round(1290 × 1.375) = 1774 → **1424 kcal**

### 2-2. 물 목표

```
waterGoal = clamp(round(체중 × 30 × 물 계수 / 50) × 50, 500, 4000)
```

> 예시: 55kg, `light` → 55 × 30 × 1.1 = 1815 → **1800 ml**

사용자가 물 목표를 직접 정한 경우(`waterGoalCustom: true`)에는 재계산하지 않는다. [5-2](#patch-usersme--내-정보-수정) 참고.

### 2-3. 운동 소모 칼로리

```
calories = round(MET × 현재 체중 × 운동 시간(분) / 60)
```

`exerciseCode`가 있으면 서버가 계산하고, 없으면(목록에 없는 운동) 요청의 `calories`를 그대로 쓴다.

> 예시: `running` 30분, 54kg → 8.0 × 54 × 30 / 60 = **216 kcal**

### 2-4. 음식 칼로리

`foodId`(식품 DB 코드)가 있으면 서버가 DB 값으로 계산하고 요청의 `calories`·영양소는 무시한다.

```
unit = g        → DB 100g당 값 × amount / 100
unit = serving  → DB 1회 제공량 값 × amount
```

`foodId`가 없으면(직접 입력) 요청 값을 그대로 쓴다.

### 2-5. 생리 주기

```
offset(날짜)   = (날짜 − startDate) mod cycleLength          (0 = 생리 시작일)
배란 offset    = cycleLength − 14
nextPeriod    = 오늘 이후 가장 가까운 offset 0인 날 (오늘 제외)
ovulation     = 오늘 이후 가장 가까운 배란 offset인 날 (오늘 포함)
fertileStart  = ovulation − 5일
fertileEnd    = ovulation
생리 기간      = offset < periodLength 인 날
```

> 예시: startDate 2026-09-05, 주기 30일, today 2026-09-12 → nextPeriod **2026-10-05**, ovulation **2026-09-21**, 가임기 **09-16 ~ 09-21**

### 2-6. 재계산 시점

| 바뀐 값 | targetCalorie | waterGoal (`waterGoalCustom: false`일 때만) |
|---------|---------------|--------------------------------------------|
| gender, age, height, goal | 재계산 | - |
| weight | 재계산 | 재계산 |
| activityLevel | 재계산 | 재계산 |
| 체중 기록 추가 (`PUT /weights/{date}`)가 가장 최근 날짜일 때 | 재계산 | 재계산 |

이미 저장된 운동 기록의 칼로리는 체중이 바뀌어도 다시 계산하지 않는다.

---

## 3. 게스트 모드와 가입 흐름

```
앱 첫 실행 → 온보딩 → 게스트 모드 (기기 저장, 앱에서 계산)
                          │
                          ├─ 설정 → 계정 만들기 → POST /auth/signup
                          │        → POST /me/import (기기 기록 전체)
                          │        → 성공: 기기 기록 삭제, 이후 서버 기준
                          │        → 실패: 기기 기록 유지, 다음 실행 때 import 재시도
                          │
                          └─ 설정 → 로그인 (다른 기기에서 만든 계정)
                                   → 기기에 게스트 기록이 있으면 선택
                                     · "이 기기 기록 합치기" → POST /me/import
                                     · "버리기" → 기기 기록 삭제
```

| 상황 | 동작 |
|------|------|
| 가입 요청 | 온보딩에서 받은 프로필을 `signup`에 함께 보낸다. 서버가 목표를 다시 계산해 돌려주고, 앱은 그 값으로 바꾼다 |
| import 재시도 | 모든 기록에 클라이언트 ID가 있어 여러 번 보내도 중복되지 않는다 |
| 로그아웃 | 기기에 남은 서버 데이터 캐시를 지운다. 게스트 모드로 돌아가지 않고 로그인 화면으로 |
| 오프라인 | 로그인 상태에서도 기록은 기기에 먼저 저장하고, 연결되면 순서대로 보낸다 |

### 3-1. 앱 상태

**회원가입은 필수가 아니다.** 게스트로 모든 기능을 쓴다. 가입은 기능을 여는 열쇠가 아니라 저장 위치를 서버로 옮기는 스위치다.

| 상태 | 조건 | 쓸 수 있는 것 | 저장 위치 | 계산 |
|------|------|---------------|-----------|------|
| `onboarding` | 온보딩 미완료 | 온보딩만 | — | — |
| `guest` | 온보딩 완료, 계정 없음 | 전부 | 기기 | 앱 |
| `member` | 로그인함 | 전부 + 기기 간 동기화 | 서버 | 서버 |

`guest`와 `member`는 같은 공식을 쓰므로([2. 계산 규칙](#2-계산-규칙-서버-기준)) 숫자가 달라지지 않는다. 가입하면 서버가 돌려준 값으로 덮어쓴다.

### 3-2. 화면 가드

가드는 **온보딩 완료 여부 하나뿐이다.** 로그인 가드는 두지 않는다 — 게스트가 모든 화면을 쓰므로 막을 화면이 없다.

| 대상 | 조건 |
|------|------|
| 온보딩 외 모든 화면 | 온보딩 완료 |
| 서버 API 호출 | `member` (게스트는 호출 자체를 하지 않는다) |

가입 유도는 설정 화면에서만 한다. 기능을 막고 가입을 요구하지 않는다. 유도 문구가 내세울 가치는 "기록 백업과 기기 이전"이지 "기능 해금"이 아니다.

### 3-3. 값이 비어 있을 때

| 구분 | 항목 | 처리 |
|------|------|------|
| 계산에 필수 | 성별·나이·키·체중·활동량·목표 | 온보딩에서 필수로 받는다. 비어 있는 상태를 만들지 않는다 |
| 선택 | 생일·목표 체중·질환·못 먹는 음식·식단 취향 | 없으면 그 기능만 빠진다. 기본값으로 추정하지 않는다 |
| 미설정 | 생리 주기, 체중 기록 | 카드를 숨기거나 입력 유도로 대체한다 |

**원칙: 추정값을 사실처럼 보여주지 않는다.** 주기를 입력하기 전에는 홈 생리 카드를 숨기고(F-017), 서버도 `404 PERIOD_NOT_SET`을 준다. 체중은 기록이 없으면 온보딩에서 받은 값을 "최근 기록"으로 표시하지 않는다.

---

## 4. 인증

### POST /auth/signup — 회원가입

**Request**

```json
{
  "email": "user@example.com",
  "password": "fitto1234",
  "profile": {
    "name": "은영",
    "gender": "female",
    "age": 26,
    "height": 165.0,
    "weight": 55.0,
    "targetWeight": 52.0,
    "activityLevel": "light",
    "goal": "lose_weight",
    "diseases": ["diabetes"],
    "customDiseases": [],
    "preferredFoods": ["korean"],
    "customPreferredFoods": [],
    "allergies": ["nuts"],
    "customAllergies": ["오이"],
    "personality": "friendly"
  },
  "startedAt": "2026-08-01T09:00:00Z"
}
```

| 필드 | 규칙 |
|------|------|
| email | 필수, 이메일 형식, 254자 이하 |
| password | 필수, 8~64자, 영문·숫자 모두 포함 |
| profile.name | 필수, 1~20자 |
| profile.gender, age, height, weight, activityLevel, goal, personality | 필수 |
| profile.targetWeight | 선택, 25~250 |
| custom* 배열 | 항목당 1~20자, 최대 10개 |
| startedAt | 선택. 게스트로 앱을 처음 쓴 시각(피또 친근해지기 기준). 없으면 가입 시각 |

**Response 201**

```json
{
  "user": { "...": "User 리소스 (5. 유저)" },
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

| 코드 | 설명 |
|------|------|
| 201 | 가입 성공 |
| 400 | `INVALID_INPUT` |
| 409 | `EMAIL_DUPLICATED` |

---

### POST /auth/login — 로그인

**Request**

```json
{ "email": "user@example.com", "password": "fitto1234" }
```

**Response 200**

```json
{
  "user": { "...": "User 리소스" },
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

| 코드 | 설명 |
|------|------|
| 200 | 로그인 성공 |
| 401 | `INVALID_CREDENTIALS` (이메일과 비밀번호 중 무엇이 틀렸는지 알려주지 않는다) |
| 429 | `TOO_MANY_REQUESTS` (같은 이메일 5분에 10회 실패) |

---

### POST /auth/refresh — 토큰 갱신

**Request**

```json
{ "refreshToken": "jwt" }
```

**Response 200**

```json
{ "accessToken": "new_jwt", "refreshToken": "new_jwt" }
```

| 코드 | 설명 |
|------|------|
| 200 | 갱신 성공. 받은 refreshToken으로 교체해야 한다 |
| 401 | `REFRESH_TOKEN_INVALID` (만료·위조) |
| 401 | `REFRESH_TOKEN_REUSED` (이미 쓴 토큰. 모든 세션 폐기, 다시 로그인) |

---

### POST /auth/logout — 로그아웃

**Request**

```json
{ "refreshToken": "jwt" }
```

**Response 204** No Content

accessToken은 서버에 상태가 없어 만료까지 유효하다. 요청으로 받은 refreshToken만 폐기한다.

---

## 5. 유저

### User 리소스

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "은영",
  "gender": "female",
  "age": 26,
  "height": 165.0,
  "weight": 55.0,
  "targetWeight": 52.0,
  "birthday": { "month": 3, "day": 14 },
  "activityLevel": "light",
  "goal": "lose_weight",
  "diseases": ["diabetes"],
  "customDiseases": [],
  "preferredFoods": ["korean"],
  "customPreferredFoods": [],
  "allergies": ["nuts"],
  "customAllergies": ["오이"],
  "personality": "friendly",
  "workoutPreference": { "intensity": "normal", "equipment": "bodyweight", "focus": "full" },
  "periodEnabled": true,
  "goals": {
    "targetCalorie": 1424,
    "waterGoal": 1800,
    "waterGoalCustom": false,
    "stepGoal": 8000,
    "cupSize": 250
  },
  "startedAt": "2026-08-01T09:00:00Z",
  "createdAt": "2026-09-12T03:00:00Z",
  "updatedAt": "2026-09-12T03:00:00Z"
}
```

| 필드 | 비고 |
|------|------|
| birthday | nullable. 연도는 받지 않는다(나이는 `age`로) |
| workoutPreference | 기본값 `normal` / `bodyweight` / `full` |
| goals.targetCalorie | 읽기 전용. 서버 계산 |
| goals.waterGoalCustom | 사용자가 물 목표를 직접 정했는지 |
| goals.stepGoal | 3000~20000, 기본 8000 |
| goals.cupSize | 50~1000 ml, 기본 250 |

---

### GET /users/me — 내 정보 조회

**Response 200** — User 리소스

---

### PATCH /users/me — 내 정보 수정

**Request** (바꿀 필드만)

```json
{
  "weight": 54.0,
  "goal": "maintain",
  "goals": { "waterGoal": 2000 }
}
```

**Response 200** — 수정된 User 리소스 (재계산 결과 포함)

| 규칙 | 내용 |
|------|------|
| 재계산 | [2-6](#2-6-재계산-시점) 기준 |
| `goals.waterGoal`에 숫자 | 그 값 저장, `waterGoalCustom: true` |
| `goals.waterGoal`에 `null` | 직접 설정 해제, 계산값으로 되돌림, `waterGoalCustom: false` |
| `goals.targetCalorie` | 보내면 `400 INVALID_INPUT` (읽기 전용) |
| `email`, `password` | 이 API로 바꿀 수 없음 (2차) |

---

### DELETE /users/me/records — 기록 전체 삭제

설정 → 데이터 초기화(F-043). 계정은 남기고 모든 기록을 지운다: 식단, 식사 메모, 운동, 루틴, 레시피, 직접 입력 재료, 수분, 걸음수, 체중, 생리 주기 설정과 컨디션.
프로필은 기본값으로 되돌린다. 앱은 온보딩을 다시 진행한 뒤 `PATCH /users/me`로 프로필을 채운다.

**Response 204** No Content

---

### DELETE /users/me — 회원 탈퇴

계정과 모든 데이터를 지운다. 이후 모든 토큰은 무효.

**Response 204** No Content

---

## 6. 게스트 데이터 이전

### POST /me/import — 기기 기록 한 번에 올리기

가입 직후, 또는 로그인할 때 "이 기기 기록 합치기"를 고르면 호출한다.

**Request**

```json
{
  "meals": [
    {
      "id": "uuid", "date": "2026-09-10", "mealType": "breakfast",
      "name": "그릭요거트", "foodId": null, "recipeId": null,
      "amount": 150, "unit": "g", "servingLabel": null,
      "calories": 130, "carbs": null, "protein": null, "fat": null, "sodium": null, "sugar": null
    }
  ],
  "mealMemos": [
    { "date": "2026-09-10", "mealType": "breakfast", "memo": "배고파서 많이 먹음" }
  ],
  "workouts": [
    { "id": "uuid", "date": "2026-09-10", "exerciseCode": "running", "name": "달리기", "duration": 30, "calories": 216, "memo": null }
  ],
  "water": [{ "date": "2026-09-10", "amount": 1250 }],
  "steps": [{ "date": "2026-09-10", "steps": 6420 }],
  "weights": [{ "date": "2026-09-10", "weight": 54.6 }],
  "period": {
    "settings": { "startDate": "2026-09-05", "cycleLength": 30, "periodLength": 5 },
    "daily": [
      { "date": "2026-09-10", "condition": "bad", "symptoms": ["cramp"], "medication": null, "memo": null }
    ]
  },
  "recipes": [],
  "routines": [],
  "customIngredients": []
}
```

모든 배열·객체는 선택. 각 항목의 형식은 해당 리소스와 같다.

**Response 200**

```json
{
  "imported": { "meals": 12, "mealMemos": 1, "workouts": 4, "water": 7, "steps": 7, "weights": 3, "periodDaily": 1, "recipes": 0, "routines": 0, "customIngredients": 0 },
  "skipped":  { "meals": 0,  "mealMemos": 0, "workouts": 0, "water": 2, "steps": 0, "weights": 0, "periodDaily": 0, "recipes": 0, "routines": 0, "customIngredients": 0 },
  "user": { "...": "User 리소스" }
}
```

**합치기 규칙**

| 대상 | 규칙 |
|------|------|
| ID가 있는 기록 (식단, 운동, 레시피, 루틴, 재료) | 같은 ID가 서버에 있으면 건너뜀, 없으면 추가 |
| 날짜당 값 하나인 기록 (수분, 걸음수, 체중, 식사 메모, 생리 컨디션) | 서버에 그 날짜 값이 있으면 **서버 값 유지**, 없으면 추가 |
| 생리 주기 설정 | 서버에 설정이 없을 때만 적용 |
| 직접 입력 재료 | 같은 이름이 서버에 있으면 건너뜀 |
| 칼로리 | import한 기록은 다시 계산하지 않는다. 게스트 때 본 숫자를 그대로 둔다 |

전체를 하나의 트랜잭션으로 처리한다. 중간에 실패하면 아무것도 저장하지 않는다.

| 코드 | 설명 |
|------|------|
| 200 | 이전 완료 (다시 보내도 결과가 같다) |
| 400 | `INVALID_INPUT` (`errors[].field`에 `meals[3].amount` 형태로 위치 표시) |
| 413 | `PAYLOAD_TOO_LARGE` (5MB 초과. 앱은 날짜 기준으로 나눠 보낸다) |

---

## 7. 식단

### MealItem 리소스

```json
{
  "id": "uuid",
  "date": "2026-09-12",
  "mealType": "lunch",
  "name": "현미밥",
  "foodId": "D000123",
  "recipeId": null,
  "amount": 1,
  "unit": "serving",
  "servingLabel": "1공기 210g",
  "calories": 311,
  "carbs": 67.2,
  "protein": 5.9,
  "fat": 1.9,
  "sodium": 4,
  "sugar": 0.4,
  "createdAt": "2026-09-12T03:00:00Z",
  "updatedAt": "2026-09-12T03:00:00Z"
}
```

| 필드 | 규칙 |
|------|------|
| name | 1~50자 |
| foodId | 식품 DB 코드. 직접 입력이면 `null` |
| recipeId | 레시피에서 추가했으면 레시피 ID |
| amount | `g`: 0보다 크고 2000 이하 / `serving`: 0.1 단위, 0.1~10 |
| servingLabel | `unit: serving`일 때 1인분 설명. 50자 이하 |
| calories | 0~5000 |

---

### GET /diet?date={YYYY-MM-DD} — 날짜별 식단 조회

**Response 200**

```json
{
  "date": "2026-09-12",
  "totalCalories": 770,
  "meals": {
    "breakfast": [{ "...": "MealItem" }],
    "lunch": [],
    "dinner": [],
    "snack": []
  },
  "memos": {
    "breakfast": "배고파서 많이 먹음",
    "lunch": null,
    "dinner": null,
    "snack": null
  }
}
```

기록이 없는 날도 `200`, 빈 배열과 `null`로.

---

### POST /diet — 음식 기록 추가

**Request**

```json
{
  "id": "uuid",
  "date": "2026-09-12",
  "mealType": "lunch",
  "name": "현미밥",
  "foodId": "D000123",
  "amount": 105,
  "unit": "g",
  "servingLabel": null,
  "calories": 155,
  "carbs": null, "protein": null, "fat": null, "sodium": null, "sugar": null
}
```

`foodId`가 있으면 칼로리·영양소는 서버가 다시 계산한다([2-4](#2-4-음식-칼로리)).

**Response 201** — MealItem (같은 `id`로 재요청하면 `200`)

| 코드 | 설명 |
|------|------|
| 201 / 200 | 기록 성공 / 이미 있는 기록 |
| 400 | `INVALID_INPUT`, `INVALID_DATE` |
| 404 | `FOOD_NOT_FOUND` (`foodId`가 DB에 없음) |

---

### PATCH /diet/{mealItemId} — 음식 기록 수정

양이나 끼니를 바꾼다. 음식 자체를 바꾸려면 삭제 후 다시 추가한다.

**Request**

```json
{ "mealType": "dinner", "amount": 2, "unit": "serving" }
```

| 규칙 | 내용 |
|------|------|
| `foodId` 있음 | 칼로리·영양소를 DB 기준으로 재계산 |
| `foodId` 없음, 같은 단위에서 양만 변경 | 칼로리·영양소를 양 비율대로 조정 |
| `foodId` 없음, 단위 변경 | `400 UNIT_CHANGE_NOT_ALLOWED` (그램 환산 정보가 없음) |

**Response 200** — MealItem

---

### DELETE /diet/{mealItemId} — 음식 기록 삭제

**Response 204** No Content

---

### PUT /diet/memo — 식사 메모 저장

날짜 + 끼니마다 메모 하나.

**Request**

```json
{ "date": "2026-09-12", "mealType": "lunch", "memo": "점심 짜게 먹었음" }
```

| 규칙 | 내용 |
|------|------|
| memo | 80자 이하. 앞뒤 공백 제거 |
| `null` 또는 빈 문자열 | 메모 삭제 |

**Response 200**

```json
{ "date": "2026-09-12", "mealType": "lunch", "memo": "점심 짜게 먹었음" }
```

---

### GET /diet/recent-foods?limit={n} — 최근 먹은 음식

`limit` 기본 10, 최대 20. 이름 기준 중복 제거, 최근 기록 순. 양은 마지막으로 기록한 값.

**Response 200**

```json
{
  "items": [
    { "name": "현미밥", "foodId": "D000123", "amount": 1, "unit": "serving", "servingLabel": "1공기 210g", "calories": 311 },
    { "name": "그릭요거트", "foodId": null, "amount": 150, "unit": "g", "servingLabel": null, "calories": 130 }
  ]
}
```

---

### Recipe 리소스

```json
{
  "id": "uuid",
  "name": "닭가슴살 볶음밥",
  "ingredients": [
    {
      "name": "현미밥", "foodId": "D000123", "customIngredientId": null, "amount": 150,
      "calories": 222, "carbs": 48.0, "protein": 4.2, "fat": 1.4, "sodium": 3, "sugar": 0.3
    },
    {
      "name": "닭가슴살", "foodId": null, "customIngredientId": "uuid", "amount": 100,
      "calories": 165, "carbs": 0, "protein": 31.0, "fat": 3.6, "sodium": null, "sugar": null
    }
  ],
  "totals": { "calories": 387, "carbs": 48.0, "protein": 35.2, "fat": 5.0, "sodium": 3, "sugar": 0.3 },
  "createdAt": "2026-09-12T03:00:00Z",
  "updatedAt": "2026-09-12T03:00:00Z"
}
```

| 필드 | 규칙 |
|------|------|
| name | 1~30자 |
| ingredients | 1~30개. `amount`는 g |
| 재료 영양소 | `foodId`나 `customIngredientId`가 있으면 서버 계산, 없으면 요청 값 |
| totals | 읽기 전용. 재료 합계. 재료 중 하나라도 `null`인 영양소는 `null`이 아니라 아는 값만 더하고, 앱에서 "일부 재료 정보 없음"으로 표시 |

> 레시피 사진은 v1.1에서 서버에 올리지 않는다(기기에만 보관). 이미지 업로드는 2차.
> 영양 분석(좋은 점·보완점)은 `totals`를 보고 앱에서 룰 기반으로 만든다.

---

### POST /recipes — 레시피 저장

**Request** — Recipe에서 `totals`, `createdAt`, `updatedAt`을 뺀 형태 (`id` 선택)

**Response 201** — Recipe

---

### GET /recipes — 내 레시피 목록

**Response 200**

```json
{ "items": [{ "...": "Recipe" }] }
```

최근 수정 순.

---

### PATCH /recipes/{recipeId} — 레시피 수정

**Request** — `name`, `ingredients` 중 바꿀 것. `ingredients`는 배열 통째로 교체.

**Response 200** — Recipe

---

### DELETE /recipes/{recipeId} — 레시피 삭제

**Response 204** No Content. 이 레시피로 이미 추가한 식단 기록은 지우지 않고, 그 기록의 `recipeId`도 그대로 둔다.

---

### POST /recipes/{recipeId}/use — 레시피로 식단 추가

F-025 "사용" 버튼.

**Request**

```json
{ "id": "uuid", "date": "2026-09-12", "mealType": "snack", "servings": 1 }
```

`mealType` 기본 `snack`, `servings` 기본 1 (0.1~10).

**Response 201** — MealItem (`name`=레시피 이름, `unit`=`serving`, `amount`=servings, `recipeId` 채움, 칼로리는 `totals × servings`)

---

### CustomIngredient 리소스 (직접 입력 재료)

```json
{
  "id": "uuid",
  "name": "닭가슴살",
  "per100g": { "calories": 165, "carbs": 0, "protein": 31.0, "fat": 3.6, "sodium": null, "sugar": null },
  "allergy": false,
  "updatedAt": "2026-09-12T03:00:00Z"
}
```

| 필드 | 규칙 |
|------|------|
| name | 1~30자. 사용자 안에서 유일 |
| per100g.calories | 필수, 0~900 |
| allergy | 사용자가 "못 먹는 재료"로 표시했는지 |

### GET /ingredients/custom — 직접 입력 재료 목록

**Response 200** `{ "items": [{ "...": "CustomIngredient" }] }`

### PUT /ingredients/custom — 직접 입력 재료 저장

같은 이름이 있으면 덮어쓰고, 없으면 만든다.

**Request** — CustomIngredient에서 `updatedAt`을 뺀 형태 (`id` 선택)

**Response 200** — CustomIngredient

### DELETE /ingredients/custom/{ingredientId} — 직접 입력 재료 삭제

**Response 204** No Content

---

## 8. 운동

### Workout 리소스

```json
{
  "id": "uuid",
  "date": "2026-09-12",
  "exerciseCode": "running",
  "name": "달리기",
  "duration": 30,
  "calories": 216,
  "memo": "무릎 조심",
  "routineId": null,
  "createdAt": "2026-09-12T03:00:00Z",
  "updatedAt": "2026-09-12T03:00:00Z"
}
```

| 필드 | 규칙 |
|------|------|
| exerciseCode | 목록에 없는 운동이면 `null` |
| name | 1~30자. `exerciseCode`가 있어도 저장(표시용) |
| duration | 1~600 |
| calories | `exerciseCode`가 있으면 서버 계산([2-3](#2-3-운동-소모-칼로리)), 없으면 필수 0~3000 |
| memo | 60자 이하, nullable |
| routineId | 루틴으로 추가했으면 루틴 ID |

---

### GET /workout?date={YYYY-MM-DD} — 날짜별 운동 조회

**Response 200**

```json
{
  "date": "2026-09-12",
  "totalDuration": 50,
  "totalCalories": 261,
  "items": [{ "...": "Workout" }]
}
```

---

### POST /workout — 운동 기록 추가

**Request**

```json
{
  "id": "uuid",
  "date": "2026-09-12",
  "exerciseCode": "running",
  "name": "달리기",
  "duration": 30,
  "calories": null,
  "memo": "무릎 조심"
}
```

**Response 201** — Workout (같은 `id` 재요청 시 `200`)

---

### PATCH /workout/{workoutId} — 운동 기록 수정

**Request** — `duration`, `memo`, `calories`(`exerciseCode` 없을 때만) 중 바꿀 것.
`duration`이 바뀌고 `exerciseCode`가 있으면 칼로리를 **수정 시점 체중**으로 재계산한다.

**Response 200** — Workout

---

### DELETE /workout/{workoutId} — 운동 기록 삭제

**Response 204** No Content

---

### Routine 리소스

```json
{
  "id": "uuid",
  "name": "하체 루틴",
  "exercises": [
    { "exerciseCode": "stair_climbing", "name": "계단 오르기", "duration": 15, "calories": null },
    { "exerciseCode": null, "name": "런지", "duration": 15, "calories": 100 }
  ],
  "createdAt": "2026-09-12T03:00:00Z",
  "updatedAt": "2026-09-12T03:00:00Z"
}
```

| 필드 | 규칙 |
|------|------|
| name | 1~30자 |
| exercises | 1~20개 |
| exercises[].calories | `exerciseCode`가 있으면 저장하지 않음(`null`). 사용할 때 그날 체중으로 계산. 없으면 필수 |

---

### POST /routines — 루틴 저장

**Request** — Routine에서 `createdAt`, `updatedAt`을 뺀 형태 (`id` 선택)

**Response 201** — Routine

### GET /routines — 내 루틴 목록

**Response 200** `{ "items": [{ "...": "Routine" }] }`

### PATCH /routines/{routineId} — 루틴 수정

**Request** — `name`, `exercises`(배열 통째로 교체) 중 바꿀 것

**Response 200** — Routine

### DELETE /routines/{routineId} — 루틴 삭제

**Response 204** No Content. 이미 기록된 운동은 남는다.

---

### POST /routines/{routineId}/use — 루틴 일괄 기록

F-035 "사용" 버튼. 루틴 안의 운동을 그날 기록으로 한꺼번에 만든다.

**Request**

```json
{ "date": "2026-09-12", "ids": ["uuid", "uuid"] }
```

`ids`는 선택. 넣으면 운동 개수와 같은 길이여야 하고, 순서대로 각 Workout의 `id`가 된다(재시도해도 중복 없음).

**Response 201**

```json
{ "items": [{ "...": "Workout" }] }
```

| 코드 | 설명 |
|------|------|
| 201 | 기록 성공 |
| 400 | `INVALID_INPUT` (`ids` 길이 불일치) |
| 404 | `NOT_FOUND` |

---

## 9. 수분

### GET /water?date={YYYY-MM-DD} — 날짜별 수분 조회

**Response 200**

```json
{ "date": "2026-09-12", "amount": 1250, "goal": 1800, "percentage": 69 }
```

`goal`은 조회 시점의 `goals.waterGoal`. `percentage`는 `floor(amount / goal × 100)`, 100을 넘을 수 있다.

---

### PUT /water — 수분 저장 (절댓값)

+250ml, 되돌리기, 직접 입력 모두 이 API 하나로. 앱이 더한 결과를 보낸다.

**Request**

```json
{ "date": "2026-09-12", "amount": 1500 }
```

`amount` 0~10000.

**Response 200**

```json
{ "date": "2026-09-12", "amount": 1500, "goal": 1800, "percentage": 83 }
```

> v1.0의 누적 `POST /water`는 제거했다. 누적 방식은 네트워크 재시도나 오프라인 동기화 때 같은 250ml가 두 번 더해진다. 빠르게 여러 번 누르면 앱이 마지막 값만 보내면 된다.

---

## 10. 걸음수

### GET /steps?from={YYYY-MM-DD}&to={YYYY-MM-DD} — 기간별 걸음수

최대 92일.

**Response 200**

```json
{
  "goal": 8000,
  "items": [
    { "date": "2026-09-11", "steps": 7210 },
    { "date": "2026-09-12", "steps": 6420 }
  ]
}
```

기록 없는 날은 목록에서 빠진다.

### PUT /steps — 걸음수 저장

기기 건강 데이터(HealthKit / Health Connect)와 동기화할 때. 절댓값.

**Request**

```json
{ "items": [{ "date": "2026-09-12", "steps": 6420 }] }
```

한 번에 최대 31개, `steps` 0~100000.

**Response 200** `{ "items": [...] }`

---

## 11. 체중

### GET /weights?from={YYYY-MM-DD}&to={YYYY-MM-DD} — 체중 기록

`from`, `to` 생략 시 전체. 날짜 오름차순.

**Response 200**

```json
{
  "targetWeight": 52.0,
  "items": [
    { "date": "2026-09-01", "weight": 55.2 },
    { "date": "2026-09-12", "weight": 54.6 }
  ]
}
```

### PUT /weights/{date} — 체중 기록 저장

하루 하나. 같은 날 다시 보내면 덮어쓴다.

**Request**

```json
{ "weight": 54.6 }
```

`weight` 25~250, 소수 1자리.

**Response 200**

```json
{
  "date": "2026-09-12",
  "weight": 54.6,
  "user": { "...": "User 리소스 (가장 최근 기록이면 weight와 목표가 갱신됨)" }
}
```

저장한 날짜가 가장 최근 기록이면 `user.weight`를 이 값으로 바꾸고 [2-6](#2-6-재계산-시점)에 따라 재계산한다. 과거 날짜를 넣은 경우에는 유저 정보를 바꾸지 않는다.

### DELETE /weights/{date} — 체중 기록 삭제

**Response 204** No Content. `user.weight`는 바꾸지 않는다.

---

## 12. 생리 주기

`periodEnabled`가 `false`여도 API는 동작한다. 노출 여부는 앱이 정한다.

### GET /period?today={YYYY-MM-DD} — 주기 정보 조회

**Response 200**

```json
{
  "startDate": "2026-09-05",
  "cycleLength": 30,
  "periodLength": 5,
  "cycleDay": 8,
  "nextPeriod": "2026-10-05",
  "ovulation": "2026-09-21",
  "fertileStart": "2026-09-16",
  "fertileEnd": "2026-09-21"
}
```

`cycleDay`는 이번 주기 며칠째(시작일 = 1). 계산은 [2-5](#2-5-생리-주기).

| 코드 | 설명 |
|------|------|
| 200 | 조회 성공 |
| 400 | `INVALID_INPUT` (`today` 누락) |
| 404 | `PERIOD_NOT_SET` (아직 시작일을 입력하지 않음. 앱은 홈 생리 카드를 숨긴다, F-017) |

---

### PUT /period — 주기 설정

**Request**

```json
{ "startDate": "2026-09-05", "cycleLength": 30, "periodLength": 5, "today": "2026-09-12" }
```

| 필드 | 규칙 |
|------|------|
| startDate | 필수. `today`보다 뒤면 `400 INVALID_DATE` |
| cycleLength | 21~45 |
| periodLength | 2~10, `cycleLength`보다 작아야 함 |
| today | 필수. 응답의 예정일 계산용 |

**Response 200** — `GET /period`와 같은 형태

---

### PUT /period/daily/{date} — 날짜별 컨디션 저장

같은 날짜는 덮어쓴다.

**Request**

```json
{
  "condition": "bad",
  "symptoms": ["cramp", "fatigue"],
  "medication": "이부프로펜",
  "memo": "허리도 아팠음"
}
```

| 필드 | 규칙 |
|------|------|
| condition | nullable |
| symptoms | 코드 배열, 중복 불가 |
| medication | 50자 이하, nullable |
| memo | 200자 이하, nullable |

네 필드가 모두 비어 있으면(`null`, `[]`) 그 날짜 기록을 삭제한다.

**Response 200**

```json
{ "date": "2026-09-12", "condition": "bad", "symptoms": ["cramp", "fatigue"], "medication": "이부프로펜", "memo": "허리도 아팠음" }
```

삭제된 경우 `204`.

---

### GET /period/daily?from={YYYY-MM-DD}&to={YYYY-MM-DD} — 기간별 컨디션

달력 한 달을 그릴 때. 최대 92일. 하루만 볼 때는 `from`과 `to`를 같게.

**Response 200**

```json
{ "items": [{ "date": "2026-09-12", "condition": "bad", "symptoms": ["cramp"], "medication": null, "memo": null }] }
```

---

## 13. 요약

### GET /summary/weekly?startDate={YYYY-MM-DD} — 주간 요약

홈 "이번 주 요약" 카드(F-016). `startDate`부터 7일.

**Response 200**

```json
{
  "startDate": "2026-09-06",
  "endDate": "2026-09-12",
  "daily": [
    { "date": "2026-09-06", "intake": 1800, "burned": 300, "water": 1500, "steps": 7210 },
    { "date": "2026-09-07", "intake": 0, "burned": 0, "water": 0, "steps": 0 }
  ],
  "averageIntake": 1725
}
```

| 필드 | 규칙 |
|------|------|
| daily | 항상 7개. 기록 없는 날은 0 |
| burned | 그날 운동 기록 칼로리 합계. 걸음수 기반 소모량은 포함하지 않는다(2차) |
| averageIntake | 섭취 기록이 있는 날만 평균. 하나도 없으면 0 |

> 홈의 오늘 카드들은 `/diet`, `/workout`, `/water`, `/steps`를 병렬로 조회한다. 합친 API는 필요해지면 추가한다.

---

## 14. 식품 검색

### GET /foods/search?query={검색어}&page={n}&size={n} — 식품 검색

식품의약품안전처 식품영양성분 DB. 서버가 공공 API를 대신 호출하고 결과를 캐싱한다(키 보호, 호출 제한 대응).

| 파라미터 | 규칙 |
|----------|------|
| query | 필수, 1~30자 |
| page | 기본 0 |
| size | 기본 20, 최대 50 |

**Response 200**

```json
{
  "items": [
    {
      "foodId": "D000123",
      "name": "현미밥",
      "servingLabel": "1공기 210g",
      "servingGrams": 210,
      "per100g": { "calories": 148, "carbs": 32.0, "protein": 2.8, "fat": 0.9, "sodium": 2, "sugar": 0.2 },
      "allergyTags": [],
      "cautions": []
    }
  ],
  "page": 0,
  "size": 20,
  "hasNext": false
}
```

| 필드 | 설명 |
|------|------|
| servingGrams | 1회 제공량 그램. 없으면 `null` → 앱은 `g` 단위만 허용 |
| allergyTags | 이 음식에 해당하는 `allergies` 코드. 앱이 사용자 목록과 대조해 경고 |
| cautions | 주의가 필요한 `diseases` 코드. 앱이 사용자 질환과 대조해 경고(F-023) |

**cautions 판정 기준 (1회 제공량 기준, 초안)**

| 코드 | 조건 |
|------|------|
| `hypertension` | 나트륨 600mg 이상 |
| `diabetes` | 당류 15g 이상 |
| `hyperlipidemia` | 지방 20g 이상 |
| `gout` | 이름에 내장류·등푸른생선·맥주 등 고퓨린 키워드 포함 (DB에 퓨린 정보가 없어 키워드 목록으로) |

결과가 없으면 `200`과 빈 `items`. (v1.0의 `204`는 본문을 보낼 수 없어 바꿨다.)

| 코드 | 설명 |
|------|------|
| 200 | 검색 성공 |
| 400 | `INVALID_INPUT` |
| 503 | `FOOD_API_UNAVAILABLE` (공공 API 장애. 캐시에 있는 검색어는 계속 응답) |

---

## 15. 기기에만 저장하는 항목

기기마다 달라도 되는 설정은 서버에 올리지 않는다.

| 항목 | 이유 |
|------|------|
| 화면 모드 (라이트/다크/시스템) | 기기별 취향 |
| 홈 카드 순서·숨김 | 화면 크기에 따라 다르게 쓸 수 있음 |
| 알림 설정 | 로컬 알림이라 기기에서만 의미 있음 |
| 튜토리얼 완료, 생일 축하 표시 연도, 드러눕기 모달 표시 날짜 | 기기에서 한 번 보여주면 되는 표시 상태 |
| 레시피 사진 | 이미지 업로드는 2차 |
| 음식 검색어 기록 | 세션 동안만 |

---

## 16. 1차 MVP 로컬 저장 구조

> v1.0의 키 11개 구조는 실제 구현과 다르다. 실제로는 zustand `persist`가 AsyncStorage 키 하나에 전체 상태를 JSON으로 저장한다.

```
키: fitto-app-storage
{
  state: {
    profile, goals, persona, periodOn, periodSettings, periodSetupDone,
    dailyRecords: { 'YYYY-MM-DD': { water, meals, mealMemos, exercises, steps, periodCondition, periodSymptoms } },
    weightLog: { 'YYYY-MM-DD': number },
    recipes, customIngredients,
    theme, cardOrder, cardHidden, alarms,
    onboardingDone, tutorialDone, birthdayShownYear, layDownShownDate
  },
  version: number   // 구조가 바뀌면 올리고 migrate에서 옮긴다
}
```

서버 연동 전에 로컬 저장값도 이 문서의 코드값·필드 형식으로 옮긴다(한글 라벨 → 코드, 음식 양 문자열 → `amount`+`unit`). `/me/import`로 보낼 때 변환 없이 그대로 쓰기 위해서다.

---

## 17. 에러 코드

| HTTP | code | 설명 |
|------|------|------|
| 400 | `INVALID_INPUT` | 요청 유효성 오류. `errors`에 필드별 사유 |
| 400 | `INVALID_DATE` | 날짜 형식 오류, 허용 범위 밖의 미래 날짜 |
| 400 | `UNIT_CHANGE_NOT_ALLOWED` | 식품 DB 정보 없이 음식 단위 변경 |
| 401 | `UNAUTHORIZED` | 토큰 없음 |
| 401 | `TOKEN_EXPIRED` | accessToken 만료. 앱은 `/auth/refresh` 후 재시도 |
| 401 | `INVALID_CREDENTIALS` | 로그인 실패 |
| 401 | `REFRESH_TOKEN_INVALID` | refreshToken 만료·위조 |
| 401 | `REFRESH_TOKEN_REUSED` | 이미 쓴 refreshToken. 모든 세션 폐기 |
| 403 | `FORBIDDEN` | 다른 사용자의 리소스 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 404 | `FOOD_NOT_FOUND` | 식품 DB에 없는 `foodId` |
| 404 | `PERIOD_NOT_SET` | 생리 주기 미입력 |
| 409 | `EMAIL_DUPLICATED` | 이미 가입된 이메일 |
| 409 | `ID_CONFLICT` | 다른 사용자가 쓰는 ID |
| 413 | `PAYLOAD_TOO_LARGE` | 요청 본문 5MB 초과 |
| 429 | `TOO_MANY_REQUESTS` | 요청 횟수 제한 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |
| 503 | `FOOD_API_UNAVAILABLE` | 공공 API 장애 |

**유효성 사유 (`errors[].reason`)**: `REQUIRED`, `INVALID_FORMAT`, `OUT_OF_RANGE`, `TOO_LONG`, `INVALID_CODE`, `DUPLICATED`
