# 사용자 정보 영속화 기획안

- **작성일**: 2026-05-21
- **대상 프로젝트**: next-movie-app
- **연관 문서**: [로그인 기능 최적화 보고서](./login-optimization-report.md)

---

## PostgreSQL 사용 계획

### 1. 설치

Windows 환경 기준으로 PostgreSQL을 직접 설치한다.

**설치 경로**: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)

설치 시 결정해야 할 항목:

| 항목               | 권장값                   | 설명                 |
| ------------------ | ------------------------ | -------------------- |
| 포트               | `5432`                   | PostgreSQL 기본 포트 |
| superuser 이름     | `postgres`               | 기본 관리자 계정     |
| superuser 비밀번호 | 직접 설정                | `.env.local`에 기록  |
| locale             | `Korean, Korea` 또는 `C` | `C`가 성능상 유리    |

설치 후 확인:

```bash
psql --version
# PostgreSQL 16.x 출력되면 정상
```

---

### 2. DB 및 유저 생성

설치 후 `psql`로 접속하여 앱 전용 DB와 유저를 생성한다.

```sql
-- postgres 슈퍼유저로 접속
psql -U postgres

-- 앱 전용 유저 생성
CREATE USER movie_app_user WITH PASSWORD '비밀번호';

-- 앱 전용 DB 생성
CREATE DATABASE movie_app OWNER movie_app_user;

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE movie_app TO movie_app_user;

-- 접속 종료
\q
```

접속 확인:

```bash
psql -U movie_app_user -d movie_app
# 접속 성공 시 "movie_app=>" 프롬프트 출력
```

---

### 3. 스키마 관리 전략

ORM(Prisma) 없이 Raw SQL 파일로 스키마를 직접 관리한다.

```
sql/
└── schema.sql       # 테이블 정의 DDL (버전 관리 대상)
```

**적용 방법** (최초 1회):

```bash
psql -U movie_app_user -d movie_app -f sql/schema.sql
```

**변경이 생길 경우**: 별도 마이그레이션 파일을 수동으로 작성하여 순서대로 적용한다.

```
sql/
├── schema.sql              # 초기 스키마
└── migrations/
    └── 001_add_column.sql  # 향후 변경 사항
```

> Prisma migrate처럼 자동 추적은 없으므로, 팀 작업 시 마이그레이션 파일 번호와 실행 이력을 README 또는 별도 문서로 관리하는 것을 권장한다.

---

### 4. 연결 방식 (`pg` Pool)

앱에서 PostgreSQL에 접근하는 방식은 **Connection Pool** 기반이다.

```
Next.js App Server
      │
      ▼
  pg.Pool (최대 10개 연결 유지)
      │
      ▼
 PostgreSQL (localhost:5432/movie_app)
```

- 요청마다 새 연결을 맺는 대신 Pool에서 연결을 빌려 사용하고 반납
- `src/lib/db.ts`에 Pool 싱글톤을 선언하여 전역에서 재사용
- Server Action / `authorize()` 에서 `pool.query(sql, params)` 형태로 호출
- 파라미터는 반드시 `$1, $2, ...` 플레이스홀더를 사용하여 SQL Injection 방지

```ts
// 사용 예시
const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
  email,
]);
```

---

### 5. 환경변수

| 변수           | 형식                                          | 예시                                                        |
| -------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL` | `postgresql://유저:비밀번호@호스트:포트/DB명` | `postgresql://movie_app_user:1234@localhost:5432/movie_app` |

`.env.local`에 추가, `.env.example`에 빈 값으로 형식 명시.

---

### 6. 개발 / 운영 환경 분리

| 환경         | DB 위치                 | 비고                     |
| ------------ | ----------------------- | ------------------------ |
| 개발 (local) | `localhost:5432`        | 직접 설치한 PostgreSQL   |
| 운영 (향후)  | 별도 서버 또는 클라우드 | Neon / Supabase / RDS 등 |

운영 배포 시 `DATABASE_URL`만 교체하면 코드 변경 없이 동작한다.

---

## 기술 선택

