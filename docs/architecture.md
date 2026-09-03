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
- **OG 이미지 색은 `src/lib/ogTheme.ts`에 hex로 박혀 있다.** satori가 CSS 변수를 해석하지 못한다. 팔레트를 바꾸면 이 파일도 같이 고쳐야 한다. 글별 OG 이미지는 커버가 없는 글의 카드 이미지로도 쓰인다.
- **폰트는 self-host.** `next/font/google`은 Turbopack 빌드에서 한글 subset 다운로드가 깨진다.
- **OG 폰트는 읽는 경로가 둘이다**(`src/lib/ogFont.ts`). 배포된 워커에는 파일시스템이 없어 정적 에셋 바인딩으로 읽고, `next build`와 `next dev`는 Node라 `public/`에서 직접 읽는다. 홈 OG 이미지가 빌드 시점에 미리 생성되므로 두 경로가 다 필요하다.
- **마이그레이션은 `pg` 드라이버로 돈다.** drizzle-kit이 `@neondatabase/serverless`를 자동 감지하면 웹소켓으로 붙으려다 로컬에서 실패한다.
- **코드 하이라이팅 테마는 직접 만들었다**(`src/lib/codeTheme.ts`). 기성 테마는 빨강·파랑·보라를 함께 써서 "잉크 + 마젠타 한 색" 아트디렉션과 충돌한다. 키워드만 마젠타로 두고 나머지는 검정·회색으로 간다. 사이트가 라이트 전용이라 테마도 한 벌이다.
- **Inter Variable 자리에 Pretendard를 쓴다.** 디자인 시스템은 Inter를 지정하지만 Pretendard의 라틴 글리프가 Inter 기반이라 같은 인상을 내고, 한글까지 덮는다. 폰트 파일을 하나 더 싣지 않아도 된다.

## 검색엔진·AI 크롤러 산출물

전부 `apps/web/src`에 있다. 글 데이터는 하나인데 읽는 쪽이 셋(브라우저·검색엔진·AI 답변엔진)이라 표현이 여럿이다. **한 곳의 출력 형식을 바꾸면 나머지도 같이 본다.**

| 대상 | 산출물 | 위치 |
|---|---|---|
| 검색엔진 | 메타데이터·canonical·OG, JSON-LD(`WebSite`·`BlogPosting`·`CollectionPage`·`BreadcrumbList`) | `lib/seo.ts`, `lib/jsonLd.ts`, 각 `page.tsx` |
| 검색엔진 | `sitemap.xml`, `robots.txt`, `feed.xml` | `app/sitemap.ts`, `app/robots.txt/route.ts`, `app/feed.xml/route.ts` |
| AI 크롤러 | 글 마크다운 원문 `/posts/<slug>/index.md`, 사이트 색인 `llms.txt`, 전문 묶음 `llms-full.txt` | `app/posts/[slug]/index.md/route.ts`, `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts` |
| AI 크롤러 | `Accept: text/markdown` 협상 — 글 주소가 마크다운을 그대로 준다 | `next.config.ts` `rewrites()` |
| 색인 알림 | IndexNow(Bing·Yandex 계열) | `lib/indexNow.ts`, `app/indexnow-key.txt/route.ts` |

**주소는 하나, 표현은 여럿.** 글의 대표 주소는 `/posts/<slug>`뿐이다. `index.md`는 `Link: rel="canonical"` 헤더로, `Accept` 협상은 redirect가 아닌 rewrite로 그 주소를 지킨다. 협상은 `proxy.ts`가 아니라 `next.config.ts`의 헤더 조건부 rewrite다 — Node 런타임 proxy가 있으면 OpenNext가 미들웨어 번들에 Turbopack 런타임과 `@vercel/og`를 끼워 넣어 워커가 gzip 기준 300KiB 넘게 커진다. proxy가 필요해지면 그 비용부터 잰다. 태그·시리즈 주소는 canonical·사이트맵·JSON-LD가 전부 `new URL()` 방식으로 인코딩한다 — `encodeURIComponent`를 섞으면 색인이 갈라진다.

**robots.txt는 라우트 핸들러다.** Next의 `robots.ts`는 `Content-Signal`(크롤러가 가져간 내용을 검색·AI 답변·AI 학습에 써도 되는지 선언, contentsignals.org) 줄을 낼 수 없다. 정책은 `search=yes, ai-input=yes, ai-train=yes`이고, 바꿀 때는 같은 파일의 AI 크롤러 그룹도 같이 맞춘다. Cloudflare 대시보드의 AI 크롤러 차단이 켜져 있으면 여기서 열어도 엣지에서 먼저 막힌다.

**재검증은 경로와 태그를 함께 비운다.** 어드민이 글을 저장하면 API가 `/api/revalidate`에 `paths`(홈·글)와 `tags`를 보낸다. 태그는 `apps/api/src/lib/cacheTags.ts`가 경로에서 만든다 — 목록 태그(`posts`·`tags`·`series`)는 늘, 글 경로가 있으면 `post:<slug>`도. 경로만 비우면 그 페이지 하나만 새로 그려지고, 같은 목록을 읽는 사이트맵·RSS·llms.txt·아카이브는 캐시 주기(최대 1시간)가 끝날 때까지 옛 내용을 낸다. 태그 이름은 web의 `cached([...])` 호출부와 맞춰야 한다. 캐시를 비운 뒤 IndexNow에 같은 경로를 알린다.

**`llms-full.txt`는 최근 10편만 담는다.** Workers 무료 플랜의 요청당 하위 요청 한도(50)에 R2 캐시 읽기·쓰기까지 들기 때문이다. 다건 fetch를 도는 엔드포인트를 더할 때는 이 한도를 먼저 계산한다.

## 설계 문서

화면 구조와 시각 디자인을 먼저 확정하고 구현했다.

**현행 — v2 "Neon zine on white paper"**. 흰 종이 위 검정 잉크에 마젠타 한 색, 상단 내비 + 히어로 + 3열 이미지 카드, radius·그림자 없음, 라이트 전용.

- [`design/DESIGN.md`](./design/DESIGN.md) — 스타일 레퍼런스. 색·타입·간격·컴포넌트·Do/Don't
- [`design/theme.css`](./design/theme.css) · [`design/tokens.json`](./design/tokens.json) — 토큰. web의 `globals.css`가 이 값을 그대로 싣고 시맨틱 별칭(`bg`·`fg`·`border`·`accent`)을 얹는다
- [`wireframes/blog-wireframe.html`](./wireframes/blog-wireframe.html) — v1 때의 구조 와이어프레임(좌측 사이드바 안). 지금 화면과 다르다
