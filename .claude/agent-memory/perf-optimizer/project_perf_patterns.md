---
name: project-perf-patterns
description: fruit-shop 프로젝트에서 확인된 성능 패턴 및 완료된 최적화 목록
metadata:
  type: project
---

2026-05-18 기준 완료된 최적화 작업.

**Why:** 반복 dispatch, 배열 전체 구독, 상수 중복 선언 등 초기 구현 시 발생한 전형적인 성능 부채를 일괄 정리.

**How to apply:** 이후 신규 컴포넌트 작성 시 아래 패턴을 기본으로 사용할 것.

## 완료된 최적화

1. FRUIT_STYLE 상수 → `src/constants/fruitStyle.js` 단일 파일로 통합 (4개 파일 중복 제거)
2. cartSlice: localStorage 영속화 (loadCartFromStorage + store.subscribe)
3. cartSlice: addToCart가 `quantity` payload를 받아 단일 dispatch로 누적
4. Detail.jsx: for 루프 dispatch 제거 → `dispatch(addToCart({ ...fruit, quantity }))` 단일 호출
5. Header.jsx: cartItems 배열 → totalCount(number) 구독으로 변경
6. Header.jsx: wishlistItems 배열 → wishlistCount(number) 구독으로 변경
7. Header.jsx: 검색 입력 200ms 디바운스 (로컬 inputValue state + useEffect)
8. ProductCard.jsx: wishlistItems 배열 → `items.some(i => i.id === id)` boolean 구독
9. Detail.jsx: wishlistItems 배열 → boolean 구독
10. Home.jsx: byCategory + filtered 계산을 useMemo로 감싸기 (deps: fruits, activeCategory, searchQuery)
11. authSlice / productSlice / wishlistSlice: 모듈 최상단 JSON.parse → safeRead(key, fallback) 패턴

## 핵심 패턴

- selector는 배열 전체가 아닌 파생된 원시값(number, boolean)으로 범위 최소화
- localStorage 읽기는 항상 try/catch로 보호 (safeRead 헬퍼 함수 사용)
- cart localStorage 동기화는 store.subscribe() 단일 지점에서 관리
- 여러 컴포넌트가 공유하는 상수는 src/constants/ 아래 별도 파일로 추출