| 항목          | 선택                                | 이유                                         |
| ------------- | ----------------------------------- | -------------------------------------------- |
| DB 클라이언트 | **`pg` (node-postgres)**            | PostgreSQL 표준 클라이언트, 가장 넓은 생태계 |
| 비밀번호 해싱 | **`bcryptjs`**                      | 순수 JS, 네이티브 바인딩 불필요              |
| 스키마 관리   | **Raw SQL 파일** (`sql/schema.sql`) | ORM 없이 직접 DDL 관리                       |
| 타입 안전성   | **수동 TypeScript 인터페이스**      | DB Row 타입을 직접 정의                      |

---

## 1. ERD

```
┌─────────────────────────────┐
│           users             │
├─────────────────────────────┤
│ PK  id            UUID      │
│     email         VARCHAR   │◄── UNIQUE INDEX
│     name          VARCHAR   │
│     password_hash VARCHAR   │
│     email_verified BOOLEAN  │
│     created_at    TIMESTAMPTZ│
│     updated_at    TIMESTAMPTZ│
└─────────────────────────────┘
```

### users 테이블 명세

| 컬럼             | 타입           | 제약                            | 설명                           |
| ---------------- | -------------- | ------------------------------- | ------------------------------ |
| `id`             | `UUID`         | PK, `DEFAULT gen_random_uuid()` | 사용자 고유 식별자             |
| `email`          | `VARCHAR(255)` | UNIQUE, NOT NULL                | 로그인 ID                      |
| `name`           | `VARCHAR(100)` | NOT NULL                        | 표시 이름                      |
| `password_hash`  | `VARCHAR(255)` | NOT NULL                        | bcrypt 해시 비밀번호           |
| `email_verified` | `BOOLEAN`      | NOT NULL, `DEFAULT FALSE`       | 이메일 인증 여부 (향후 확장용) |
| `created_at`     | `TIMESTAMPTZ`  | NOT NULL, `DEFAULT NOW()`       | 가입일                         |
| `updated_at`     | `TIMESTAMPTZ`  | NOT NULL, `DEFAULT NOW()`       | 수정일                         |

> **왜 테이블 1개인가?** JWT 세션 방식(현재)은 DB에 세션을 저장하지 않는다. OAuth 추가 시 `accounts` 테이블을 연결하면 되고, 그 시점에 `users ──< accounts` 관계가 추가된다.

---

## 2. SQL DDL (`sql/schema.sql`)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255)  NOT NULL,
  name           VARCHAR(100)  NOT NULL,
  password_hash  VARCHAR(255)  NOT NULL,
  email_verified BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 3. 구현 Task 목록

### Phase 1 — PostgreSQL 설치 및 DB 구축

| Task | 작업                                             | 결과물                                       |
| ---- | ------------------------------------------------ | -------------------------------------------- |
| 1    | PostgreSQL 설치 확인, DB·유저 생성 (`psql` 명령) | `movie_app` DB 생성                          |
| 2    | SQL 스키마 파일 작성                             | `sql/schema.sql` 신규 생성                   |
| 3    | `psql`로 DDL 실행 → 테이블 생성 확인             | `users` 테이블 생성                          |
| 4    | `pg` 설치, DB 연결 모듈 작성, 환경변수 설정      | `src/lib/db.ts` 신규 생성, `.env.local` 수정 |

### Phase 2 — 회원가입 기능

| Task | 작업                                                            | 결과물                                      |
| ---- | --------------------------------------------------------------- | ------------------------------------------- |
| 5    | `registerSchema` 추가 (이름·이메일·비밀번호·확인)               | `src/schemas/auth.schema.ts` 수정           |
| 6    | 회원가입 서버 액션 (bcrypt 해싱 + DB insert + 중복 이메일 처리) | `src/actions/register.ts` 신규 생성         |
| 7    | 회원가입 폼 컴포넌트 (RHF + Zod + useTransition)                | `src/components/RegisterForm.tsx` 신규 생성 |
| 8    | 회원가입 페이지                                                 | `src/app/register/page.tsx` 신규 생성       |

### Phase 3 — 로그인 DB 연동

| Task | 작업                                                          | 결과물                       |
| ---- | ------------------------------------------------------------- | ---------------------------- |
| 9    | `authorize()` → DB 조회 + `bcrypt.compare()` 로 교체          | `src/lib/auth.ts` 수정       |
| 10   | Rate Limit을 이메일 기준으로 유지 (변경 없음)                 | `src/lib/rate-limit.ts` 유지 |
| 11   | `safeEqual()` → `bcrypt.compare()` 로 교체 (타이밍 안전 내장) | `src/lib/auth.ts` 수정       |

