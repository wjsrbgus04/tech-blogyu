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
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console 소유확인 메타태그. 비우면 태그가 나가지 않는다 |
| `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` | 서치어드바이저 소유확인 메타태그. 비우면 태그가 나가지 않는다 |

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
pnpm wrangler secret put INDEXNOW_KEY        # 글 저장 시 Bing·Yandex 계열에 즉시 색인 요청 (openssl rand -hex 16)
pnpm run deploy
```

두 경우 다 `pnpm deploy`가 아니라 **`pnpm run deploy`**로 부른다. `deploy`는 pnpm 내장 명령과 이름이 겹쳐서 인자가 엉뚱하게 붙는다.

`pnpm run deploy`는 web에서 세 가지를 순서대로 한다 — `next build` → 워커 번들 생성 → R2에 프리렌더 캐시 업로드 후 `wrangler deploy`. 로컬에서 워커 런타임으로 먼저 확인하려면 `pnpm --filter @blogyu/web run preview`를 쓴다(진짜 workerd에서 돌고 R2·DO도 로컬로 흉내 낸다).

**`INDEXNOW_KEY`를 빠뜨리면 색인 알림이 조용히 죽는다.** `lib/indexNow.ts`가 키가 없으면 아무것도 하지 않고 그냥 돌아오고, `/indexnow-key.txt`는 404를 낸다. 에러도 로그도 남지 않아서 글을 아무리 발행해도 알림이 나가지 않는 걸 눈치채기 어렵다. 아래 "배포 직후 확인"에서 404인지 반드시 본다.

**GitHub Actions** — 리포지토리 Secrets에 두 개를 넣으면 api·web 모두 자동 배포된다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**GitHub OAuth App** — callback URL을 배포된 API 주소로 바꾼다: `https://<api-도메인>/auth/github/callback`

## 검색엔진 콘솔 등록

**등록하지 않으면 어떤 크롤러도 이 사이트의 존재를 모른다.** 메타데이터·사이트맵·JSON-LD가 아무리 정확해도 읽으러 오지 않는다. 신규 도메인은 유입 링크가 없어 자연 발견도 기대할 수 없다.

**`workers.dev`에서는 DNS 소유확인을 쓸 수 없다.** `workers.dev` 존은 Cloudflare 소유라 TXT 레코드를 추가할 권한이 없다. 그래서 Google의 "도메인" 속성은 불가능하고 **"URL 접두어" 속성 + HTML 태그** 조합만 남는다. 네이버도 메타태그·HTML 파일 둘뿐이다.

순서를 지켜야 한다. `NEXT_PUBLIC_*`는 빌드 시점에 박히므로, 재배포 전에는 태그가 나가지 않아 확인이 반드시 실패한다.

1. 콘솔에서 속성을 만들고 **토큰만 받는다** (확인 버튼은 아직 누르지 않는다)
   - Google: [Search Console](https://search.google.com/search-console) > 웹사이트 추가 > URL 접두어 > HTML 태그 > `content` 값
   - 네이버: [서치어드바이저](https://searchadvisor.naver.com/) > 사이트 등록 > HTML 태그 > `content` 값
2. `apps/web/.env.production`의 `NEXT_PUBLIC_*_SITE_VERIFICATION`에 값을 넣는다. HTML에 노출되는 공개 값이라 커밋해도 안전하다.
3. **재배포한다.** `main` 푸시로 GitHub Actions가 돌거나 `pnpm run deploy`.
4. 태그가 실제로 나가는지 먼저 확인한다.
   ```bash
   curl -s https://<web-도메인>/ | grep -o 'site-verification[^>]*'
   ```
5. 콘솔로 돌아가 **확인**을 누른다.
6. 사이트맵을 제출한다 — Google은 `sitemap.xml`, 네이버는 `sitemap.xml`과 `feed.xml`(RSS)을 따로 받는다.
7. Google URL 검사 도구로 홈과 새 글의 **색인 생성을 요청**한다.

두 콘솔을 다 쓸 거면 토큰을 양쪽 다 받아두고 **한 번만 배포**한다. 따로 하면 배포가 두 번 나간다.

등록을 마쳐도 바로 색인되지는 않는다. 글이 적고 유입 링크가 없으면 Google이 `Crawled – currently not indexed`로 한동안 보류한다. 이건 설정으로 푸는 문제가 아니다.

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
curl -s $SITE/ | grep -o 'site-verification[^>]*'      # 콘솔에 등록했다면 메타태그가 나가야 한다
curl -s -o /dev/null -w '%{http_code}\n' $SITE/indexnow-key.txt  # 200. 404 면 INDEXNOW_KEY 미등록
```

브라우저로는 이 셋을 본다.

- `$SITE/admin` → GitHub 로그인 → 어드민 목록이 뜨는지 (세션 쿠키가 막히면 여기서 걸린다)
- 글 하나를 저장 → 목록에 바로 반영되는지 (안 되면 `REVALIDATE_SECRET`이 web·api 양쪽에서 다르거나, web 워커에 시크릿을 안 넣은 것이다)
- 글 화면의 코드 블록에 색이 들어가는지 (안 들어가면 그 언어가 `markdown.ts`의 목록에 없는 것이다)

## 이후

- `apps/web` 변경 → GitHub Actions가 자동 배포
- `apps/api` 변경 → GitHub Actions가 자동 배포 (web도 타입을 공유하므로 함께 다시 배포된다)
- **스키마 변경 → `pnpm db:migrate`를 로컬에서 먼저 돌리고 푸시한다.** 롤백 전략이 없는 상태에서 CI가 마이그레이션을 자동 적용하면 실패했을 때 되돌릴 방법이 없다.

