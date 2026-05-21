---
name: project-ux-patterns
description: 과일 쇼핑몰 프로젝트의 UX 패턴, 구현 결정, 컴포넌트 구조에 관한 핵심 사항
metadata:
  type: project
---

## Toast 알림 시스템 (2026-05-18 구현)

**구조**: React Context + useState 기반 (Redux 미사용)
- `src/hooks/useToast.js` — ToastContext 정의, useToastState(상태 관리), useToast(소비 hook)
- `src/components/Toast.jsx` — 우측 하단 fixed 위치, 2초 자동 소멸, success/error/info 타입
- `src/components/ToastProvider.jsx` — Context Provider + Toast 마운트 통합

**마운트 위치**: `App.jsx`의 Layout 컴포넌트에서 ToastProvider로 감싸기
- Layout은 헤더가 있는 모든 내부 페이지에 적용됨 (/login, /signup은 Layout 외부라 Toast 미포함)

**애니메이션**: `src/index.css`에 `@keyframes fade-in-up` 커스텀 정의 후 `.animate-fade-in-up` 클래스 사용
- TailwindCSS v4 @theme 블록 아래에 추가함

**토스트 호출 위치**:
- Detail.jsx: 장바구니 담기 성공 → 'success' 타입
- ProductCard.jsx: 위시리스트 토글 → 'info' 타입 (dispatch 전 isWished 값으로 추가/제거 판별)

## Cart.jsx UX 결정

- `handleIncrease`: `item.stock != null && item.quantity >= item.stock` 조건으로 재고 한도 막기
  - stock은 cartSlice의 addToCart에서 `...product` spread 시 자동 포함됨
- 주문하기 alert(): `useState('')`로 `orderMessage` 관리 → 버튼 아래 인라인 텍스트로 교체

## Login.jsx UX 결정

- `<a href="/signup">` → `<Link to="/signup">` 교체 (react-router-dom import 추가)
- 비밀번호 찾기: disabled 대신 클릭 시 `forgotMessage` state 토글로 "서비스 준비 중" 안내
- 소셜 로그인 버튼: `disabled` + `opacity-50 cursor-not-allowed` + 하단 안내 문구 추가
- autoComplete: email → `"email"`, password → `"current-password"`

## Signup.jsx autoComplete

- 이름 → `"name"`, 이메일 → `"email"`, 비밀번호 → `"new-password"`
- confirmPassword 필드에는 autoComplete 미추가 (브라우저가 별도 처리)

## Home.jsx 빈 상태 메시지 분기

- searchQuery.trim() !== '' → `"'{searchQuery}'에 대한 검색 결과가 없습니다."`
- searchQuery 없고 카테고리 결과 0개 → `"'{activeCategory}' 카테고리에 상품이 없습니다."`

## App.jsx ScrollRestoration

- `ScrollRestoration` (react-router-dom)을 Layout 내 첫 자식으로 추가
- createBrowserRouter(Data API) 방식에서만 작동함 — 이 프로젝트는 이미 해당 방식 사용 중
