## Step 01 — DBeaver 설치 및 PostgreSQL 연결 `(20분)`

### 이 단계에서 하는 것

PostgreSQL에 접속하기 위한 GUI 클라이언트 DBeaver를 설치하고, 앱 전용 데이터베이스를 생성합니다.
계정은 PostgreSQL 설치 시 만들어지는 기본 관리자 계정 `postgres` 하나만 사용합니다.

---

### 1. GUI 클라이언트가 왜 필요한가

PostgreSQL을 설치하면 `psql`이라는 터미널 도구가 함께 설치됩니다.
`psql`은 강력하지만 **텍스트 명령어만으로** 모든 것을 처리해야 합니다.

```
movie_app=# SELECT * FROM users;
 id | email | name | password
----+-------+------+----------
(0 rows)
```

결과가 텍스트로만 표시되고, 테이블 구조를 보려면 명령어를 외워야 합니다.

**DBeaver는 GUI(그래픽 인터페이스)로 데이터베이스를 관리합니다.**
데이터를 스프레드시트처럼 확인하고, SQL 에디터에서 자동완성을 지원하며,
MySQL·SQLite 등 다양한 DB를 하나의 도구로 연결할 수 있습니다.

| 항목 | psql | DBeaver |
|------|------|---------|
| 인터페이스 | 텍스트 터미널 | GUI |
| 테이블 데이터 확인 | 텍스트 출력 | 스프레드시트 |
| SQL 작성 | 직접 타이핑 | 자동완성 + 에디터 |
| 다중 DB 지원 | PostgreSQL 전용 | MySQL, SQLite 등 |
| 학습 곡선 | 높음 | 낮음 |

이 수업에서는 모든 DB 작업을 DBeaver에서 진행합니다.

---

### 2. DBeaver 다운로드

DBeaver는 **Community Edition(무료)**과 Pro Edition이 있습니다.
이 수업은 Community Edition으로 충분합니다.

**다운로드 주소**: [https://dbeaver.io/download/](https://dbeaver.io/download/)

페이지에서 **Windows (installer)** 를 클릭합니다.
(`.exe` 확장자 파일이 다운로드됩니다.)

---

### 3. 설치

1. 다운로드한 `.exe` 파일을 실행합니다.
2. 설치 언어 선택 → **OK**
3. **Next** → **I Agree** → **Next** → **Next** → **Install**
4. 설치 완료 후 **Finish**

기본 설정 그대로 진행하면 됩니다. 설치 경로를 바꿀 필요가 없습니다.

---

### 4. DBeaver의 구조 이해

DBeaver는 두 단계 구조로 되어 있습니다.

```
DBeaver 왼쪽 패널
└── 데이터베이스 서버  ← PostgreSQL 서버 자체에 대한 연결 (호스트·포트·계정 정보)
    └── Databases      ← 이 서버 안에 있는 데이터베이스 목록
        ├── postgres   ← PostgreSQL 설치 시 자동 생성되는 기본 DB
        └── movie_app  ← 우리가 만들 앱 전용 DB
            └── Schemas
                └── public
                    └── Tables
                        └── users
```

**데이터베이스 서버**는 PostgreSQL 프로세스 자체(호스트 `localhost`, 포트 `5432`)에 대한 연결입니다.
**데이터베이스**는 그 서버 안에서 논리적으로 분리된 저장 공간입니다.
하나의 서버 안에 여러 데이터베이스를 만들 수 있습니다.

---

### 5. 데이터베이스 서버 연결

PostgreSQL의 기본 관리자 계정 `postgres`로 서버에 접속합니다.

1. DBeaver를 실행합니다.
2. 상단 메뉴 → **Database** → **New Database Connection** 클릭
   (또는 왼쪽 상단 플러그 아이콘 클릭)
3. 목록에서 **PostgreSQL** 선택 → **Next**
4. 연결 정보를 입력합니다:

| 항목 | 값 |
|------|----|
| Host | `localhost` |
| Port | `5432` |
| Database | `postgres` |
| Username | `postgres` |
| Password | PostgreSQL 설치 시 설정한 비밀번호 |

5. **Test Connection** 클릭 → `Connected` 메시지가 나오면 정상입니다.
6. **Finish** 클릭

왼쪽 패널에 서버 연결이 추가됩니다.
트리를 펼치면 **Databases** 항목 아래 `postgres` 기본 DB가 보입니다.

> 처음 연결 시 "Driver files are required" 메시지가 나오면 **Download** 를 클릭합니다.
> DBeaver가 자동으로 PostgreSQL JDBC 드라이버를 설치합니다.

---

### 6. 앱 전용 DB 생성

서버 안에 앱 전용 데이터베이스 `movie_app`을 만듭니다.

> **GUI로 만드는 방법 (권장)**
>
> 왼쪽 패널에서 서버 연결을 펼친 뒤 **Databases** 항목에서
> **마우스 우측 버튼** → **Create New Database** 클릭
> → Database name: `movie_app` 입력 → **OK**

또는 SQL Editor에서 직접 실행할 수도 있습니다:

1. 왼쪽 패널에서 서버 연결(`postgres`) 선택
2. 상단 메뉴 → **SQL Editor** → **New SQL Script**
3. 아래 SQL 입력 후 **Ctrl+Enter**

```sql
CREATE DATABASE movie_app;
```

왼쪽 패널에서 **Databases** 우클릭 → **Refresh** 하면
`movie_app`이 목록에 추가된 것을 확인할 수 있습니다.

---

### 7. movie_app DB 전용 연결 추가

이후 모든 작업은 `movie_app` DB에서 진행합니다.
`postgres` 서버 연결과는 별개로, `movie_app`을 기본 DB로 하는 연결을 추가합니다.

> 서버 연결과 DB 연결을 분리해 두면,
> 왼쪽 패널에서 `movie_app` 연결만 선택해도 항상 올바른 DB에서 작업할 수 있습니다.

1. **Database** → **New Database Connection** → **PostgreSQL** → **Next**
2. 아래 정보를 입력합니다:

| 항목 | 값 |
|------|----|
| Host | `localhost` |
| Port | `5432` |
| Database | `movie_app` |
| Username | `postgres` |
| Password | PostgreSQL 설치 시 설정한 비밀번호 |

3. **Test Connection** → **Finish**

왼쪽 패널에 `movie_app` 연결이 추가됩니다.
**이후 모든 SQL은 이 연결(movie_app)에서 실행합니다.**

---

### 이 단계에서 한 것

| 항목 | 완료 |
|------|------|
| DBeaver Community Edition 설치 | ✓ |
| 데이터베이스 서버 구조 이해 | ✓ |
| postgres 계정으로 서버 연결 | ✓ |
| movie_app DB 생성 (GUI 또는 SQL) | ✓ |
| movie_app 전용 연결 추가 | ✓ |
