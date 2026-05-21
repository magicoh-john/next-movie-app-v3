# HISTORY.md

완료된 작업 이력을 날짜 순으로 기록한다.

---

## 2026-05-20

### Step 2 수업 자료 개선 — step-02-home-movie-list.md

- **변경 파일**: `docs/steps/step-02-home-movie-list.md`
- **주요 내용**
  - 원칙 2 적용: 각 섹션 상단에 `✅ 새로 생성 / 수정` 명시 + "아래 코드를 입력합니다" 행동 지침 추가
  - 원칙 5 적용: 코드 전에 WHY 단락 추가 (왜 서버 컴포넌트인지, 왜 이 파일이 필요한지)
  - 원칙 6 적용: `<img>`/`<a>` vs `<Image>`/`<Link>` ❌/✅ 비교 추가
  - 원칙 7 적용: 파일 연결 구조 ASCII 트리 추가
  - 원칙 8 적용: movie-app 비교 3곳 제거, "서버에서 데이터를 fetch하면 어떻게 다른가" 독립 섹션으로 재작성 (CSR vs 서버 컴포넌트 흐름 비교)
  - 이 단계의 핵심 목표 섹션 추가
  - Tailwind v4 정식 클래스 적용: `aspect-[2/3]` → `aspect-2/3`

### next/image 외부 호스트 설정 누락 오류 수정

- **변경 파일**: `next.config.ts`
- **문제**: `next/image`로 TMDB 포스터를 로드할 때 `hostname "image.tmdb.org" is not configured` 런타임 오류 발생
- **원인**: `next/image`는 보안상 외부 이미지 호스트를 `next.config.ts`에 명시적으로 허용해야 함
- **수정**: `images.remotePatterns`에 `https://image.tmdb.org` 추가. 설정 변경 후 개발 서버 재시작 필요

---

## 2026-05-17

### MOVIE_PLAN.md 분리 완료 — Steps 4·5·6 독립 step 파일 생성

- **변경 파일**: `docs/MOVIE_PLAN.md`, `docs/steps/step-04-zustand-favorites.md` (신규), `docs/steps/step-05-zod-rhf.md` (신규), `docs/steps/step-06-zustand-persist.md` (신규)
- **주요 내용**: MOVIE_PLAN.md 인라인 Step 4·5·6 섹션을 독립 파일로 분리. MOVIE_PLAN.md는 목차 + 패턴 요약만 남김. step-06에는 persist 동작 확인 절차(@@INIT, localStorage, 수동 삭제 동작), Zustand vs persist 역할 구분, 교육 흐름 구조 포함

### Step 6 완료 — authStore persist + Header

- **변경 파일**: `src/store/authStore.ts`, `src/components/Header.tsx`
- **주요 내용**: authStore에 persist 미들웨어 추가(devtools + persist 조합), Header에 로그인 이메일 표시 + 로그인/로그아웃 버튼 전환 구현

### Step 5 완료 — Zod + React Hook Form + authStore 기본 버전

- **변경 파일**: `src/store/authStore.ts`, `src/schemas/auth.schema.ts`, `src/schemas/search.schema.ts`, `src/pages/Login.tsx`
- **주요 내용**: 로그인 Zod 스키마, 검색 Zod 스키마, authStore 기본 구현(persist 없음), 로그인 폼 전체 구현

### Step 4 완료 — Zustand 즐겨찾기 스토어 + MovieCard + Detail 페이지

- **변경 파일**: `src/store/favoriteStore.ts`, `src/components/MovieCard.tsx`, `src/pages/Detail.tsx`
- **주요 내용**: 즐겨찾기 Zustand 스토어 구현, MovieCard 플레이스홀더 → Link + 카드 UI, Detail 페이지 전체 구현

### MOVIE_PLAN.md devtools 수업 자료 추가

- **변경 파일**: `docs/MOVIE_PLAN.md`
- **주요 내용**: Step 4에 devtools 미들웨어 설명 섹션 추가 (왜 필요한가 / 적용 방법 / 액션 이름 / 팝아웃 버튼 안내), favoriteStore·authStore 코드 블록을 devtools 적용 버전으로 업데이트

### Zustand devtools 미들웨어 적용

- **변경 파일**: `src/store/favoriteStore.ts`, `src/store/authStore.ts`
- **주요 내용**: 두 스토어에 `devtools` 미들웨어 추가. `create<T>()()` 커링 구조로 변경, `name` 옵션으로 Redux DevTools에서 스토어 구별 가능

---

## 2026-05-16

### 다음 세션 계획 수립 — movie-app 신규 프로젝트

- **변경 파일**: `docs/WORK.md` — 다음 세션 작업 계획 및 결정 사항 추가
- **주요 내용**: 기술 스택 확정, fruit-shop3 대비 개선 방향 정리, 시작 순서(PRD → CLAUDE.md → 구현) 결정

### PRD 작성

- **변경 파일**: `docs/PRD.md` — 신규 작성
- **주요 내용**: Overview, User Stories, Functional Requirements(6개 페이지), Data Model, Tech Stack, Non-Functional Requirements, Out of Scope

### CLAUDE.md 작성

- **변경 파일**: `CLAUDE.md` — 신규 작성
- **주요 내용**: 기술 스택, 폴더 구조, 코드 스타일, TanStack Query·Zustand·Zod 규칙, WORK.md·HISTORY.md 관리 규칙

### 프로젝트 생성 및 라이브러리 설치

- **변경 파일**: `package.json`, `src/lib/utils.ts`, `src/components/ui/` (button, card, skeleton, badge, input)
- **주요 내용**: Vite + React + TypeScript 프로젝트 생성, 전체 라이브러리 설치, Shadcn UI 컴포넌트 5종 추가

### PRD Overview 수정 + CLAUDE.md Project Overview 보완

- **변경 파일**:
  - `docs/PRD.md` — 배경·목표를 순수 제품 관점으로 재작성, 기술 스택 내용(핵심 학습 목표 표) 삭제
  - `CLAUDE.md` — Project Overview에 fruit-shop3 맥락, 서버/클라이언트 상태 분리 개념, 기술별 역할 매핑 표 추가
