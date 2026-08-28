# 설계 노트

왜 이렇게 만들었는지, 그리고 건드리기 전에 알아야 할 것들.

## 제약

**세션 쿠키와 도메인.** web과 api가 서로 다른 등록 도메인에 있으면 어드민 세션 쿠키가 서드파티 쿠키가 되어, 브라우저가 이를 차단하면 로그인이 막힌다. 배포에서는 한 도메인 아래로 묶는 것을 권한다.

```
blogyu.dev      → web
api.blogyu.dev  → api
AUTH_COOKIE_DOMAIN=".blogyu.dev"
```

이 값을 설정하면 same-site로 취급되어 `SameSite=Lax`로 동작한다. 비워두면 `SameSite=None`으로 떨어진다.

지금은 둘 다 `*.workers.dev` 아래에 있고 `workers.dev`가 Public Suffix List에 등록돼 있어, 등록 도메인이 `<계정>.workers.dev`로 같다 — 그래서 커스텀 도메인 없이도 쿠키가 막히지 않는다. 커스텀 도메인으로 옮길 때 이 조건이 깨지지 않게 web·api를 같은 도메인 아래 둔다.

**타입 공유 방식.** web은 api의 소스가 아니라 `apps/api/dist/*.d.ts`를 참조한다. 소스를 직접 읽으면 Workers 전역 타입(`Headers`·`ReadableStream`)이 web의 DOM 타입과 충돌한다. 그래서 `pnpm typecheck`는 api 빌드에 의존한다(turbo가 순서를 잡는다).

**Workers 무료 플랜의 한도는 워커 하나당 3MiB(gzip)다.** 지금 web 워커는 약 2.2MiB로, 여유가 800KiB쯤 있다. 무거운 의존성을 새로 넣으면 여기서 먼저 막힌다. 크기는 `pnpm --filter @blogyu/web exec wrangler deploy --dry-run`으로 언제든 잴 수 있다.

특히 **Shiki를 조심한다.** Next의 기본 `serverExternalPackages` 목록에 `shiki`가 들어 있어서, 그대로 두면 번들러가 손대지 못해 언어 문법 261개와 테마 65개가 통째로 딸려온다(그것만으로 한도를 넘긴다). `next.config.ts`의 `transpilePackages: ['shiki']`가 이걸 막고 있고, 실제로 싣는 언어는 `src/lib/markdown.ts`가 정한다. 목록에 없는 언어로 코드펜스를 열면 하이라이팅 없이 평문으로 나온다.

**검색은 ILIKE + pg_trgm으로 한다.** Postgres 전문 검색은 한국어 형태소 분석기가 없어 "커넥션"이 "커넥션을"에 걸리지 않는다. 글이 수천 편을 넘어가면 그때 외부 검색 엔진을 검토한다.

## 구현 메모

- **어드민은 클라이언트에서 API를 직접 호출한다.** 세션 쿠키가 API 도메인에 걸려 있어 Next 서버가 볼 수 없기 때문이다.
- **에디터 미리보기는 서버 액션으로 렌더한다.** Shiki(수 MB)를 클라이언트 번들에 넣지 않으면서 실제 글 화면과 같은 결과를 보장한다.
- **OG 이미지 색은 `src/lib/ogTheme.ts`에 hex로 박혀 있다.** satori가 CSS 변수도 oklch도 해석하지 못한다. 다크 팔레트를 바꾸면 이 파일도 같이 고쳐야 한다.
- **폰트는 self-host.** `next/font/google`은 Turbopack 빌드에서 한글 subset 다운로드가 깨진다.
- **OG 폰트는 읽는 경로가 둘이다**(`src/lib/ogFont.ts`). 배포된 워커에는 파일시스템이 없어 정적 에셋 바인딩으로 읽고, `next build`와 `next dev`는 Node라 `public/`에서 직접 읽는다. 홈 OG 이미지가 빌드 시점에 미리 생성되므로 두 경로가 다 필요하다.
- **마이그레이션은 `pg` 드라이버로 돈다.** drizzle-kit이 `@neondatabase/serverless`를 자동 감지하면 웹소켓으로 붙으려다 로컬에서 실패한다.
- **코드 하이라이팅 테마는 직접 만들었다**(`src/lib/codeTheme.ts`). 기성 테마는 빨강·파랑·보라를 함께 써서 모노크롬 아트디렉션과 충돌한다. 키워드만 액센트로 두고 나머지는 뉴트럴로 간다.

## 설계 문서

화면 구조와 시각 디자인을 먼저 확정하고 구현했다.

- [`wireframes/blog-wireframe.html`](./wireframes/blog-wireframe.html) — 구조 와이어프레임. 방향 A/B/C를 한 파일에서 전환 비교하고 **B(사이드바)로 확정**
- [`design/blogyu-ui.html`](./design/blogyu-ui.html) — UI 시안 7화면, 다크·라이트
- [`design/tokens.css`](./design/tokens.css) — 디자인 토큰. web의 `globals.css`가 이 파일을 기반으로 한다
