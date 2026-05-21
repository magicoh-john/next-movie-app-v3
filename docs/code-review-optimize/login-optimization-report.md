# 로그인 기능 최적화 보고서

- **작성일**: 2026-05-21
- **대상 프로젝트**: next-movie-app
- **기반 문서**: [코드 리뷰 결과](./result-of-codereview.md)

---

## 1. 개요

`code-review-subagent`가 수행한 로그인 기능 코드 리뷰 결과를 바탕으로, Critical 3건 · Important 7건 · Minor 2건의 이슈를 해결하고 Brute Force 방어 및 Timing Attack 방어를 추가로 구현했다.

최종 빌드: **경고 0, 타입 오류 0**

---

## 2. 변경 파일 요약

### 신규 생성

| 파일 | 역할 |
|------|------|
| `src/schemas/auth.schema.ts` | 로그인 입력값 Zod 스키마 (클라이언트·서버 공유) |
| `src/lib/rate-limit.ts` | Brute Force 방어 — 실패 횟수 추적 및 차단 |
| `src/lib/auth.config.ts` | Edge-safe 인증 설정 (미들웨어 전용) |
| `src/types/next-auth.d.ts` | Next-Auth 세션 타입 확장 (`id: string`) |
| `src/actions/signout.ts` | 로그아웃 서버 액션 |
| `middleware.ts` | `/favorites` 보호 라우트 |

### 수정

| 파일 | 주요 변경 내용 |
|------|--------------|
| `src/lib/auth.ts` | 환경변수 참조 · Zod 검증 · `timingSafeEqual` · Rate Limit · logger |
| `src/components/LoginForm.tsx` | React Hook Form + Zod + `useTransition` + `router.push` |
| `src/components/Header.tsx` | `<form action={signOutAction}>` 서버 액션 패턴 |
| `src/types/user.types.ts` | 미사용 `AuthState` 인터페이스 제거 |
| `.env.example` | 필수 환경변수 항목 추가 |

### 삭제

| 파일 | 삭제 이유 |
|------|----------|
| `src/actions/auth.ts` | Next-Auth와 독립적으로 운영되던 수동 쿠키 세션 — 데드 코드 |

---

## 3. Phase 1 — Critical 보안 이슈

### Task 1: 자격 증명 환경변수 분리

**문제**: `src/lib/auth.ts`와 `src/actions/auth.ts` 두 파일에 `'admin@test.com'`, `'1234'`가 소스 코드에 직접 노출되어 있었다.

**해결**:
- `.env.local`에 `ADMIN_EMAIL`, `ADMIN_PASSWORD` 추가
- `auth.ts`에서 `process.env.ADMIN_EMAIL`, `process.env.ADMIN_PASSWORD`로 참조
- `.env.example`에 모든 필수 환경변수 항목 명시

```
# .env.example
TMDB_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

---

### Task 2: 이중 인증 시스템 제거 (데드 코드)

**문제**: `src/actions/auth.ts`의 `login()` / `logout()`은 수동 쿠키 세션을 생성했으나, `LoginForm.tsx`는 이미 Next-Auth `signIn()`을 호출하고 있었다. 두 시스템의 세션 형식이 달라 `auth()`로 서버에서 세션을 확인하면 수동 쿠키 로그인 사용자는 인증 실패로 처리되는 충돌이 존재했다.

**해결**: `src/actions/auth.ts` 파일 삭제. Next-Auth 단일 인증 체계로 통일.

---

### Task 3: 서버 측 입력값 검증 (`auth.schema.ts` 생성)

**문제**: `src/actions/auth.ts`에서 `formData.get("email") as string` — `null`을 `string`으로 단언. Server Action은 클라이언트가 직접 호출 가능하므로 검증 없는 단언은 런타임 오류를 유발할 수 있다.

**해결**: 클라이언트와 서버가 공유하는 단일 스키마 `src/schemas/auth.schema.ts`를 생성하고, `authorize()` 내부에서 `loginSchema.safeParse(credentials)`로 검증.

```ts
// src/schemas/auth.schema.ts
export const loginSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요.').email('올바른 이메일 형식이 아닙니다.').trim(),
  password: z.string().min(1, '비밀번호를 입력해주세요.').trim(),
})
```

---

### Task 4: Brute Force(무차별 대입) 공격 방어

**위협**: 공격자가 비밀번호를 자동으로 반복 시도하여 계정을 탈취할 수 있다. Next-Auth Credentials Provider는 이를 자동으로 방어하지 않는다.

**구현**: `src/lib/rate-limit.ts`

```
정책: 동일 이메일로 5회 연속 실패 → 15분 차단
저장소: 서버 메모리 Map (재시작 시 초기화 — 추후 Redis 교체 지점)
```

| 함수 | 역할 |
|------|------|
| `checkRateLimit(email)` | 차단 여부 및 남은 시간 반환 |
| `recordFailure(email)` | 실패 횟수 증가, 임계치 도달 시 차단 시각 기록 |
| `resetFailure(email)` | 로그인 성공 시 카운터 초기화 |

**`authorize()` 연동 흐름**:

```
요청 수신
  → loginSchema.safeParse() 검증 실패 시 null 반환
  → checkRateLimit() 차단 상태면 null 반환 + logger.warn()
  → 자격 증명 비교 (safeEqual)
    → 실패: recordFailure() + logger.warn()
    → 성공: resetFailure() + logger.log() + 사용자 객체 반환
