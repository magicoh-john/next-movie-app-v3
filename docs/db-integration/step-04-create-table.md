## Step 04 — 테이블 생성 및 사용자 INSERT 실습 `(20분)`

### 이 단계에서 하는 것

ERD Cloud에서 추출한 SQL로 DBeaver에서 `users` 테이블을 생성하고,
테스트 계정을 직접 INSERT합니다.

---

### 1. sql/schema.sql 파일 생성

프로젝트 루트에 `sql/` 폴더를 만들고 스키마 파일을 저장합니다.
이 파일은 DB 구조의 **공식 문서** 역할을 합니다.

`sql/schema.sql` 파일을 새로 만들고 아래 내용을 작성합니다:

```sql
CREATE TABLE IF NOT EXISTS users (
    id          UUID         NOT NULL DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT users_pkey         PRIMARY KEY (id),
    CONSTRAINT users_email_unique UNIQUE (email)
);
```

> **DBeaver 주의사항**: SQL 중간에 빈 줄이 있으면 DBeaver가 그 지점에서 문장을 나눠 실행합니다.
> `CONSTRAINT` 앞에 빈 줄이 없어야 전체가 하나의 쿼리로 실행됩니다.

> `IF NOT EXISTS`를 붙이면 이미 테이블이 있을 때 오류 없이 넘어갑니다.
> 파일을 반복 실행해도 안전합니다.

---

### 2. DBeaver에서 테이블 생성

`movie_app` 연결에서 SQL Editor를 열고 위 SQL을 실행합니다.

**실행 방법**:

1. 왼쪽 패널에서 `movie_app` 연결 선택
2. **SQL Editor** → **New SQL Script**
3. `sql/schema.sql` 내용을 붙여넣기
4. **Ctrl+A** (전체 선택) → **Ctrl+Enter** (실행)

**결과 확인**:

1. 왼쪽 패널에서 `movie_app` 연결 우클릭 → **Refresh**
2. `movie_app` → `Schemas` → `public` → `Tables` → `users` 확인
3. `users` 테이블 더블클릭 → **Columns** 탭에서 컬럼 목록 확인

---

### 3. 테스트 계정 INSERT

애플리케이션을 연결하기 전에 로그인할 수 있는 계정을 직접 만들어 둡니다.

SQL Editor에서 실행합니다:

```sql
INSERT INTO users (email, name, password)
VALUES ('admin@test.com', '테스트 유저', '1234');
```

**결과 확인**:

```sql
SELECT * FROM users;
```

DBeaver 하단에 방금 추가한 행이 표시됩니다.

```
id                                   | email            | name       | password     | created_at
-------------------------------------|------------------|------------|--------------|------------------------
550e8400-e29b-41d4-a716-446655440000 | test@test.com | 테스트 유저 | 1234 | 2026-05-21 09:00:00+09
```

**비밀번호 `1234`가 그대로 보입니다.**

지금은 평문(암호화하지 않은 텍스트)으로 저장했습니다.
이 상태에서 앱과 연결해 로그인이 동작하는 것을 먼저 확인합니다.
step-07에서 회원가입 시 bcrypt로 해시하는 방법을 배웁니다.

> **왜 평문부터 시작하는가?**
>
> 암호화 없이 먼저 연결하는 이유는 **단계를 나눠 확인하기 위해서**입니다.
> DB 연결, SQL 쿼리, 로그인 흐름이 제대로 동작하는지 먼저 확인하고,
> 그 이후에 암호화를 추가합니다.
> 한 번에 모든 것을 바꾸면 어디서 오류가 났는지 파악하기 어렵습니다.

---

### 4. 추가 실습 — UPDATE와 DELETE 체험

**비밀번호 변경 (UPDATE)**:

```sql
UPDATE users
SET password = 'newpassword'
WHERE email = 'test@example.com';
```

**사용자 삭제 (DELETE)**:

```sql
DELETE FROM users WHERE email = 'test@example.com';
```

삭제 후 다시 INSERT해서 테스트 계정을 복원합니다:

```sql
INSERT INTO users (email, name, password)
VALUES ('admin@test.com', '테스트 유저', '1234');
```

---

### 5. DBeaver에서 데이터 직접 수정하기

SQL을 쓰지 않고도 DBeaver에서 데이터를 직접 편집할 수 있습니다.

1. `users` 테이블 더블클릭
2. **Data** 탭 선택
3. 셀을 더블클릭하면 수정 가능
4. 하단 **Save** 버튼 클릭

스프레드시트처럼 데이터를 직접 편집할 수 있습니다.

---

### 이 단계에서 한 것

| 항목                               | 완료 |
| ---------------------------------- | ---- |
| `sql/schema.sql` 파일 생성         | ✓    |
| DBeaver에서 users 테이블 생성      | ✓    |
| 테스트 계정 INSERT (평문 비밀번호) | ✓    |
| SELECT / UPDATE / DELETE 실습      | ✓    |
