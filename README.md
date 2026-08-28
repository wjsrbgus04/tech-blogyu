# blogyu

기술 블로그. pnpm workspace 모노레포이며 전부 무료 티어로 배포한다.

| | 스택 | 배포처 |
|---|---|---|
| `apps/web` | Next.js 16 (App Router, ISR) + Tailwind v4 | Cloudflare Workers (OpenNext) |
| `apps/api` | Hono + Drizzle | Cloudflare Workers |
| DB | Neon Postgres (HTTP 드라이버) | Neon Free |
| 이미지 | Cloudflare R2 | R2 Free |
| 댓글 | Giscus (GitHub Discussions) | — |

프론트엔드는 `apps/api`의 라우터 타입을 그대로 import 해 응답 타입을 추론한다(Hono RPC). API 라우트를 고치면 web 쪽에서 타입 에러가 난다.

## 설계 문서

- `docs/wireframes/blog-wireframe.html` — 구조 와이어프레임 (방향 A/B/C 비교, **B 사이드바 확정**)
- `docs/design/blogyu-ui.html` — UI 시안 7화면, 다크/라이트
- `docs/design/tokens.css` — 디자인 토큰 (web의 `globals.css`가 이 파일을 기반으로 한다)

## 시작하기

### 1. 사전 준비

**DB는 두 가지 방법 중 하나를 고른다.**

| | 로컬 Docker | Neon |
|---|---|---|
| 준비 | `pnpm db:up` 한 줄 | 계정 가입 후 연결 문자열 복사 |
| 쓰임 | 개발·검증 | 배포 |

**로컬 Docker (계정 불필요)** — Postgres와 HTTP 프록시를 함께 띄운다. Neon 드라이버는 와이어 프로토콜이 아니라 HTTP로 말하기 때문에 프록시가 그 사이를 번역한다. 덕분에 앱 코드는 배포와 똑같이 둘 수 있다.

```bash
pnpm db:up      # postgres + neon-proxy 기동
pnpm db:down    # 내리기 (데이터 유지)
pnpm db:reset   # 볼륨까지 삭제
```

`.env`에는 `postgres://postgres:postgres@localhost:5432/blogyu`, `apps/api/.dev.vars`에는 프록시를 거치도록 `@db.localtest.me:5432`를 넣는다.

