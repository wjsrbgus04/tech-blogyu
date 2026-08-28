# 개발 환경

로컬에서 전체 스택을 띄우고 개발하는 방법. 배포는 [deployment.md](./deployment.md) 를 본다.

## 1. 사전 준비

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

## 2. 환경 변수

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

## 3. DB 스키마 적용

```bash
pnpm db:migrate   # 스키마 생성
pnpm db:seed      # 샘플 글 6편 (로컬 DB 에서만 동작한다)
```

`0001_search_index.sql`이 `pg_trgm` 확장을 켜고 검색용 GIN 인덱스를 만든다.

빈 화면으로는 목록 간격도 코드 블록도 확인할 수 없으므로, 개발을 시작할 때는 시드를 넣는 편이 낫다.

## 4. 개발 서버

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