```

> **한계**: 서버 메모리 기반이므로 프로세스 재시작 시 카운터가 초기화된다. 다중 인스턴스 환경에서는 `@upstash/ratelimit` + Redis 도입이 필요하다.

---

### Task 5: Timing Attack(타이밍 공격) 방어

**위협**: `===` 문자열 비교는 일치하는 문자 수에 따라 소요 시간이 달라진다. 공격자가 응답 시간을 측정하여 이메일 존재 여부와 비밀번호의 일치 정도를 유추할 수 있다.

**구현**: Node.js 내장 `crypto.timingSafeEqual()`을 활용한 `safeEqual()` 헬퍼

```ts
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // 길이 불일치 시 더미 비교로 소요 시간 고정
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}
```

**핵심 원칙**: 이메일이 틀리더라도 비밀번호 비교까지 **항상 실행**하여 두 경로의 소요 시간을 동일하게 유지한다.

```ts
// 이메일 불일치 시에도 passwordMatch 비교는 반드시 실행
const emailMatch = safeEqual(email, adminEmail)
const passwordMatch = safeEqual(password, adminPassword)

if (!emailMatch || !passwordMatch) { ... }
```

> **향후**: DB 전환 후 `bcrypt.compare()`를 사용하면 타이밍 안전 비교가 내장되어 있어 별도 처리가 불필요하다.

---

## 4. Phase 2 — Important 코드 품질 개선

### Task 6: `LoginForm.tsx` 전면 개선

| 항목 | 이전 | 이후 |
|------|------|------|
| 폼 관리 | 네이티브 FormData 직접 파싱 | React Hook Form + `zodResolver` |
| 클라이언트 검증 | HTML `required`만 (우회 가능) | Zod 스키마 (`loginSchema`) |
| Pending 처리 | `useState` + `try-finally` 누락 | `useTransition` (예외 시 자동 복구) |
| 네비게이션 | `window.location.href = '/'` | `router.push('/')` (App Router 캐시 유지) |
| 에러 표시 | 단일 전체 에러 | 이메일·비밀번호 필드별 + 서버 에러 분리 |

---

### Task 7: `middleware.ts` 생성 (보호 라우트)

**문제**: 인증되지 않은 사용자가 `/favorites` URL을 직접 입력하면 접근 가능했다.

**해결**: Next-Auth v5 권장 패턴으로 `authConfig`의 `authorized` 콜백에서 접근 제어.

```ts
// middleware.ts
export const { auth: middleware } = NextAuth(authConfig)
export const config = { matcher: ['/favorites'] }
```

**Edge Runtime 분리**: `auth.ts`가 import하는 `crypto`는 Node.js 전용 모듈로 Edge Runtime에서 동작하지 않는다. 미들웨어 전용 `auth.config.ts`를 별도 분리하여 Node.js 모듈 의존성을 제거했다.

```
auth.config.ts  ← Edge-safe (pages, authorized 콜백만 포함)
     ↑
middleware.ts   ← authConfig만 import
auth.ts         ← authConfig + Credentials (crypto, rate-limit 포함)
```

---

### Task 8: Next-Auth 세션 타입 확장

**문제**: `session.user.id`를 TypeScript에서 사용하면 타입 오류 발생. `user.types.ts`의 `AuthState`는 `useSession()`과 무관한 미사용 타입.

**해결**:
- `src/types/next-auth.d.ts` 생성 — `Session.user`에 `id: string` 추가
- `user.types.ts`에서 `AuthState` 제거

```ts
// src/types/next-auth.d.ts
declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user']
  }
}
```

---

## 5. Phase 3 — Minor 코드 정리

### Task 9: `auth.ts` WHAT 주석 제거

`/**` 블록 내부에 중복 `export const` 선언과 import 설명 주석이 존재했다. 전역 CLAUDE.md 원칙("WHY가 비명확한 경우에만 주석 작성, WHAT 주석 금지")에 따라 전부 제거하고 단일 선언으로 정리.

---

### Task 10: `Header.tsx` signOut 서버 액션 패턴 적용

**이전**: `next-auth/react`의 `signOut()`을 `onClick`에서 직접 호출

**이후**: `src/actions/signout.ts`에 `'use server'` 서버 액션 분리 → `<form action={signOutAction}>`으로 연결

서버에서 세션 정리 로직(쿠키 삭제, 향후 DB 세션 무효화 등)이 추가될 때 Client Component 수정 없이 서버 액션만 확장 가능한 구조.

---

## 6. 인증 흐름 (최적화 후)

```
[브라우저]
  폼 입력 → zodResolver 클라이언트 검증
         → useTransition으로 signIn('credentials') 호출
  
[Next-Auth]
  authorize(credentials)
    → loginSchema.safeParse() — 서버 측 검증
    → checkRateLimit(email)  — 차단 여부 확인
    → safeEqual(email, ADMIN_EMAIL)    — 고정 시간 비교
    → safeEqual(password, ADMIN_PASSWORD) — 항상 실행
    → 성공: resetFailure() + logger.log()
    → 실패: recordFailure() + logger.warn()
  
[미들웨어]
  /favorites 접근 시 auth.config.ts의 authorized() 콜백으로 세션 확인
  미인증 → /login 리다이렉트
```

---

## 7. 향후 과제

| 항목 | 현재 | 권장 전환 시점 |
|------|------|--------------|
| 비밀번호 저장 | 환경변수 평문 (임시) | DB 도입 시 `bcrypt` / `argon2` 해시 저장 |
| Rate Limiting 저장소 | 서버 메모리 Map | 다중 인스턴스 환경에서 `@upstash/ratelimit` + Redis |
| 타이밍 공격 방어 | `crypto.timingSafeEqual()` | DB 전환 후 `bcrypt.compare()` (내장 타이밍 안전) |
| 자격 증명 소스 | 환경변수 단일 계정 | DB 전환 시 `prisma.user.findUnique()` |
