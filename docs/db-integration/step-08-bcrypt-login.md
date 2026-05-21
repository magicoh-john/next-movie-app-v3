## Step 08 — 로그인 bcrypt 비교로 업그레이드 `(20분)`

### 이 단계에서 하는 것

`authorize()` 함수의 평문 비교를 `bcrypt.compare()` 로 교체합니다.
step-07에서 만든 해시 계정으로 로그인이 동작하는 것을 확인합니다.

---

### 1. 왜 bcrypt.compare()인가

step-06의 `authorize()` 에는 이런 코드가 있습니다:

```ts
if (user.password !== password) {
```

DB의 `password_hash` 컬럼에는 해시가 저장되어 있고,
`password` 변수에는 사용자가 입력한 평문이 있습니다.

해시는 원본을 복원할 수 없으므로 `===` 로는 절대 일치하지 않습니다.

**`bcrypt.compare()` 는 평문을 해시화해서 비교합니다:**

```
사용자 입력: "mypassword"
DB 해시:    "$2a$12$N9qo8uLOickgx2..."

bcrypt.compare("mypassword", "$2a$12$N9qo8uLOickgx2...")
→ 내부적으로 "mypassword"를 같은 솔트로 해시
→ 결과가 DB 해시와 일치하면 true
```

---

### 2. src/lib/auth.ts 수정

`authorize()` 에서 두 가지를 바꿉니다:

1. `pool.query` 의 컬럼명: `password` → `password_hash`
2. 비교 방식: `user.password !== password` → `bcrypt.compare()`

**변경 내용** (수정이 필요한 부분):

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '@/lib/auth.config'
import { loginSchema } from '@/schemas/auth.schema'
import { checkRateLimit, recordFailure, resetFailure } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'

interface DbUser {
  id: string
  email: string
  name: string
  password_hash: string
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const { blocked } = checkRateLimit(email)
        if (blocked) {
          logger.warn(`[auth] 로그인 차단됨 (Rate Limit 초과): ${email}`)
          return null
        }

        const { rows } = await pool.query<DbUser>(
          'SELECT id, email, name, password_hash FROM users WHERE email = $1',
          [email]
        )
        const user = rows[0]

        if (!user) {
          // 사용자가 없어도 bcrypt.compare()를 실행합니다.
          // 실행 시간을 일정하게 유지해 "이메일 존재 여부"가
          // 응답 속도로 노출되지 않도록 합니다(타이밍 공격 방어).
          await bcrypt.compare(password, '$2a$12$dummyhashfortimingattackdefense')
          recordFailure(email)
          logger.warn(`[auth] 로그인 실패 (없는 이메일): ${email}`)
          return null
        }

        const isMatch = await bcrypt.compare(password, user.password_hash)

        if (!isMatch) {
          recordFailure(email)
          logger.warn(`[auth] 로그인 실패: ${email}`)
          return null
        }

        resetFailure(email)
        logger.log(`[auth] 로그인 성공: ${email}`)

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
})
```

---

### 3. 타이밍 공격 방어 — 왜 사용자가 없어도 비교하는가

아래 코드를 주목합니다:

```ts
if (!user) {
  await bcrypt.compare(password, '$2a$12$dummyhashfortimingattackdefense')
  ...
  return null
}
```

만약 사용자가 없을 때 즉시 `return null` 하면 어떻게 될까요?

- 이메일이 없는 경우: **응답이 빠릅니다** (즉시 return)
- 이메일이 있는 경우: **응답이 느립니다** (bcrypt.compare 실행)

공격자는 응답 속도 차이로 어떤 이메일이 실제로 가입되어 있는지 알 수 있습니다.
이를 **타이밍 공격(Timing Attack)** 이라 합니다.

`bcrypt.compare()` 를 항상 실행하면 성공/실패 모두 비슷한 시간이 걸려
이메일 존재 여부가 노출되지 않습니다.

---

### 4. 기존 평문 계정 처리

step-04에서 직접 INSERT한 평문 계정(`test@example.com / password1234`)은
이제 `bcrypt.compare()` 로 비교하므로 **로그인이 불가능**합니다.

이 계정을 삭제하고 step-07의 회원가입으로 새로 만드는 것을 권장합니다:

```sql
-- DBeaver에서 실행
DELETE FROM users WHERE email = 'test@example.com';
```

이후 `http://localhost:3000/register` 에서 새 계정을 만듭니다.

---

### 5. 최종 테스트

1. `http://localhost:3000/register` 에서 새 계정 회원가입
2. 자동으로 `/login` 으로 이동
3. 방금 만든 계정으로 로그인
4. 홈 화면으로 이동 확인

**DBeaver에서 확인**:

```sql
SELECT id, email, name, password_hash, created_at FROM users;
```

모든 계정의 `password_hash` 가 `$2a$12$...` 형식의 해시로 저장되어 있습니다.

---

### 6. 전체 인증 흐름 정리

```
[회원가입]
RegisterForm
  → register() Server Action
    → registerSchema 검증
    → 이메일 중복 확인 (SELECT)
    → bcrypt.hash(password, 12) → 해시 생성
    → INSERT INTO users (email, name, password_hash)
    → /login 리다이렉트

[로그인]
LoginForm
  → signIn('credentials') 호출
    → authorize() 실행
      → loginSchema 검증
      → checkRateLimit(email)
      → SELECT * FROM users WHERE email = $1
      → 사용자 없어도 bcrypt.compare() 더미 실행 (타이밍 공격 방어)
      → bcrypt.compare(password, user.password_hash)
      → 성공: resetFailure() → 세션 발급 → 홈으로 이동
      → 실패: recordFailure() → 오류 반환

[보호 라우트]
/favorites 접근
  → middleware.ts → authConfig.authorized()
  → 미인증 시 /login 리다이렉트
```

---

### 이 단계에서 한 것

| 파일 | 작업 |
|------|------|
| `src/lib/auth.ts` | 수정 — `bcrypt.compare()` 로 교체, 컬럼명 `password_hash` |

---

### 전체 과정 요약

| 단계 | 핵심 작업 | 비밀번호 저장 방식 |
|------|-----------|------------------|
| step-04 | 테이블 생성, 수동 INSERT | 평문 (`password1234`) |
| step-06 | 앱-DB 연결, 평문 비교 로그인 | 평문 |
| step-07 | 회원가입 + bcrypt 해시 | 해시 (`$2a$12$...`) |
| step-08 | bcrypt.compare() 로그인 | 해시 비교 |

평문으로 시작해서 해시로 전환하는 과정을 직접 경험했습니다.
왜 비밀번호를 해시해야 하는지, 어떤 방식으로 검증하는지 코드로 확인했습니다.
