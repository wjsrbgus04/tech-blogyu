# 배포

Cloudflare Workers 두 개(web·api)와 Neon Postgres 로 나간다. 로컬 개발은 [development.md](./development.md) 를 본다.

## 배포 전 점검

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

## 처음 한 번

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
pnpm wrangler secret put INDEXNOW_KEY        # 선택. 글 저장 시 Bing 계열에 즉시 색인 요청 (openssl rand -hex 16)
pnpm run deploy
```

두 경우 다 `pnpm deploy`가 아니라 **`pnpm run deploy`**로 부른다. `deploy`는 pnpm 내장 명령과 이름이 겹쳐서 인자가 엉뚱하게 붙는다.

`pnpm run deploy`는 web에서 세 가지를 순서대로 한다 — `next build` → 워커 번들 생성 → R2에 프리렌더 캐시 업로드 후 `wrangler deploy`. 로컬에서 워커 런타임으로 먼저 확인하려면 `pnpm --filter @blogyu/web run preview`를 쓴다(진짜 workerd에서 돌고 R2·DO도 로컬로 흉내 낸다).

**GitHub Actions** — 리포지토리 Secrets에 두 개를 넣으면 api·web 모두 자동 배포된다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**GitHub OAuth App** — callback URL을 배포된 API 주소로 바꾼다: `https://<api-도메인>/auth/github/callback`

## 배포 직후 확인

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

## 이후

- `apps/web` 변경 → GitHub Actions가 자동 배포
- `apps/api` 변경 → GitHub Actions가 자동 배포 (web도 타입을 공유하므로 함께 다시 배포된다)
- **스키마 변경 → `pnpm db:migrate`를 로컬에서 먼저 돌리고 푸시한다.** 롤백 전략이 없는 상태에서 CI가 마이그레이션을 자동 적용하면 실패했을 때 되돌릴 방법이 없다.

