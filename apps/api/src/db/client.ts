import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

/**
 * 요청마다 새로 만들어도 비용이 없다 — 커넥션이 아니라 HTTP 요청이기 때문이다.
 * 엣지 런타임에는 커넥션 풀이 없으므로 TCP 드라이버를 쓰면 안 된다.
 */
export function createDb(databaseUrl: string) {
  // 로컬 개발은 docker-compose 의 HTTP 프록시를 거친다.
  // Neon 드라이버는 호스트명에서 엔드포인트를 유추하는데 로컬에는 그런 게 없어서
  // 직접 지정해 준다. 배포 환경에서는 이 분기를 타지 않는다.
  if (databaseUrl.includes('localtest.me')) {
    neonConfig.fetchEndpoint = 'http://db.localtest.me:4444/sql'
  }

  return drizzle(neon(databaseUrl), { schema, casing: 'snake_case' })
}

export type Db = ReturnType<typeof createDb>
