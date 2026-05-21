코드 리뷰 결과: 로그인 기능
강점 (Strengths)
Server Component 경계: login/page.tsx가 'use client' 없이 LoginForm에 렌더링 위임 — 올바른 구조
Route Handler 최소화: api/auth/[...nextauth]/route.ts가 handlers re-export만 — Next-Auth v5 권장 패턴
로그인 실패 메시지: "이메일 또는 비밀번호가 틀렸습니다" 통일 — 정보 노출 최소화
SessionProvider 위치: RootLayout에 올바르게 배치
logger.ts 구조: 프로덕션 로그 분리 전략 양호
이슈
Critical (반드시 수정)
1. 이중 인증 시스템 공존 — 미정의 동작

파일: src/actions/auth.ts 전체, src/lib/auth.ts 전체
문제: 수동 쿠키 세션(actions/auth.ts)과 Next-Auth JWT 세션(lib/auth.ts)이 동시에 존재하나, LoginForm은 signIn()만 호출하므로 actions/auth.ts의 login()은 데드 코드
이유: 서버에서 auth()로 세션 확인 시 수동 쿠키 사용자는 인증 실패로 처리되는 충돌 발생
수정: actions/auth.ts의 login()/logout() 제거, Next-Auth 단일 체계로 통일
2. 소스 코드에 평문 비밀번호 하드코딩

파일: src/lib/auth.ts:27-29, src/actions/auth.ts:38-46
문제: credentials.password === '1234' 직접 비교
이유: 리포지토리 접근자 누구나 계정 탈취 가능, DB 전환 시 동일 패턴 복사 위험
수정: 즉시 환경변수로 이동 (ADMIN_EMAIL, ADMIN_PASSWORD_HASH), DB 전환 시 bcrypt.compare() 적용
3. Server Action 입력값 검증 없음 + as string 단언

파일: src/actions/auth.ts:42-44
문제: formData.get("email") as string — null을 string으로 단언
이유: Server Action은 클라이언트가 직접 호출 가능, 검증 없이 null이 통과되면 런타임 오류
수정: src/schemas/auth.schema.ts 생성 후 loginSchema.safeParse() 서버 측 검증
Important (머지 전 수정 권장)
4. LoginForm에 React Hook Form + Zod 미적용 — 네이티브 FormData 직접 파싱, 이메일 형식·공백 방지 1차 검증 없음
5. useTransition 미사용 — try-finally 없는 수동 isPending 관리, signIn() 예외 시 버튼 영구 비활성화
6. window.location.href = '/' — App Router 라우터 캐시 우회, router.push('/')로 교체 필요
7. 미들웨어(middleware.ts) 부재 — 보호된 라우트 URL 직접 접근 가능
8. 로그인 스키마 src/schemas/에 없음 — search.schema.ts와 달리 auth.schema.ts 미존재
9. actions/auth.ts에 logger 미사용 — 인증 시도/실패 이벤트 로깅 없음 (보안 감사 불가)
10. user.types.ts의 User 인터페이스가 Next-Auth 세션 타입에 미연동 — next-auth.d.ts 타입 확장 필요

Minor (개선 사항)
11. .env.example에 NEXTAUTH_SECRET, NEXTAUTH_URL 누락
12. src/lib/auth.ts WHAT 주석 — 전역 CLAUDE.md 원칙 위반
13. actions/auth.ts 상단 27줄 교육용 주석 — 프로덕션 코드 부적합
14. Header.tsx의 signOut — 클라이언트 직접 호출, <form action={서버액션}> 패턴 권장

권고 사항
DB 전환 로드맵: (1) auth.schema.ts Zod 스키마 → (2) bcrypt.compare() 도입 → (3) 환경변수 이동 → (4) DB 쿼리 레이어 교체 순서로 진행 권장

Rate Limiting: Next-Auth Credentials Provider는 브루트 포스를 자동 방어하지 않음. authorize() 내부에 upstash/ratelimit 도입 필요

타이밍 공격 방어: DB 전환 시 이메일 존재 여부와 무관하게 항상 bcrypt.compare() 실행 (즉시 null 반환 시 이메일 열거 가능)

최종 판정
머지 가능 여부: No

판정 근거: Critical 이슈 3개가 동시에 존재합니다. 이중 인증 시스템으로 인한 데드 코드, 소스 코드 내 평문 비밀번호 ('1234'), Server Action의 검증 없는 as string 단언 — 이 세 가지가 해결되지 않으면 프로덕션 배포 시 보안 사고 및 미정의 동작이 발생합니다.