### Phase 4 — UX 연결

| Task | 작업                               | 결과물                        |
| ---- | ---------------------------------- | ----------------------------- |
| 12   | 로그인 페이지에 회원가입 링크 추가 | `src/app/login/page.tsx` 수정 |

---

## 4. 변경/생성 파일 요약

| 파일                              | 작업                                    |
| --------------------------------- | --------------------------------------- |
| `sql/schema.sql`                  | **신규 생성** — DDL                     |
| `src/lib/db.ts`                   | **신규 생성** — `pg` Pool 싱글톤        |
| `src/schemas/auth.schema.ts`      | **수정** — `registerSchema` 추가        |
| `src/actions/register.ts`         | **신규 생성** — 회원가입 서버 액션      |
| `src/components/RegisterForm.tsx` | **신규 생성** — 회원가입 폼             |
| `src/app/register/page.tsx`       | **신규 생성** — 회원가입 페이지         |
| `src/lib/auth.ts`                 | **수정** — DB 조회 + `bcrypt.compare()` |
| `src/app/login/page.tsx`          | **수정** — 회원가입 링크 추가           |
| `.env.local`                      | **수정** — `DATABASE_URL` 추가          |
| `.env.example`                    | **수정** — `DATABASE_URL` 항목 추가     |

---

## 5. 핵심 모듈 구조

### `src/lib/db.ts` — pg Pool 싱글톤

```ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
```

### `src/actions/register.ts` — 회원가입 흐름

```
registerSchema 검증
  → DB 이메일 중복 확인 (SELECT)
  → bcrypt.hash(password, 12)
  → INSERT INTO users
  → /login 리다이렉트
```

### `src/lib/auth.ts` authorize() — 로그인 흐름

```
loginSchema 검증
  → checkRateLimit()
  → SELECT * FROM users WHERE email = $1
  → 사용자 없어도 bcrypt.compare() 실행 (타이밍 공격 방어 유지)
  → bcrypt.compare(password, user.password_hash)
  → 성공: resetFailure() + 세션 발급
  → 실패: recordFailure() + null 반환
```

---

## 6. 인증 흐름 (구현 후)

```
[회원가입]
RegisterForm → registerSchema 클라이언트 검증
            → register() 서버 액션
              → DB 이메일 중복 확인
              → bcrypt.hash(password, 12)
              → INSERT INTO users
              → 성공 시 /login 리다이렉트

[로그인]
LoginForm → loginSchema 클라이언트 검증
          → signIn('credentials') 호출
          → authorize() 서버 실행
            → loginSchema 서버 검증
            → checkRateLimit(email)
            → SELECT * FROM users WHERE email = $1
            → 사용자 없어도 bcrypt.compare() 더미 실행 (타이밍 공격 방어)
            → bcrypt.compare(password, user.password_hash)
            → 성공: resetFailure() + 세션 발급 → router.push('/')
            → 실패: recordFailure() + 에러 반환

[보호 라우트]
/favorites 접근
  → middleware.ts → authConfig.authorized() 콜백
  → 미인증 시 /login 리다이렉트
```

---

## 7. 향후 과제

| 항목                 | 현재                         | 권장 전환 시점                                    |
| -------------------- | ---------------------------- | ------------------------------------------------- |
| Rate Limiting 저장소 | 서버 메모리 Map              | 다중 인스턴스 환경에서 Redis 도입                 |
| 이메일 인증          | `email_verified` 컬럼만 존재 | 이메일 발송 서비스 연동 시 구현                   |
| OAuth 로그인         | 미지원                       | `accounts` 테이블 추가 후 Google 등 연동          |
| 세션 방식            | JWT (stateless)              | 필요 시 DB 세션으로 전환 (`sessions` 테이블 추가) |

---

## 8. 사전 준비 사항

구현 시작 전 아래 두 가지 확인이 필요하다.

**PostgreSQL 설치 확인**

```bash
psql --version
```

**DATABASE_URL 형식**

```
postgresql://유저명:비밀번호@localhost:5432/movie_app
```
