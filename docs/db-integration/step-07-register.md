## Step 07 — 회원가입 + bcrypt 해시 저장 `(45분)`

### 이 단계에서 하는 것

step-06에서 평문 비밀번호의 문제점을 확인했습니다.
이제 회원가입 시 비밀번호를 **bcrypt로 해시**해서 저장합니다.

비밀번호 원문은 서버 어디에도 저장되지 않습니다.

---

### 1. bcrypt란

**bcrypt** 는 비밀번호를 해시하는 알고리즘입니다.

**해시(Hash)** 란 원본 데이터를 되돌릴 수 없는 고정 길이 문자열로 변환하는 것입니다.

```
"1234"  →  bcrypt  →  "$2a$12$N9qo8uLOickgx2ZMRZo..."
```

특징:

- **단방향** — 해시에서 원본을 복원할 수 없습니다.
- **비교 가능** — `bcrypt.compare("1234", 해시)` 로 일치 여부는 확인할 수 있습니다.
- **느림** — 의도적으로 느리게 설계되어 무차별 대입 공격에 강합니다.
- **솔트** — 같은 비밀번호도 매번 다른 해시가 나옵니다(Rainbow Table 방어).

```
"1234" → "$2a$12$N9qo8uLOickgx2ZMRZo..."  (1번 해시)
"1234" → "$2a$12$Tx3RdsMIxwFOZl6nPV..."   (2번 해시) ← 다른 값!
```

두 해시가 달라도 `bcrypt.compare()` 는 둘 다 `true` 를 반환합니다.

---

### 2. bcryptjs 설치

`bcryptjs` 는 순수 JavaScript로 구현된 bcrypt 라이브러리입니다.
C 코드가 없어 네이티브 컴파일 없이 설치됩니다.

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

**터미널에서 직접 해시(Hash) 동작 테스트해보기**
설치가 완료되었다면, 터미널에서 Node.js를 실행해 암호화가 어떻게 동작하는지 바로 확인해 볼 수 있습니다.

```bash
# 1. 터미널에 node를 입력하여 실행 (프롬프트가 > 로 바뀝니다)
node

# 2. 설치한 bcryptjs 불러오기
> const bcrypt = require('bcryptjs')

# 3. 비밀번호 해시 생성하기 (1234를 암호화, 10은 복잡도)
> const hash = bcrypt.hashSync('1234', 10)

# 4. 해시된 결과 확인하기 (실제 DB에 저장될 문자열입니다)
> console.log(hash)
$2b$10$rPtAA12AHC9PFs26bl1zW.Ct.sF5CyL7FSd5gFMHDXNJU4WjmfjAa

# 5. 비밀번호 비교하기 (true/false 반환)
> bcrypt.compareSync('1234', hash)
true
> bcrypt.compareSync('12345', hash)
false

# 6. 종료
> .exit
```

**얻어낸 해시값으로 기존 계정 업데이트하기 (DBeaver)**
위에서 콘솔을 통해 암호화된 문자열(`$2b$10$...`)을 얻었다면, DBeaver를 열고 기존에 만들어 두었던 테스트 계정(예: `test@example.com`)의 비밀번호를 평문에서 해시값으로 덮어씌울 수 있습니다.

1. DBeaver에서 `users` 테이블의 **데이터 탭**을 엽니다.
2. 기존에 평문(`1234`)으로 저장된 행의 비밀번호 칸을 더블 클릭합니다.
3. 복사해 둔 해시 문자열(`$2b$10$rPtAA12...`)을 붙여넣고 저장(Save) 버튼을 누릅니다.

_(또는 SQL Editor에서 아래 쿼리로 업데이트해도 됩니다)_

```sql
UPDATE users
SET password_hash = '$2b$10$rPtAA12AHC9PFs26bl1zW.Ct.sF5CyL7FSd5gFMHDXNJU4WjmfjAa'
WHERE email = 'test@example.com';
```

---

### 3. password 컬럼 이름 변경

지금 DB의 컬럼 이름은 `password`입니다.
이제부터는 해시된 값을 저장하므로 이름을 `password_hash`로 바꿉니다.

컬럼 이름은 저장된 **내용을 정확히 반영**해야 합니다.
`password` 컬럼에 해시가 들어있으면 나중에 코드를 읽을 때 혼란이 생깁니다.

**DBeaver SQL Editor에서 실행**:

```sql
ALTER TABLE users RENAME COLUMN password TO password_hash;
```

`sql/schema.sql` 파일도 함께 수정합니다:

```sql
-- 변경 전
password    VARCHAR(255) NOT NULL,

-- 변경 후
password_hash  VARCHAR(255) NOT NULL,
```

---

### 4. registerSchema 추가

`src/schemas/auth.schema.ts` 파일에 회원가입 스키마를 추가합니다.

**기존 loginSchema 아래에 추가**:

```ts
export const registerSchema = z
  .object({
    name: z.string().min(2, "이름은 2자 이상이어야 합니다.").trim(),
    email: z
      .string()
      .min(1, "이메일을 입력해주세요.")
      .email("올바른 이메일 형식이 아닙니다.")
      .trim(),
    password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
```

`refine()` 은 두 필드를 비교하는 커스텀 검증입니다.
`password`와 `confirmPassword`가 다르면 `confirmPassword` 필드에 오류를 표시합니다.

---

### 5. src/actions/register.ts 생성 — Server Action

