# blogyu

기술 블로그. pnpm workspace 모노레포이며 전부 무료 티어로 배포한다.

| | 스택 | 배포처 |
|---|---|---|
| `apps/web` | Next.js 16 (App Router, ISR) + Tailwind v4 | Vercel Hobby |
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
cp apps/api/.dev.vars.example apps/api/.dev.vars  # wrangler dev 가 읽는다
cp apps/web/.env.local.example apps/web/.env.local

# 시크릿 두 개 생성
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # REVALIDATE_SECRET (api·web 양쪽에 같은 값)
```

`.env`, `.dev.vars`, `.env.local`은 `.gitignore`에 있다. 절대 커밋하지 않는다.

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

**세션 쿠키와 도메인.** web(Vercel)과 api(Workers)가 서로 다른 등록 도메인에 있으면 어드민 세션 쿠키가 서드파티 쿠키가 되어, 브라우저가 이를 차단하면 로그인이 막힌다. 배포에서는 한 도메인 아래로 묶는 것을 권한다.

```
blogyu.dev      → web
api.blogyu.dev  → api
AUTH_COOKIE_DOMAIN=".blogyu.dev"
```

이 값을 설정하면 same-site로 취급되어 `SameSite=Lax`로 동작한다. 비워두면 `SameSite=None`으로 떨어진다.

**타입 공유 방식.** web은 api의 소스가 아니라 `apps/api/dist/*.d.ts`를 참조한다. 소스를 직접 읽으면 Workers 전역 타입(`Headers`·`ReadableStream`)이 web의 DOM 타입과 충돌한다. 그래서 `pnpm typecheck`는 api 빌드에 의존한다(turbo가 순서를 잡는다).

**Vercel Hobby는 상업적 이용을 금지한다.** 광고나 수익화를 붙일 계획이면 Pro로 올리거나 다른 곳에 배포해야 한다.

**검색은 ILIKE + pg_trgm으로 한다.** Postgres 전문 검색은 한국어 형태소 분석기가 없어 "커넥션"이 "커넥션을"에 걸리지 않는다. 글이 수천 편을 넘어가면 그때 외부 검색 엔진을 검토한다.

## 배포

### 처음 한 번

**Cloudflare** — R2 버킷 `blogyu-media`를 만든다. API 토큰은 *Edit Cloudflare Workers* 템플릿으로 발급한다.

```bash
cd apps/api
pnpm wrangler secret put DATABASE_URL
pnpm wrangler secret put GITHUB_CLIENT_ID
pnpm wrangler secret put GITHUB_CLIENT_SECRET
pnpm wrangler secret put AUTH_SECRET
pnpm wrangler secret put REVALIDATE_SECRET
pnpm deploy
```

`wrangler.jsonc`의 `vars`에서 `SITE_URL`과 `MEDIA_BASE_URL`을 배포 주소로 바꾼다.

**Vercel** — 리포지토리를 연결한다. Root Directory는 **저장소 루트**로 두면 된다 (루트 `vercel.json`이 `turbo build --filter=@blogyu/web`을 돌려 api의 타입 선언을 먼저 만든다). 환경 변수는 `apps/web/.env.local.example`의 항목을 그대로 넣는다.

**GitHub Actions** — 리포지토리 Secrets에 두 개를 넣으면 `apps/api` 변경 시 자동 배포된다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**GitHub OAuth App** — callback URL을 배포된 API 주소로 바꾼다: `https://<api-도메인>/auth/github/callback`

### 이후

- `apps/web` 변경 → Vercel이 자동 배포
- `apps/api` 변경 → GitHub Actions가 자동 배포
- **스키마 변경 → `pnpm db:migrate`를 로컬에서 먼저 돌리고 푸시한다.** 롤백 전략이 없는 상태에서 CI가 마이그레이션을 자동 적용하면 실패했을 때 되돌릴 방법이 없다.

## 구현 메모

- **어드민은 클라이언트에서 API를 직접 호출한다.** 세션 쿠키가 API 도메인에 걸려 있어 Next 서버가 볼 수 없기 때문이다.
- **에디터 미리보기는 서버 액션으로 렌더한다.** Shiki(수 MB)를 클라이언트 번들에 넣지 않으면서 실제 글 화면과 같은 결과를 보장한다.
- **OG 이미지 색은 `src/lib/ogTheme.ts`에 hex로 박혀 있다.** satori가 CSS 변수도 oklch도 해석하지 못한다. 다크 팔레트를 바꾸면 이 파일도 같이 고쳐야 한다.
- **폰트는 self-host.** `next/font/google`은 Turbopack 빌드에서 한글 subset 다운로드가 깨진다.
- **마이그레이션은 `pg` 드라이버로 돈다.** drizzle-kit이 `@neondatabase/serverless`를 자동 감지하면 웹소켓으로 붙으려다 로컬에서 실패한다.
- **코드 하이라이팅 테마는 직접 만들었다**(`src/lib/codeTheme.ts`). 기성 테마는 빨강·파랑·보라를 함께 써서 모노크롬 아트디렉션과 충돌한다. 키워드만 액센트로 두고 나머지는 뉴트럴로 간다.
