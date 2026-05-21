## Step 06 — 앱과 DB 연결 (평문 로그인) `(45분)`

### 이 단계에서 하는 것

`pg` 라이브러리로 Next.js 앱과 PostgreSQL을 연결하고,
`authorize()` 함수가 환경변수 대신 DB에서 사용자를 조회하도록 수정합니다.

지금은 **평문 비밀번호를 그대로 비교**합니다.
이것이 왜 위험한지 직접 눈으로 확인한 후, step-07·08에서 암호화를 추가합니다.

---

### 현재 코드의 한계

`src/lib/auth.ts`의 `authorize()` 함수를 보면:

```ts
const adminEmail = process.env.ADMIN_EMAIL ?? "";
const adminPassword = process.env.ADMIN_PASSWORD ?? "";
```

환경변수에 딱 1명의 계정 정보가 하드코딩되어 있습니다.
회원가입을 구현하더라도 이 방식으로는 새 계정을 DB에 저장할 수 없습니다.

**목표**: `authorize()` 가 DB에서 사용자를 조회해 비교하도록 교체합니다.

```
현재: 환경변수 → 문자열 직접 비교
변경: DB 조회(SELECT) → 비밀번호 비교
```

---

### 1. pg 라이브러리란

#### 왜 필요한가

DBeaver는 **사람**이 직접 SQL을 실행하는 GUI 도구입니다.
Next.js 앱은 **코드**가 자동으로 SQL을 실행해야 합니다.

코드에서 PostgreSQL에 접속하려면 두 가지가 통신하는 방법이 필요합니다:

```
Next.js 코드  ──?──▶  PostgreSQL
```

`pg` (node-postgres)가 그 다리 역할을 합니다:

```
Next.js 코드  ──pg──▶  PostgreSQL
```

`pg` 는 Node.js 생태계에서 가장 오래되고 널리 쓰이는 PostgreSQL 클라이언트입니다.
ORM(Prisma, TypeORM 등)도 내부적으로 `pg` 위에서 동작합니다.

---

#### Connection vs Connection Pool

`pg` 에는 두 가지 연결 방식이 있습니다.

**Client — 연결 1개**

```
요청 → new Client() → 연결 → 쿼리 → 연결 해제
요청 → new Client() → 연결 → 쿼리 → 연결 해제
요청 → new Client() → 연결 → 쿼리 → 연결 해제
```

요청마다 새 연결을 맺고 끊습니다. 연결을 맺는 데 시간이 걸리고,
동시 요청이 많으면 DB가 과부하됩니다.

**Pool — 연결 묶음**

```
앱 시작 시 연결 10개를 미리 만들어 대기

요청A → Pool에서 연결 빌림 → 쿼리 → 반납
요청B → Pool에서 연결 빌림 → 쿼리 → 반납   (동시 처리 가능)
요청C → Pool에서 연결 빌림 → 쿼리 → 반납
```

미리 만든 연결을 재사용합니다. 빠르고 효율적입니다.
서버 애플리케이션에서는 항상 Pool을 사용합니다.

---

#### pool.query() 사용법

```ts
// 기본 사용 예시
const result = await pool.query("SELECT * FROM users");
const rows = result.rows; // 결과 배열
```

**파라미터 전달 — $1, $2 플레이스홀더**

```ts
// ❌ 문자열 연결 — SQL Injection 위험
const sql = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ 플레이스홀더 — pg가 안전하게 처리
const result = await pool.query(
  "SELECT * FROM users WHERE email = $1",
  [email], // $1 자리에 들어갈 값
);
```

`$1`, `$2` 는 값의 순서를 나타내는 자리표시자입니다.
`pg`가 값을 안전하게 이스케이프해서 SQL Injection을 방지합니다.

**결과 접근**

```ts
const { rows } = await pool.query("SELECT * FROM users");

rows; // 전체 결과 배열  [ {id: ..., email: ...}, ... ]
rows[0]; // 첫 번째 행
rows.length; // 결과 개수
```

---

#### 패키지 설치

npm install pg // PostgreSQL 클라이언트 라이브러리
npm install --save-dev @types/pg // TypeScript 타입 정의

```bash
npm install pg
npm install --save-dev @types/pg
```

`pg` — 실제 동작하는 라이브러리 (운영 환경에도 필요)
`@types/pg` — TypeScript 타입 정의. 자동완성과 타입 오류 감지에 필요하지만 실행에는 불필요해서 `devDependencies`에 넣습니다.

---

### 2. 환경변수 설정

`.env.local` 파일에 `DATABASE_URL` 을 추가합니다:

```
DATABASE_URL=postgresql://postgres:비밀번호@localhost:5432/movie_app
```

`비밀번호` 부분을 step-01에서 설정한 실제 비밀번호로 바꿉니다.

`.env.example` 파일에도 빈 값으로 형식을 추가합니다:

```
DATABASE_URL=postgresql://postgres:비밀번호@localhost:5432/movie_app
```

> `.env.local` 은 `.gitignore`에 포함되어 있어 GitHub에 올라가지 않습니다.
> `.env.example` 은 형식만 알려주는 예시 파일로, 실제 비밀번호 없이 올립니다.

---

### 3. src/lib/db.ts 생성

`src/lib/db.ts` 파일을 새로 만듭니다.

