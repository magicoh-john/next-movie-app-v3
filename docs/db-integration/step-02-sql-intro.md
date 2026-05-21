## Step 02 — SQL 기초: DDL과 DML `(20분)`

### 이 단계에서 하는 것

SQL의 두 가지 핵심 분류인 DDL과 DML을 이해하고,
DBeaver에서 직접 실습합니다.

---

### 1. SQL이란

**SQL(Structured Query Language)** 은 데이터베이스와 대화하는 언어입니다.

JavaScript가 브라우저·서버와 대화하는 언어라면,
SQL은 데이터베이스와 대화하는 언어입니다.

```
우리 앱          ──SQL──▶    PostgreSQL
(Next.js)                  (데이터 저장소)
```

SQL은 목적에 따라 크게 두 가지로 나뉩니다.

| 분류 | 이름 | 역할 | 대표 명령 |
|------|------|------|-----------|
| **DDL** | Data Definition Language | 테이블 **구조** 정의 | `CREATE`, `DROP`, `ALTER` |
| **DML** | Data Manipulation Language | 테이블 **데이터** 조작 | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

비유하자면:
- **DDL** = 엑셀에서 새 시트를 만들거나 열 제목을 추가하는 것
- **DML** = 그 시트에 데이터를 입력하거나 수정하는 것

---

### 2. DDL — 테이블 구조 정의

#### CREATE TABLE — 테이블 만들기

```sql
CREATE TABLE products (
    id      SERIAL      PRIMARY KEY,
    name    VARCHAR(100) NOT NULL,
    price   INTEGER     NOT NULL,
    stock   INTEGER     DEFAULT 0
);
```

각 항목의 의미:

| 항목 | 의미 |
|------|------|
| `SERIAL` | 자동 증가 숫자 (1, 2, 3, ...) |
| `VARCHAR(100)` | 최대 100자 문자열 |
| `INTEGER` | 정수 |
| `PRIMARY KEY` | 각 행을 구별하는 고유 식별자 |
| `NOT NULL` | 반드시 값이 있어야 함 |
| `DEFAULT 0` | 값을 넣지 않으면 0으로 자동 설정 |

#### ALTER TABLE — 테이블 구조 변경

```sql
-- 컬럼 추가
ALTER TABLE products ADD COLUMN description TEXT;

-- 컬럼 이름 변경
ALTER TABLE products RENAME COLUMN stock TO inventory;

-- 컬럼 삭제
ALTER TABLE products DROP COLUMN description;
```

> 이미 데이터가 있는 테이블의 구조를 바꿀 때 사용합니다.
> 나중에 `password` 컬럼을 `password_hash`로 이름을 바꿀 때 이 명령을 씁니다.

#### DROP TABLE — 테이블 삭제

```sql
DROP TABLE products;

-- 존재할 때만 삭제 (없어도 오류 없음)
DROP TABLE IF EXISTS products;
```

> ⚠️ `DROP TABLE`은 데이터까지 모두 삭제합니다. 되돌릴 수 없습니다.

---

### 3. DML — 데이터 조작

#### SELECT — 데이터 조회

```sql
-- 전체 조회
SELECT * FROM products;

-- 특정 컬럼만
SELECT name, price FROM products;

-- 조건 지정
SELECT * FROM products WHERE price > 10000;

-- 정렬
SELECT * FROM products ORDER BY price DESC;
```

#### INSERT — 데이터 추가

```sql
-- 단건 삽입
INSERT INTO products (name, price, stock)
VALUES ('노트북', 1500000, 10);

-- 여러 건 삽입
INSERT INTO products (name, price)
VALUES
    ('마우스', 30000),
    ('키보드', 80000);
```

#### UPDATE — 데이터 수정

```sql
-- 특정 행만 수정
UPDATE products
SET price = 1400000
WHERE id = 1;
```

> ⚠️ `WHERE` 없이 `UPDATE`하면 **전체 행**이 수정됩니다.

#### DELETE — 데이터 삭제

```sql
-- 특정 행 삭제
DELETE FROM products WHERE id = 1;

-- 전체 삭제 (테이블 구조는 유지)
DELETE FROM products;
```

> ⚠️ `WHERE` 없이 `DELETE`하면 **전체 데이터**가 삭제됩니다.

---

### 4. SQL 실습 — DBeaver에서 직접 해보기

`movie_app` 연결에서 SQL Editor를 열고 아래 순서대로 실행해봅니다.

**① 연습용 테이블 생성 (DDL)**

```sql
CREATE TABLE test_items (
    id      SERIAL       PRIMARY KEY,
    title   VARCHAR(100) NOT NULL,
    score   INTEGER      DEFAULT 0
);
```

**② 데이터 추가 (DML - INSERT)**

```sql
INSERT INTO test_items (title, score)
VALUES
    ('첫 번째 항목', 85),
    ('두 번째 항목', 92),
    ('세 번째 항목', 78);
```

**③ 데이터 조회 (DML - SELECT)**

```sql
SELECT * FROM test_items;
```

DBeaver 하단에 결과가 표로 표시됩니다.

**④ 데이터 수정 (DML - UPDATE)**

```sql
UPDATE test_items SET score = 100 WHERE id = 1;
```

다시 SELECT로 확인해봅니다.

**⑤ 연습 테이블 삭제 (DDL)**

```sql
DROP TABLE test_items;
```

---

### 5. SQL에서 반드시 알아야 할 규칙

**플레이스홀더로 SQL Injection 방지**

애플리케이션에서 SQL을 실행할 때는 사용자 입력을 직접 문자열로 연결하면 안 됩니다.

```ts
// ❌ 위험한 방법 — SQL Injection 취약점
const sql = `SELECT * FROM users WHERE email = '${email}'`

// ✅ 안전한 방법 — 플레이스홀더 사용
pool.query('SELECT * FROM users WHERE email = $1', [email])
```

`$1`이 플레이스홀더입니다. `pg` 라이브러리가 입력값을 안전하게 처리합니다.
나중에 앱에서 DB를 연결할 때 이 방식을 항상 사용합니다.

---

### 이 단계에서 배운 것

| 분류 | 명령 | 역할 |
|------|------|------|
| DDL | `CREATE TABLE` | 테이블 생성 |
| DDL | `ALTER TABLE` | 테이블 구조 변경 |
| DDL | `DROP TABLE` | 테이블 삭제 |
| DML | `SELECT` | 데이터 조회 |
| DML | `INSERT` | 데이터 추가 |
| DML | `UPDATE` | 데이터 수정 |
| DML | `DELETE` | 데이터 삭제 |
