## Step 02 — KOFIC 박스오피스 API 구조 파악 `(20분)`

### 이 단계에서 하는 것

KOFIC 박스오피스 API의 요청 방법과 응답 구조를 파악하고,
브라우저에서 직접 호출해 실제 데이터를 확인합니다.

---

### 1. API란 무엇인가

TMDB에서 영화 목록을 가져올 때 이미 API를 사용했습니다.

```
브라우저/앱  →  URL로 요청  →  서버
브라우저/앱  ←  JSON 응답  ←  서버
```

KOFIC API도 동일합니다.
특정 URL로 요청하면 서버가 박스오피스 데이터를 JSON으로 반환합니다.

---

### 2. API 엔드포인트

KOFIC 박스오피스 API는 두 가지 엔드포인트를 제공합니다.

| 종류 | 엔드포인트 |
|------|-----------|
| **일별 박스오피스** | `http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json` |
| 주간/주말 박스오피스 | `http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchWeeklyBoxOfficeList.json` |

이 수업에서는 **일별 박스오피스** 엔드포인트를 사용합니다.

---

### 3. 요청 파라미터

URL 끝에 `?파라미터=값&파라미터=값` 형식으로 조건을 전달합니다.

| 파라미터 | 필수 | 설명 | 예시 |
|---------|------|------|------|
| `key` | ✓ | 발급받은 API 키 | `abc123...` |
| `targetDt` | ✓ | 조회할 날짜 (YYYYMMDD) | `20241201` |
| `itemPerPage` | — | 결과 개수 (기본값 10, 최대 10) | `10` |

완성된 요청 URL 예시:

```
http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json
  ?key=발급받은키
  &targetDt=20241201
  &itemPerPage=10
```

> `targetDt`는 어제 날짜를 사용합니다.
> 오늘 날짜는 아직 집계가 완료되지 않을 수 있습니다.

---

### 4. 브라우저에서 직접 호출해보기

1. 아래 URL을 브라우저 주소창에 입력합니다.
   (`.env.local`의 `KOFIC_API_KEY` 값과 어제 날짜로 교체)

```
http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=여기에_API_KEY&targetDt=20241201
```

2. 브라우저에 JSON이 출력되면 정상입니다.

> JSON이 한 줄로 보여 읽기 어렵다면
> Chrome 확장 프로그램 **JSON Viewer** 또는 **JSONVue**를 설치하면 들여쓰기 형태로 볼 수 있습니다.

---

### 5. 응답 구조 분석

성공 응답의 JSON 구조는 다음과 같습니다.

```json
{
  "boxOfficeResult": {
    "boxofficeType": "일별 박스오피스",
    "showRange": "20241201~20241201",
    "dailyBoxOfficeList": [
      {
        "rnum": "1",
        "rank": "1",
        "rankInten": "0",
        "rankOldAndNew": "OLD",
        "movieCd": "20234632",
        "movieNm": "베테랑2",
        "openDt": "2024-09-13",
        "salesAmt": "1234567890",
        "salesShare": "35.5",
        "audiCnt": "150000",
        "audiAcc": "8000000",
        "scrnCnt": "2000",
        "showCnt": "12000"
      },
      ...
    ]
  }
}
```

우리가 화면에 표시할 주요 필드:

| 필드 | 의미 |
|------|------|
| `rank` | 순위 |
| `movieNm` | 영화 제목 |
| `openDt` | 개봉일 |
| `audiCnt` | 당일 관객 수 |
| `audiAcc` | 누적 관객 수 |
| `salesShare` | 매출 점유율(%) |
| `rankOldAndNew` | `NEW`이면 신규 진입, `OLD`이면 기존 유지 |

---

### 6. 어제 날짜를 자동으로 계산하기

매번 날짜를 직접 입력하면 불편합니다.
코드에서 어제 날짜를 자동으로 계산해 API에 전달합니다.

어제 날짜를 `YYYYMMDD` 형식의 문자열로 만드는 방법:

```ts
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const targetDt = yesterday.toISOString().slice(0, 10).replace(/-/g, "");
// 결과 예: "20241201"
```

`toISOString()`은 UTC 기준이므로,
한국 시간(KST, UTC+9) 자정 직후에는 하루 차이가 날 수 있습니다.
수업에서는 이 간단한 방식으로 진행합니다.

---

### 7. TypeScript 타입 정의

API 응답을 TypeScript 타입으로 미리 정의해두면
코드 작성 시 자동완성과 타입 검사를 받을 수 있습니다.

```ts
// src/types/kofic.ts

export interface BoxOfficeItem {
  rnum: string;
  rank: string;
  rankInten: string;
  rankOldAndNew: string;
  movieCd: string;
  movieNm: string;
  openDt: string;
  salesAmt: string;
  salesShare: string;
  audiCnt: string;
  audiAcc: string;
  scrnCnt: string;
  showCnt: string;
}

export interface BoxOfficeResult {
  boxofficeType: string;
  showRange: string;
  dailyBoxOfficeList: BoxOfficeItem[];
}

export interface KoficResponse {
  boxOfficeResult: BoxOfficeResult;
}
```

---

### 이 단계에서 한 것

| 항목 | 완료 |
|------|------|
| API 엔드포인트와 파라미터 이해 | ✓ |
| 브라우저에서 직접 API 호출 | ✓ |
| 응답 JSON 구조 분석 | ✓ |
| 어제 날짜 자동 계산 방법 확인 | ✓ |
| TypeScript 타입 정의 (`src/types/kofic.ts`) | ✓ |
