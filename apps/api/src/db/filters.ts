import { and, inArray, lte, sql } from 'drizzle-orm'
import { posts } from './schema'

/**
 * 공개 목록에 나올 조건.
 *
 * scheduled 는 "발행 시각이 아직 오지 않은 글"이다. 그 시각이 지나면
 * 스스로 공개돼야 하므로 published 와 같이 취급한다.
 * status 만 보고 거르면 예약한 글이 시각이 지나도 영영 나오지 않는다.
 *
 * 네 곳(글·태그·시리즈·검색)에서 같은 조건을 쓰므로 여기 하나만 둔다.
 * 한 곳만 고치고 나머지를 빠뜨리면 목록마다 보이는 글이 달라진다.
 */
export const isPublicPost = and(
  inArray(posts.status, ['published', 'scheduled']),
  lte(posts.publishedAt, sql`now()`),
)
