/**
 * 글을 전부 지운다. 빈 상태에서 처음부터 쓰기 시작할 때 쓴다.
 *
 *   pnpm db:clear
 *
 * 되돌릴 수 없으므로 로컬 DB 에서만 동작하게 막아뒀다.
 * 원격 DB 를 비우려면 그쪽 대시보드에서 직접 해야 한다.
 */
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { postLikes, posts, postsToTags, series, tags } from './schema'

config({ path: '../../.env' })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL 이 없습니다. 루트 .env 를 확인하세요.')
  if (!url.includes('localhost') && !url.includes('localtest.me')) {
    throw new Error('로컬 DB 가 아닙니다. 원격 데이터를 지우려면 대시보드에서 직접 하세요.')
  }

  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool)

  // 자식 테이블부터 지운다 (FK cascade 가 걸려 있지만 순서를 명시한다)
  await db.delete(postLikes)
  await db.delete(postsToTags)
  await db.delete(posts)
  await db.delete(tags)
  await db.delete(series)

  console.log('글·태그·시리즈를 모두 비웠습니다.')
  await pool.end()

  // DB 만 비우면 화면에는 ISR 캐시가 남아 지운 글이 그대로 보인다.
  // 어드민을 거치지 않는 스크립트라 재검증을 직접 쏜다.
  const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000'
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    console.log('REVALIDATE_SECRET 이 없어 캐시는 그대로입니다. 개발 서버를 다시 띄우세요.')
    return
  }

  try {
    const res = await fetch(`${siteUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ paths: ['/', '/tags'], tags: ['posts', 'tags', 'series'] }),
    })
    console.log(res.ok ? '화면 캐시도 비웠습니다.' : `재검증 실패 (${res.status})`)
  } catch {
    console.log('재검증 요청에 실패했습니다. 개발 서버가 떠 있는지 확인하세요.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
