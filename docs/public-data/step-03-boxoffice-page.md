## Step 03 — /boxoffice 페이지 구현 `(40분)`

### 이 단계에서 하는 것

KOFIC API를 호출하는 서버 함수를 만들고,
`/boxoffice` 경로에 일별 박스오피스 순위 페이지를 추가합니다.
헤더에도 링크를 추가합니다.

완성 화면:

```
┌────────────────────────────────────┐
│  박스오피스 TOP 10 (2024-12-01)     │
├──┬──────────────────┬──────────────┤
│순위│ 영화 제목         │ 관객 수      │
├──┼──────────────────┼──────────────┤
│ 1 │ 베테랑2           │ 150,000 명   │
│ 2 │ 모아나 2          │  98,000 명   │
│  ...                              │
└────────────────────────────────────┘
```

---

### 1. 타입 파일 생성

**`src/types/kofic.ts`** 파일을 새로 만듭니다.

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

export interface KoficResponse {
  boxOfficeResult: {
    boxofficeType: string;
    showRange: string;
    dailyBoxOfficeList: BoxOfficeItem[];
  };
}
```

---

### 2. API 호출 함수 작성

**`src/lib/kofic.ts`** 파일을 새로 만듭니다.

```ts
// src/lib/kofic.ts

import type { BoxOfficeItem, KoficResponse } from "@/types/kofic";

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function fetchDailyBoxOffice(): Promise<{
  date: string;
  list: BoxOfficeItem[];
}> {
  const apiKey = process.env.KOFIC_API_KEY;
  const targetDt = getYesterday();

  const url =
    `http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/` +
    `searchDailyBoxOfficeList.json?key=${apiKey}&targetDt=${targetDt}&itemPerPage=10`;

  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    throw new Error("KOFIC API 요청 실패");
  }

  const data: KoficResponse = await res.json();

  return {
    date: targetDt,
    list: data.boxOfficeResult.dailyBoxOfficeList,
  };
}
```

**포인트 설명:**

| 코드 | 의미 |
|------|------|
| `process.env.KOFIC_API_KEY` | `.env.local`에 저장한 키를 읽습니다 |
| `{ next: { revalidate: 3600 } }` | 1시간(3600초)마다 데이터를 다시 가져옵니다. 박스오피스는 매일 갱신되므로 매 요청마다 호출할 필요가 없습니다 |

---

### 3. 페이지 컴포넌트 작성

**`src/app/boxoffice/page.tsx`** 파일을 새로 만듭니다.

```tsx
// src/app/boxoffice/page.tsx

import { fetchDailyBoxOffice } from "@/lib/kofic";

export default async function BoxOfficePage() {
  const { date, list } = await fetchDailyBoxOffice();

  const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        박스오피스 TOP 10
        <span className="text-base font-normal text-muted-foreground ml-2">
          ({formattedDate})
        </span>
      </h1>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground">
              <th className="text-center p-3 w-12">순위</th>
              <th className="text-left p-3">영화 제목</th>
              <th className="text-right p-3">당일 관객</th>
              <th className="text-right p-3">누적 관객</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr key={item.movieCd} className="border-t hover:bg-muted/50">
                <td className="text-center p-3 font-bold">{item.rank}</td>
                <td className="p-3">
                  <span className="font-medium">{item.movieNm}</span>
                  {item.rankOldAndNew === "NEW" && (
                    <span className="ml-2 text-xs text-red-500 font-bold">NEW</span>
                  )}
                </td>
                <td className="text-right p-3">
                  {Number(item.audiCnt).toLocaleString()} 명
                </td>
                <td className="text-right p-3 text-muted-foreground">
                  {Number(item.audiAcc).toLocaleString()} 명
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        출처: 영화진흥위원회(KOFIC) 영화관입장권통합전산망
      </p>
    </div>
  );
}
```

---

### 4. 헤더에 링크 추가

**`src/components/Header.tsx`** 를 열어 박스오피스 링크를 추가합니다.

현재 헤더:
```tsx
<Link href="/" className="font-bold text-lg">🎬 Movie App</Link>
```

수정 후:
```tsx
<nav className="flex items-center gap-6">
  <Link href="/" className="font-bold text-lg">🎬 Movie App</Link>
  <Link href="/boxoffice" className="text-sm hover:underline">박스오피스</Link>
</nav>
```

`<Link href="/"...>` 와 `<div>` 사이에 위의 `<nav>` 블록으로 교체합니다.
(기존 `<Link>` 태그를 `<nav>` 안으로 옮기고 박스오피스 링크를 나란히 추가)

---

### 5. 동작 확인

1. 개발 서버를 실행합니다.

```bash
npm run dev
```

2. 브라우저에서 `http://localhost:3000/boxoffice` 로 이동합니다.
3. 박스오피스 TOP 10 표가 보이면 성공입니다.
4. 헤더의 **박스오피스** 링크를 클릭해도 이동되는지 확인합니다.

---

### 6. 서버 컴포넌트의 장점

이 페이지는 `'use client'`가 없는 **서버 컴포넌트**입니다.

```
브라우저  →  Next.js 서버  →  KOFIC API
브라우저  ←  완성된 HTML  ←  Next.js 서버
```

- `KOFIC_API_KEY`가 브라우저에 노출되지 않습니다.
- 서버에서 HTML을 완성해 전달하므로 초기 로딩이 빠릅니다.
- `revalidate: 3600`으로 1시간 캐시가 적용되어 KOFIC API 호출 횟수를 줄입니다.

브라우저에서 Network 탭을 열어보면 KOFIC API 요청이 없습니다.
요청은 서버에서만 발생합니다.

---

### 이 단계에서 한 것

| 항목 | 파일 |
|------|------|
| TypeScript 타입 정의 | `src/types/kofic.ts` |
| API 호출 함수 | `src/lib/kofic.ts` |
| 박스오피스 페이지 | `src/app/boxoffice/page.tsx` |
| 헤더 링크 추가 | `src/components/Header.tsx` |
