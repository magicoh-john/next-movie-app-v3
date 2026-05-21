## Step 03 — ERD Cloud로 테이블 설계 및 SQL 추출 `(30분)`

### 이 단계에서 하는 것

ERD Cloud에서 회원가입·로그인에 필요한 `users` 테이블을 설계하고,
SQL DDL을 추출합니다.

---

### 1. 코드 이전에 설계를 먼저 하는 이유

지금까지 로그인 사용자는 `.env.local`에 저장되어 있었습니다.

```
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD=1234
```

사용자가 1명으로 고정되고, 회원가입이 불가능합니다.
데이터베이스로 전환하면 여러 사용자를 저장할 수 있고, 회원가입 기능도 추가할 수 있습니다.

데이터베이스 테이블을 만들기 전에 **어떤 컬럼이 필요한지 먼저 설계**합니다.
나중에 컬럼을 추가하거나 이름을 바꾸는 `ALTER TABLE`은 번거롭기 때문입니다.

**ERD(Entity Relationship Diagram)** 는 테이블 구조와 관계를 시각적으로 표현한 다이어그램입니다.

---

### 2. ERD Cloud란

**ERD Cloud** 는 웹 브라우저에서 ERD를 그리고 SQL을 추출하는 무료 도구입니다.
설치 없이 바로 사용할 수 있고, 한국어를 지원합니다.

주소: [https://www.erdcloud.com/](https://www.erdcloud.com/)

---

### 3. 회원 테이블에 필요한 컬럼 결정

로그인과 회원가입에 최소한 필요한 정보를 먼저 생각합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | 각 사용자를 구별하는 고유 식별자 |
| `email` | VARCHAR(255) | 로그인에 사용하는 이메일 (중복 불가) |
| `name` | VARCHAR(100) | 화면에 표시할 이름 |
| `password` | VARCHAR(255) | 비밀번호 (지금은 평문, 나중에 해시로 교체) |
| `created_at` | TIMESTAMPTZ | 가입일시 |

> **왜 `id`를 UUID로?**
> SERIAL(1, 2, 3...)을 쓰면 URL에서 사용자 수가 노출됩니다(`/users/1`, `/users/2`).
> UUID는 예측 불가능한 값이라 보안상 유리합니다.

> **왜 `password` 컬럼이 VARCHAR(255)?**
> 지금은 평문을 저장하지만, 나중에 bcrypt 해시로 교체합니다.
> bcrypt 해시는 항상 60자이므로 VARCHAR(255)면 충분합니다.

---

### 4. ERD Cloud에서 테이블 만들기

**① 새 다이어그램 생성**

1. [https://www.erdcloud.com/](https://www.erdcloud.com/) 접속
2. 로그인 (또는 비회원으로 시작)
3. **다이어그램 만들기** 클릭
4. 이름: `movie-app` 입력 → 생성

**② users 테이블 추가**

1. 화면 빈 곳에서 우클릭 → **테이블 추가** (또는 상단 테이블 아이콘 클릭)
2. 테이블 이름을 `users`로 입력

**③ 컬럼 추가**

테이블을 더블클릭하거나 편집 버튼을 눌러 컬럼을 추가합니다.

| 컬럼명 | 데이터 타입 | 제약조건 |
|--------|------------|----------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `name` | VARCHAR(100) | NOT NULL |
| `password` | VARCHAR(255) | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

각 컬럼의 제약조건(NOT NULL, UNIQUE, DEFAULT 등)을 설정합니다.

완성된 테이블은 다음과 같이 보입니다:

```
┌─────────────────────────────────┐
│             users               │
├─────────────────────────────────┤
│ PK  id          UUID            │
│     email       VARCHAR(255)    │ ← UNIQUE
│     name        VARCHAR(100)    │
│     password    VARCHAR(255)    │
│     created_at  TIMESTAMPTZ     │
└─────────────────────────────────┘
```

---

### 5. SQL 추출

ERD Cloud에서 설계한 테이블을 SQL DDL로 변환합니다.

1. 상단 메뉴 → **SQL 내보내기** (또는 Export DDL)
2. DBMS 선택: **PostgreSQL**
3. 생성된 SQL을 복사합니다.

추출된 SQL은 대략 다음과 같습니다:

```sql
CREATE TABLE "users" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "email"      VARCHAR(255) NOT NULL,
    "name"       VARCHAR(100) NOT NULL,
    "password"   VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    UNIQUE ("email")
);
```

> ERD Cloud가 생성하는 SQL은 도구마다 약간 다를 수 있습니다.
> 다음 단계(step-04)에서 실제 PostgreSQL에 맞게 정리합니다.

---

### 6. ERD를 먼저 그리는 습관

실무에서는 코드를 작성하기 전에 항상 ERD를 먼저 그립니다.

- 팀원과 DB 구조를 공유하고 합의할 수 있습니다.
- 컬럼 누락이나 잘못된 타입을 **코드 작성 전에** 발견할 수 있습니다.
- 문서로 남겨두면 나중에 DB 구조를 빠르게 파악할 수 있습니다.

이번 프로젝트는 테이블이 1개지만, 나중에 OAuth 로그인을 추가하면
`accounts` 테이블이 `users`와 연결됩니다. ERD에 관계선을 그려두면
구조를 한눈에 파악할 수 있습니다.

---

### 이 단계에서 한 것

| 항목 | 완료 |
|------|------|
| ERD Cloud에서 users 테이블 설계 | ✓ |
| 컬럼 5개와 제약조건 설정 | ✓ |
| PostgreSQL DDL SQL 추출 | ✓ |