**Server Action** 은 `'use server'` 지시어를 붙인 함수입니다.
클라이언트에서 호출하지만, 서버에서 실행됩니다.

별도 API Route(`/api/register`)를 만들지 않아도 됩니다.
Next.js 15의 권장 방식입니다.

`src/actions/register.ts` 파일을 새로 만듭니다:

```ts
"use server";

import { registerSchema } from "@/schemas/auth.schema";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function register(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  // 서버에서 한 번 더 검증합니다.
  // 클라이언트 검증은 UX를 위한 것이고, 서버 검증이 실제 보안입니다.
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, email, password } = parsed.data;

  // 이메일 중복 확인
  const { rows } = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (rows.length > 0) {
    return { error: "이미 사용 중인 이메일입니다." };
  }

  // 비밀번호 해시
  // 숫자 12는 cost factor — 높을수록 안전하지만 느립니다. 10~12가 일반적입니다.
  const hash = await bcrypt.hash(password, 12);

  // DB에 저장 — 원본 비밀번호는 저장하지 않습니다
  await pool.query(
    "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)",
    [email, name, hash],
  );

  // 회원가입 성공 → 로그인 페이지로 이동
  redirect("/login");
}
```

**`_prevState` 파라미터가 왜 필요한가?**

`useActionState` 훅이 Server Action을 호출할 때 이전 상태(prevState)를 첫 번째 인자로 전달합니다.
지금은 사용하지 않으므로 `_` 로 시작하는 이름을 붙였습니다.
TypeScript에서 `_` 접두사는 "사용하지 않는 변수"를 명시하는 관례입니다.

---

### 6. src/components/RegisterForm.tsx 생성

`src/components/RegisterForm.tsx` 파일을 새로 만듭니다.

`useActionState` 는 React 19에서 추가된 훅입니다.
Server Action의 반환값(상태)을 받아 UI에 반영합니다.

```tsx
"use client";

import { useActionState } from "react";
import { register } from "@/actions/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterForm() {
  // useActionState(실행할_Server_Action, 초기_상태)
  // state     — register() 가 return한 값 (예: { error: '...' })
  // formAction — form의 action 속성에 넣을 함수
  // isPending  — 서버 요청 중이면 true
  const [state, formAction, isPending] = useActionState(register, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">이름</label>
        <Input
          type="text"
          name="name"
          placeholder="홍길동"
          autoComplete="name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">이메일</label>
        <Input
          type="email"
          name="email"
          placeholder="hong@example.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">비밀번호</label>
        <Input
          type="password"
          name="password"
          placeholder="8자 이상"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">비밀번호 확인</label>
        <Input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
        />
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "가입 중..." : "회원가입"}
      </Button>
    </form>
  );
}
```

**LoginForm과 RegisterForm의 차이**

| 항목         | LoginForm                                      | RegisterForm                                         |
| ------------ | ---------------------------------------------- | ---------------------------------------------------- |
| 폼 처리 방식 | `useTransition` + `signIn()`                   | `useActionState` + Server Action                     |
| 이유         | `signIn()`은 next-auth/react의 클라이언트 함수 | 커스텀 Server Action은 `useActionState`가 자연스러움 |
| 유효성 검사  | react-hook-form + Zod                          | 서버에서 Zod (UI 피드백은 서버 응답으로)             |

---

### 7. src/app/register/page.tsx 생성

`src/app/register/` 폴더를 만들고 `page.tsx` 파일을 생성합니다:

```tsx
import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">회원가입</h1>
        <RegisterForm />
      </div>
    </main>
  );
}
```

---

### 8. 로그인 페이지에 회원가입 링크 추가

`src/app/login/page.tsx` 에 링크를 추가합니다:

```tsx
import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">로그인</h1>
        <LoginForm />
        <p className="text-center text-sm text-gray-500 mt-4">
          계정이 없으신가요?{" "}
          <Link href="/register" className="underline">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
```

---

### 9. 회원가입 테스트

1. `http://localhost:3000/register` 접속
2. 새 계정으로 회원가입
3. 로그인 페이지로 자동 이동

**DBeaver에서 확인**:

```sql
SELECT * FROM users;
```

새로 가입한 계정의 `password_hash` 컬럼에 아래처럼 해시가 저장됩니다:

```
$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p36ogYe5EM2bI3YBoGO8CK
```

원본 비밀번호는 DB 어디에도 없습니다.

---

### 10. 아직 남은 문제

회원가입으로 만든 계정으로 **로그인을 시도하면 실패**합니다.

`authorize()` 에 아직 이 코드가 있기 때문입니다:

```ts
if (user.password !== password) {  // ← password_hash와 평문을 비교 → 항상 false
```

해시된 비밀번호와 평문은 절대로 `===` 로 같아질 수 없습니다.
step-08에서 이 부분을 `bcrypt.compare()` 로 교체합니다.

---

### 이 단계에서 만든 것

| 파일                              | 작업                            |
| --------------------------------- | ------------------------------- |
| `src/schemas/auth.schema.ts`      | 수정 — `registerSchema` 추가    |
| `src/actions/register.ts`         | 신규 생성 — Server Action       |
| `src/components/RegisterForm.tsx` | 신규 생성 — 회원가입 폼         |
| `src/app/register/page.tsx`       | 신규 생성 — 회원가입 페이지     |
| `src/app/login/page.tsx`          | 수정 — 회원가입 링크 추가       |
| `sql/schema.sql`                  | 수정 — password → password_hash |
