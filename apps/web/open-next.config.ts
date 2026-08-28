import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue'
import doShardedTagCache from '@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache'

/**
 * Next.js 를 Cloudflare Workers 에서 돌리기 위한 어댑터 설정.
 *
 * ISR 은 세 조각이 다 있어야 동작한다. 하나라도 빠지면 조용히 반쪽만 된다.
 *
 *   incrementalCache — 렌더링 결과를 어디에 둘지 (R2)
 *   queue            — revalidate 주기가 지난 페이지를 누가 다시 그릴지 (Durable Object)
 *   tagCache         — revalidateTag 로 무엇을 버릴지 (Durable Object)
 *
 * 특히 tagCache 와 queue 가 함께 없으면 어드민 저장 시 쏘는
 * /api/revalidate 웹훅이 아무 일도 하지 않는다. 캐시가 만료될 때까지
 * 5분을 기다려야 글이 반영된다.
 *
 * 셋 다 SQLite 기반이라 Workers 무료 플랜에서 동작한다
 * (키-값 기반 Durable Object 만 유료다).
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
  // 샤드 1 = Durable Object 인스턴스 2개(soft/hard 태그용). 기본값은 4 인데,
  // 샤드가 많을수록 태그 조회 한 번이 여러 DO 를 때린다. 무료 플랜은
  // DO 요청이 하루 10만 건으로 묶여 있고 이 블로그는 글이 수십 편 규모라
  // 최소로 줄이는 편이 이득이다. 트래픽이 늘면 이 숫자부터 올린다.
  tagCache: doShardedTagCache({ baseShardSize: 1 }),
})
