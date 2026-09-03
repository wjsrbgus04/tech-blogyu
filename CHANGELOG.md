# 변경 이력

## v0.3.0 — 검색엔진·AI 크롤러

검색엔진과 AI 답변엔진이 글을 제대로 읽고, 고친 글이 바로 반영되게 했다. 설계는 `docs/architecture.md`의 "검색엔진·AI 크롤러 산출물" 절.

### 들어간 것

- 글 메타데이터·canonical·OG·JSON-LD(`WebSite`·`BlogPosting`·`CollectionPage`·`BreadcrumbList`) 정비. `BlogPosting`에 읽는 시간(`timeRequired`)과 시리즈(`articleSection`) 추가
- 글 마크다운 원문 `/posts/<slug>/index.md`, `llms.txt`, `llms-full.txt`. 글 페이지가 `<link rel="alternate" type="text/markdown">`으로 원문을 가리킨다
- `Accept: text/markdown` 협상 — AI 에이전트가 글 주소를 그대로 요청해도 마크다운을 받는다(`next.config.ts` rewrite)
- `robots.txt`에 Content-Signal 선언(`search=yes, ai-input=yes, ai-train=yes`)과 AI 크롤러 그룹. `/api` 도 색인 제외
- 루트 robots 메타 `max-image-preview:large`·`max-snippet:-1`·`max-video-preview:-1` — Discover·리치 결과의 전제
- IndexNow 색인 알림 (`INDEXNOW_KEY` 시크릿)
- RSS에 `lastBuildDate`와 글별 `<category>`(태그)

### 고친 것

- 재검증 웹훅이 경로만 보내 사이트맵·RSS·llms.txt·아카이브가 최대 1시간 옛 내용을 내던 것 — API가 캐시 태그도 함께 보내고, web은 글 경로의 `index.md`까지 비운다
- 사이트맵의 시리즈 주소 인코딩을 태그·canonical과 같은 방식으로 통일
- RSS 제목·설명이 사이트 상수와 어긋나 있던 것

## v0.2.0 — 디자인 시스템 v2

화면을 `docs/design`("Neon zine on white paper")로 옮겼다. 흰 종이, 검정 잉크, 마젠타 한 색.

### 바뀐 것

- 좌측 사이드바를 걷어내고 상단 헤더(로고 락업 · 태그·시리즈 내비 · 검색)로 바꿈. 컨테이너 1200px
- 홈을 히어로(첫 글, 16:7 이미지 + 40px 제목) + 3열 이미지 카드 그리드로 재구성. 커버가 없는 글은 글별 OG 이미지를 카드 이미지로 씀
- 태그·시리즈·검색 결과도 같은 카드 그리드
- 글 상세: 40px 제목, 요일까지 붙는 날짜, 검정 글자 + 2px 마젠타 밑줄 링크, 목차는 오른쪽 레일
- 그림자·radius·배경 텍스처·태그 pill 제거. 유일한 경계선은 푸터 위 hairline
- 다크 모드 제거 — 테마 토글, 초기화 스크립트, Giscus 테마 연동, 코드 테마 다크 벌
- 코드 하이라이팅 키워드를 마젠타로, OG 이미지를 흰 배경으로
- 어드민은 토큰 재매핑만 받고 마젠타 채움 버튼을 잉크 채움으로

### 들어간 것

- 어드민 시리즈 관리 — `/admin/series` 화면과 `POST·PATCH·DELETE /admin/series` API. 지금까지는 편집기에서 고르기만 가능했다
- 편집기 커버 이미지에 외부 주소 붙여넣기. 업로드 없이도 커버를 지정할 수 있다
- 검색 응답에 `coverImageUrl` 포함 — 검색 결과 카드도 커버를 쓴다

## v0.1.0 — 초기 구축

기술 블로그를 처음부터 만들었다. 설계부터 배포 준비까지 한 사이클.

### 구조

| 영역 | 스택 | 배포처 |
|---|---|---|
| 프론트엔드 | Next.js 16 App Router, Tailwind v4 | Vercel Hobby |
| 백엔드 | Hono, Drizzle | Cloudflare Workers |
| DB | Postgres | Neon Free |
| 이미지 | R2 | Cloudflare Free |
| 댓글 | Giscus | GitHub Discussions |

전부 무료 티어에서 굴러간다. 프론트엔드는 백엔드 라우터 타입을 그대로 받아 응답 타입을 추론한다.

### 들어간 것

- 와이어프레임 세 방향 비교와 UI 시안 (다크·라이트)
- 글·태그·시리즈·검색 API와 다섯 테이블 스키마
- 홈·글 상세·태그·시리즈·검색 화면
- sitemap·robots·RSS·글별 OG 이미지 자동 생성
- GitHub OAuth 로그인, 글 관리, 마크다운 편집기
- 발행 시 ISR 재검증 웹훅
- CI와 Workers 자동 배포

### 남은 것

- 시리즈 생성·편집 화면 (지금은 편집기에서 고르기만 가능)
- Giscus 발급값 입력 (없으면 댓글 자리에 안내만 표시)
- 커스텀 도메인 연결 (세션 쿠키가 서드파티가 되는 문제를 피하려면 필요)
