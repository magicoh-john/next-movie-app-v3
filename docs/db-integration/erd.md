# ERD

## users 테이블

```mermaid
erDiagram
    users {
        UUID        id           PK  "gen_random_uuid()"
        VARCHAR255  email        UK  "로그인 이메일 (중복 불가)"
        VARCHAR100  name             "표시 이름"
        VARCHAR255  password_hash    "bcrypt 해시 비밀번호"
        TIMESTAMPTZ created_at       "가입일시 DEFAULT NOW()"
    }
```

> `password_hash` 컬럼은 step-04에서 `password`(평문)로 시작해,
> step-07에서 `ALTER TABLE`로 이름을 변경합니다.

---

## 향후 확장 — OAuth 추가 시

Google·GitHub 로그인을 추가하면 `accounts` 테이블이 연결됩니다.

```mermaid
erDiagram
    users {
        UUID        id           PK
        VARCHAR255  email        UK
        VARCHAR100  name
        VARCHAR255  password_hash
        TIMESTAMPTZ created_at
    }

    accounts {
        UUID    id             PK
        UUID    user_id        FK
        VARCHAR provider           "google, github 등"
        VARCHAR provider_id        "OAuth 제공자의 사용자 ID"
        TIMESTAMPTZ created_at
    }

    users ||--o{ accounts : "has"
```

`||--o{` : 1명의 users는 여러 accounts를 가질 수 있다 (1:N 관계)