```ts
import { Pool } from "pg";

// 개발 중 Hot Reload 시 Pool이 중복 생성되는 것을 방지합니다.
// process.env.NODE_ENV가 'production'이 아니면(= 개발 환경이면)
// 처음 만든 Pool을 전역 변수에 저장해 재사용합니다.
// 이렇게 하는 이유는? 개발 서버는 코드가 변경될 때마다 모듈을 다시 불러오기 때문입니다.
// globalThis는 브라우저의 window, Node.js의 global과 같은 전역 객체입니다.
const globalForDb = globalThis as unknown as { pool: Pool | undefined };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export default pool;
```

**왜 globalThis에 저장하는가?**

Next.js 개발 서버는 파일이 변경되면 모듈을 다시 불러옵니다(Hot Reload).
`db.ts`가 다시 실행될 때마다 `new Pool()`이 호출되면 연결이 계속 늘어납니다.
전역 변수에 저장하면 이미 만든 Pool을 재사용하므로 연결이 하나로 유지됩니다.

**문법 설명: `globalThis as unknown as { pool: Pool | undefined }`**
- `globalThis`: 실행 환경에 상관없이 항상 올바른 최상위 전역 객체(Node.js의 `global`)를 가리킵니다.
- `as unknown`: 기본 전역 객체에는 `pool` 속성이 없으므로 발생하는 타입 에러를 우회하기 위해 일단 '알 수 없는 타입'으로 덮어씌우는 타입 단언(Type Assertion)입니다.
- `as { pool: ... }`: 최종적으로 `pool` 속성을 가진 객체로 타입을 강제합니다.
결과적으로, 전역 공간을 메모리 저장소로 쓰면서 TypeScript의 타입 검사 에러를 피하기 위한 '이중 타입 단언' 기법입니다.

이 패턴은 Prisma도 동일하게 사용합니다.

---

### 4. src/lib/auth.ts 수정

`src/lib/auth.ts` 파일 전체를 아래 내용으로 교체합니다.

**변경 전 코드와 비교해서 달라진 점**:

- `timingSafeEqual`, `safeEqual` 함수 제거
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` 환경변수 제거
- `pool.query()` 로 DB에서 사용자 조회
- 평문 비밀번호를 `===` 로 비교 (임시 — step-08에서 교체)

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { loginSchema } from "@/schemas/auth.schema";
import { checkRateLimit, recordFailure, resetFailure } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import pool from "@/lib/db";

// DB에서 조회한 users 행의 타입
interface DbUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const { blocked } = checkRateLimit(email);
        if (blocked) {
          logger.warn(`[auth] 로그인 차단됨 (Rate Limit 초과): ${email}`);
          return null;
        }

        // DB에서 이메일로 사용자 조회
        // $1은 플레이스홀더 — SQL Injection 방지
        const { rows } = await pool.query<DbUser>(
          "SELECT id, email, name, password FROM users WHERE email = $1",
          [email],
        );
        const user = rows[0];

        if (!user) {
          recordFailure(email);
          logger.warn(`[auth] 로그인 실패 (없는 이메일): ${email}`);
          return null;
        }

        // ⚠️ 평문 비교 — 임시 방법입니다
        // step-08에서 bcrypt.compare() 로 교체합니다
        if (user.password !== password) {
          recordFailure(email);
          logger.warn(`[auth] 로그인 실패: ${email}`);
          return null;
        }

        resetFailure(email);
        logger.log(`[auth] 로그인 성공: ${email}`);

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
```

---

### 5. .env.local에서 기존 환경변수 정리

`ADMIN_EMAIL`과 `ADMIN_PASSWORD`는 더 이상 사용하지 않습니다.
`.env.local`에서 해당 줄을 삭제하거나 주석 처리합니다:

```
# 더 이상 사용하지 않음 — DB 인증으로 전환
# ADMIN_EMAIL=admin@test.com
# ADMIN_PASSWORD=1234
```

---

### 6. 로그인 테스트

개발 서버를 시작합니다:

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/login` 접속 후
step-04에서 INSERT한 계정으로 로그인을 시도합니다:

- 이메일: `admin@test.com`
- 비밀번호: `1234`

로그인이 성공하면 홈 화면으로 이동합니다.

---

### 7. 지금 상태의 문제점 확인

DBeaver에서 다시 조회해봅니다:

```sql
SELECT * FROM users;
```

`password` 컬럼에 `1234` 가 그대로 보입니다.

이것이 **평문 저장의 문제**입니다:

- DB 관리자가 모든 사용자의 비밀번호를 볼 수 있습니다.
- DB가 해킹되면 모든 비밀번호가 즉시 노출됩니다.
- 사용자가 다른 사이트에서 같은 비밀번호를 쓴다면 연쇄 피해가 발생합니다.

이 문제를 해싱으로 해결합니다.

---

### 이 단계에서 만든 것

| 파일              | 작업                          |
| ----------------- | ----------------------------- |
| `src/lib/db.ts`   | 신규 생성 — pg Pool 싱글톤    |
| `src/lib/auth.ts` | 수정 — DB 조회 + 평문 비교    |
| `.env.local`      | 수정 — DATABASE_URL 추가      |
| `.env.example`    | 수정 — DATABASE_URL 형식 추가 |
