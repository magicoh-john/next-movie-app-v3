# Next Movie App — Next.js 학습 프로젝트

- 로그인 기능 구현
- 코드 리뷰 에이전트 추가 → 코드 리뷰 진행
- 최적화 리뷰 에이전트 추가 → 커스터마이징 진행
- 차기 기능 개선(DB사용) → 계획

프론트엔드 개발 경험이 있는 학생들이 Next.js의 핵심 개념을 단계별로 익히는 실습 프로젝트입니다.
React Router + TanStack Query로 만들어진 영화 앱(`movie-app`)을 Next.js로 다시 구현하면서, 두 방식의 차이를 직접 체감할 수 있도록 구성되어 있습니다.

---

## 학습 흐름

```
1단계: 강의 자료 학습 (docs/lectures/)
         ↓
2단계: 단계별 실습 진행 (docs/steps/)
```

강의 자료로 개념을 먼저 이해한 뒤, 스텝별 시나리오를 따라 기능을 직접 만들어갑니다.

---

## 강의 자료 (`docs/lectures/`)

| 파일 | 주제 |
|------|------|
| [01\_파일\_기반\_라우팅.md](docs/lectures/01_파일_기반_라우팅.md) | App Router — 폴더 구조가 곧 URL 구조 |
| [02\_서버\_컴포넌트\_vs\_클라이언트\_컴포넌트.md](docs/lectures/02_서버_컴포넌트_vs_클라이언트_컴포넌트.md) | `'use client'`를 언제 써야 하는가 |
| [03\_데이터\_패칭\_패턴.md](docs/lectures/03_데이터_패칭_패턴.md) | `useQuery` 없이 `async/await`로 데이터 가져오기 |
| [04\_프로젝트\_기술\_흐름.md](docs/lectures/04_프로젝트_기술_흐름.md) | 전체 기술 스택이 어떻게 연결되는지 |

---

## 단계별 실습 (`docs/steps/`)

| 스텝 | 파일 | 핵심 개념 | 예상 시간 |
|------|------|-----------|-----------|
| Step 0 | [step-00-setup.md](docs/steps/step-00-setup.md) | 프로젝트 생성, TMDB API 키 설정 | 20분 |
| Step 1 | [step-01-layout-providers.md](docs/steps/step-01-layout-providers.md) | `layout.tsx` + `Providers` + `Header` | 20분 |
| Step 2 | [step-02-home-movie-list.md](docs/steps/step-02-home-movie-list.md) | 서버 컴포넌트 `async/await` 데이터 fetch | 25분 |
| Step 3 | [step-03-genre-filter.md](docs/steps/step-03-genre-filter.md) | 클라이언트 UI 상태 (`useState`) | 15분 |
| Step 4 | [step-04-detail-page.md](docs/steps/step-04-detail-page.md) | 동적 경로 `[id]` → `params` | 20분 |
| Step 5 | [step-05-zustand-favorites.md](docs/steps/step-05-zustand-favorites.md) | Zustand 전역 상태 + `'use client'` | 20분 |
| Step 6 | [step-06-search-page.md](docs/steps/step-06-search-page.md) | 검색어를 URL 파라미터로 관리 | 20분 |
| Step 7 | [step-07-login-form-persist.md](docs/steps/step-07-login-form-persist.md) | Zod + React Hook Form 폼 유효성 검증 | 20분 |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS + Shadcn UI |
| 서버 상태 | TanStack Query |
| 클라이언트 상태 | Zustand |
| 폼 검증 | Zod + React Hook Form |
| 데이터 소스 | TMDB API |

---

## 시작하기

### 1. 패키지 설치

```bash
npm install
```

### 2. TMDB API 키 설정

[themoviedb.org](https://www.themoviedb.org)에서 무료로 API 키를 발급받은 뒤, 프로젝트 루트에 `.env.local` 파일을 만들어 저장합니다.

```bash
# .env.local
TMDB_API_KEY=여기에_발급받은_API_키_입력
```

### 3. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000`에서 확인합니다.

---

## 폴더 구조

```
src/
├── app/                 ← App Router (폴더 구조 = URL 구조)
│   ├── layout.tsx       ← 공통 레이아웃 (서버 컴포넌트)
│   ├── page.tsx         ← / 홈
│   ├── movies/[id]/     ← /movies/:id 상세
│   ├── favorites/       ← /favorites 즐겨찾기
│   ├── search/          ← /search 검색
│   └── login/           ← /login 로그인
├── components/          ← 재사용 컴포넌트
├── store/               ← Zustand store
├── hooks/               ← TanStack Query 커스텀 훅
├── lib/                 ← TMDB API 함수
├── schemas/             ← Zod 스키마
└── types/               ← TypeScript 타입 정의
```

---

## movie-app과의 비교

이 프로젝트는 기존 `movie-app`(React + Vite + React Router)과 1:1로 대응됩니다.

| movie-app | next-movie-app |
|-----------|----------------|
| `router.tsx`로 라우트 등록 | 폴더 구조가 URL |
| `useQuery`로 데이터 fetch | 서버 컴포넌트 `async/await` |
| `isLoading` 조건부 렌더링 | `loading.tsx` 파일 |
| `isError` 조건부 렌더링 | `error.tsx` 파일 |
| json-server (`db.json`) | TMDB API (실제 데이터) |
