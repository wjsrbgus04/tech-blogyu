# 변경 이력

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