**Neon** — [neon.tech](https://neon.tech)에서 프로젝트를 만들고 *Pooled connection* 문자열을 복사한다.

**GitHub OAuth App** — Settings → Developer settings → OAuth Apps → New.
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:8787/auth/github/callback`

**Giscus** — [giscus.app](https://giscus.app)에서 리포지토리를 연결하고 Discussions를 켠 뒤 발급값을 받는다. (나중에 해도 된다 — 없으면 댓글 자리에 안내만 뜬다)

### 2. 환경 변수

```bash
cp .env.example .env                              # drizzle-kit 이 읽는다
cp apps/api/.dev.vars.example apps/api/.dev.vars  # api 의 wrangler dev 가 읽는다
cp apps/web/.dev.vars.example apps/web/.dev.vars  # web 의 로컬 preview 가 읽는다
cp apps/web/.env.local.example apps/web/.env.local

# 시크릿 두 개 생성
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # REVALIDATE_SECRET (api·web 양쪽에 같은 값)
```

`.env`, `.dev.vars`, `.env.local`은 `.gitignore`에 있다. 절대 커밋하지 않는다.

**web의 환경 파일이 네 개인 이유.** Next는 `.env.local`을 개발·배포 양쪽에서 읽고, 우선순위도 환경별 파일보다 높다. 그래서 URL을 `.env.local`에 두면 배포 빌드에까지 localhost가 박혀 나간다. 공개 설정과 시크릿을 갈라 둔다.

| 파일 | 커밋 | 담는 것 |
|---|---|---|
| `.env.development` | ✓ | 로컬용 URL·giscus |
| `.env.production` | ✓ | 배포용 URL·giscus |
| `.env.local` | ✗ | `REVALIDATE_SECRET` 만 |
| `.dev.vars` | ✗ | 로컬 preview 용 `REVALIDATE_SECRET` |

### 3. DB 스키마 적용

```bash
pnpm db:migrate   # 스키마 생성
pnpm db:seed      # 샘플 글 6편 (로컬 DB 에서만 동작한다)
```

`0001_search_index.sql`이 `pg_trgm` 확장을 켜고 검색용 GIN 인덱스를 만든다.

빈 화면으로는 목록 간격도 코드 블록도 확인할 수 없으므로, 개발을 시작할 때는 시드를 넣는 편이 낫다.

### 4. 개발 서버

```bash
pnpm install
pnpm dev        # web :3000, api :8787 동시 실행
```

R2는 로컬에서 wrangler가 자동으로 흉내 낸다 — 별도 준비가 필요 없다.

배포와 같은 런타임(workerd)에서 web을 확인하려면:

```bash
pnpm --filter @blogyu/web run preview   # :8788 에 워커로 web 을 띄운다
```

`next dev`와 달리 R2 캐시·Durable Object 큐·정적 에셋 바인딩까지 전부 로컬로 흉내 내므로, ISR과 OG 이미지가 배포에서 실제로 동작할지 여기서 먼저 걸러진다.

다만 `preview`는 `.env.production`으로 빌드해서 **배포된 API**를 부른다. 로컬 API를 보게 하려면 값을 덮어쓴다.

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787 NEXT_PUBLIC_SITE_URL=http://localhost:8788 \
  pnpm --filter @blogyu/web run preview
```

## 명령어

```bash
pnpm dev          # 전체 개발 서버
pnpm build        # 전체 빌드
pnpm typecheck    # 타입 검사
pnpm lint         # Biome 검사
pnpm lint:fix     # 자동 수정
pnpm format       # 포맷만
pnpm test         # 테스트

pnpm db:generate  # 스키마 변경 → 마이그레이션 SQL 생성
pnpm db:migrate   # 마이그레이션 적용
pnpm db:studio    # Drizzle Studio
```

## 알아둘 것

**세션 쿠키와 도메인.** web과 api가 서로 다른 등록 도메인에 있으면 어드민 세션 쿠키가 서드파티 쿠키가 되어, 브라우저가 이를 차단하면 로그인이 막힌다. 배포에서는 한 도메인 아래로 묶는 것을 권한다.

```
blogyu.dev      → web
api.blogyu.dev  → api
AUTH_COOKIE_DOMAIN=".blogyu.dev"
```

이 값을 설정하면 same-site로 취급되어 `SameSite=Lax`로 동작한다. 비워두면 `SameSite=None`으로 떨어진다.

**타입 공유 방식.** web은 api의 소스가 아니라 `apps/api/dist/*.d.ts`를 참조한다. 소스를 직접 읽으면 Workers 전역 타입(`Headers`·`ReadableStream`)이 web의 DOM 타입과 충돌한다. 그래서 `pnpm typecheck`는 api 빌드에 의존한다(turbo가 순서를 잡는다).

**Workers 무료 플랜의 한도는 워커 하나당 3MiB(gzip)다.** 지금 web 워커는 약 2.2MiB로, 여유가 800KiB쯤 있다. 무거운 의존성을 새로 넣으면 여기서 먼저 막힌다. 크기는 `pnpm --filter @blogyu/web exec wrangler deploy --dry-run`으로 언제든 잴 수 있다.

특히 **Shiki를 조심한다.** Next의 기본 `serverExternalPackages` 목록에 `shiki`가 들어 있어서, 그대로 두면 번들러가 손대지 못해 언어 문법 261개와 테마 65개가 통째로 딸려온다(그것만으로 한도를 넘긴다). `next.config.ts`의 `transpilePackages: ['shiki']`가 이걸 막고 있고, 실제로 싣는 언어는 `src/lib/markdown.ts`가 정한다. 목록에 없는 언어로 코드펜스를 열면 하이라이팅 없이 평문으로 나온다.

**검색은 ILIKE + pg_trgm으로 한다.** Postgres 전문 검색은 한국어 형태소 분석기가 없어 "커넥션"이 "커넥션을"에 걸리지 않는다. 글이 수천 편을 넘어가면 그때 외부 검색 엔진을 검토한다.

## 배포

### 배포 전 점검

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

**도메인 값 네 개가 서로를 가리킨다.** 커스텀 도메인을 붙이거나 계정을 옮기면 네 개를 같이 고쳐야 한다. 하나만 바꾸면 CORS나 재검증이 조용히 깨진다.

`apps/api/wrangler.jsonc`의 `vars`:

| 키 | 무엇에 쓰이나 |
|---|---|
| `SITE_URL` | CORS 허용 오리진, OAuth 리다이렉트, 쿠키 Secure 판정, ISR 재검증 웹훅 |
| `MEDIA_BASE_URL` | 업로드된 이미지 URL 앞부분 |

`apps/web/.env.production`:

| 키 | 무엇에 쓰이나 |
|---|---|
| `NEXT_PUBLIC_API_URL` | 브라우저·서버 양쪽에서 API를 부르는 주소 |
| `NEXT_PUBLIC_SITE_URL` | 사이트맵·RSS·OG 링크의 절대 주소 |

워커 주소는 `<워커이름>.<계정 서브도메인>.workers.dev` 꼴이다. 서브도메인은 `wrangler whoami` 로 계정을 확인한 뒤 대시보드에서 볼 수 있다.

주의할 점이 둘 있다.

- **api 쪽 `vars`는 배포 기준이다.** 로컬에서는 `.dev.vars`가 같은 이름의 값을 덮어쓰므로 개발에는 영향이 없다. 반대로 두면(`vars`에 localhost) 배포 순간 CORS 거부·로그인 실패·재검증 실패가 한꺼번에 터진다.
- **`NEXT_PUBLIC_*`는 빌드 시점에 코드로 박힌다.** `wrangler secret`이나 `vars`로는 못 바꾼다. 값을 고치면 반드시 다시 배포해야 한다.

### 처음 한 번

**Neon** — 프로젝트를 만들고 pooled connection 문자열을 받는다. 스키마는 로컬에서 올린다.

```bash
DATABASE_URL="<Neon 문자열>" pnpm db:migrate
```

**Cloudflare 대시보드에서 먼저 두 가지를 켠다.** CLI로는 안 되고, 새 계정이면 둘 다 안 되어 있다.

1. **Workers & Pages 페이지를 한 번 연다** → `<계정>.workers.dev` 서브도메인이 이때 자동 생성된다. 이게 없으면 배포해도 접근할 주소가 없다.
2. **R2를 활성화한다** → 결제수단 등록을 요구한다. 무료 한도(10GB 저장, 쓰기 100만, 읽기 1000만) 안에서는 청구되지 않지만 카드나 PayPal은 걸어야 한다. 이미지 업로드가 R2에 얹혀 있어 피할 수 없다.

둘 다 끝나면 CLI로 넘어간다. API 토큰은 *Edit Cloudflare Workers* 템플릿으로 발급한다.

```bash
pnpm --filter @blogyu/api exec wrangler login

# api 이미지 저장소
pnpm --filter @blogyu/api exec wrangler r2 bucket create blogyu-media
# web ISR 캐시 저장소 (wrangler.jsonc 의 bucket_name 과 같아야 한다)
pnpm --filter @blogyu/web exec wrangler r2 bucket create blogyu-web-cache
```

재검증 큐와 태그 캐시는 Durable Object라 따로 만들 필요가 없다 — `apps/web/wrangler.jsonc`의 `migrations`가 첫 배포에서 생성한다.

서브도메인이 생겼는지는 이렇게 확인한다.

```bash
pnpm --filter @blogyu/api exec wrangler whoami   # Account ID 확인
# 없으면 code 10007 과 함께 대시보드로 가라는 안내가 나온다
```

**api 배포**

```bash
cd apps/api
pnpm wrangler secret put DATABASE_URL
pnpm wrangler secret put GITHUB_CLIENT_ID
pnpm wrangler secret put GITHUB_CLIENT_SECRET
pnpm wrangler secret put AUTH_SECRET
pnpm wrangler secret put REVALIDATE_SECRET
pnpm run deploy
```

**web 배포**

```bash
cd apps/web
pnpm wrangler secret put REVALIDATE_SECRET   # api 와 같은 값
pnpm run deploy
```

두 경우 다 `pnpm deploy`가 아니라 **`pnpm run deploy`**로 부른다. `deploy`는 pnpm 내장 명령과 이름이 겹쳐서 인자가 엉뚱하게 붙는다.

`pnpm run deploy`는 web에서 세 가지를 순서대로 한다 — `next build` → 워커 번들 생성 → R2에 프리렌더 캐시 업로드 후 `wrangler deploy`. 로컬에서 워커 런타임으로 먼저 확인하려면 `pnpm --filter @blogyu/web run preview`를 쓴다(진짜 workerd에서 돌고 R2·DO도 로컬로 흉내 낸다).

**GitHub Actions** — 리포지토리 Secrets에 두 개를 넣으면 api·web 모두 자동 배포된다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**GitHub OAuth App** — callback URL을 배포된 API 주소로 바꾼다: `https://<api-도메인>/auth/github/callback`

### 배포 직후 확인

도메인이 얽힌 것부터 깨진다. 순서대로 본다.

```bash
API=https://<api-도메인>
SITE=https://<web-도메인>

curl -s $API/health                                    # {"ok":true}
curl -s "$API/posts?limit=1" | head -c 200             # 글이 나오는지
curl -si -X OPTIONS $API/posts -H "Origin: $SITE" \
  -H "Access-Control-Request-Method: GET" | grep -i allow-origin   # SITE 와 같아야 한다
curl -s -o /dev/null -w '%{http_code}\n' $SITE/       # 200
curl -s $SITE/sitemap.xml | head -c 200                # 링크가 SITE 도메인인지
curl -si $SITE/posts/<슬러그> | grep -i x-nextjs-cache  # HIT 이면 ISR 캐시가 붙었다
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' $SITE/opengraph-image  # 200 image/png
```

브라우저로는 이 셋을 본다.

- `$SITE/admin` → GitHub 로그인 → 어드민 목록이 뜨는지 (세션 쿠키가 막히면 여기서 걸린다)
- 글 하나를 저장 → 목록에 바로 반영되는지 (안 되면 `REVALIDATE_SECRET`이 web·api 양쪽에서 다르거나, web 워커에 시크릿을 안 넣은 것이다)
- 글 화면의 코드 블록에 색이 들어가는지 (안 들어가면 그 언어가 `markdown.ts`의 목록에 없는 것이다)

### 이후

- `apps/web` 변경 → GitHub Actions가 자동 배포
- `apps/api` 변경 → GitHub Actions가 자동 배포 (web도 타입을 공유하므로 함께 다시 배포된다)
- **스키마 변경 → `pnpm db:migrate`를 로컬에서 먼저 돌리고 푸시한다.** 롤백 전략이 없는 상태에서 CI가 마이그레이션을 자동 적용하면 실패했을 때 되돌릴 방법이 없다.

## 구현 메모

- **어드민은 클라이언트에서 API를 직접 호출한다.** 세션 쿠키가 API 도메인에 걸려 있어 Next 서버가 볼 수 없기 때문이다.
- **에디터 미리보기는 서버 액션으로 렌더한다.** Shiki(수 MB)를 클라이언트 번들에 넣지 않으면서 실제 글 화면과 같은 결과를 보장한다.
- **OG 이미지 색은 `src/lib/ogTheme.ts`에 hex로 박혀 있다.** satori가 CSS 변수도 oklch도 해석하지 못한다. 다크 팔레트를 바꾸면 이 파일도 같이 고쳐야 한다.
- **폰트는 self-host.** `next/font/google`은 Turbopack 빌드에서 한글 subset 다운로드가 깨진다.
- **OG 폰트는 읽는 경로가 둘이다**(`src/lib/ogFont.ts`). 배포된 워커에는 파일시스템이 없어 정적 에셋 바인딩으로 읽고, `next build`와 `next dev`는 Node라 `public/`에서 직접 읽는다. 홈 OG 이미지가 빌드 시점에 미리 생성되므로 두 경로가 다 필요하다.
- **마이그레이션은 `pg` 드라이버로 돈다.** drizzle-kit이 `@neondatabase/serverless`를 자동 감지하면 웹소켓으로 붙으려다 로컬에서 실패한다.
- **코드 하이라이팅 테마는 직접 만들었다**(`src/lib/codeTheme.ts`). 기성 테마는 빨강·파랑·보라를 함께 써서 모노크롬 아트디렉션과 충돌한다. 키워드만 액센트로 두고 나머지는 뉴트럴로 간다.
