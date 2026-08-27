import { relations } from 'drizzle-orm'
import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/**
 * 발행 상태. 'scheduled' 는 publishedAt 이 미래인 글을 뜻하며,
 * 목록 쿼리에서 `status = 'published' AND published_at <= now()` 로 함께 걸러진다.
 */
export const postStatus = pgEnum('post_status', ['draft', 'published', 'scheduled'])

/** 연재 묶음. 글이 시리즈에 속하지 않을 수 있으므로 posts 쪽이 nullable FK를 갖는다. */
export const series = pgTable('series', {
  id: uuid().primaryKey().defaultRandom(),
  slug: varchar({ length: 120 }).notNull().unique(),
  title: text().notNull(),
  description: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const posts = pgTable(
  'posts',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: varchar({ length: 160 }).notNull().unique(),
    title: text().notNull(),
    /** 목록·검색·OG 이미지에 쓰는 요약. 어드민에서 160자로 제한한다. */
    excerpt: varchar({ length: 300 }).notNull(),
    /** 마크다운 원문. 렌더링은 web 쪽에서 한다. */
    content: text().notNull(),
    coverImageUrl: text(),
    status: postStatus().notNull().default('draft'),
    /** 예약 발행을 위해 미래 시각이 들어올 수 있다. */
    publishedAt: timestamp({ withTimezone: true }),
    readingMinutes: integer().notNull().default(1),
    viewCount: integer().notNull().default(0),
    likeCount: integer().notNull().default(0),
    /**
     * 지금은 'ko' 하나만 쓴다. 다국어를 붙일 때 라우팅만 추가하면 되도록
     * 컬럼을 미리 둔다 — 나중에 넣으면 전체 마이그레이션이 필요하다.
     */
    locale: varchar({ length: 8 }).notNull().default('ko'),
    seriesId: uuid().references(() => series.id, { onDelete: 'set null' }),
    seriesOrder: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 공개 목록: status + publishedAt 으로 거른 뒤 최신순 정렬
    index('posts_status_published_at_idx').on(t.status, t.publishedAt.desc()),
    // 시리즈 상세에서 편 순서대로 조회
    index('posts_series_idx').on(t.seriesId, t.seriesOrder),
  ],
)

export const tags = pgTable('tags', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 48 }).notNull().unique(),
  /** 태그 아카이브 페이지 상단 설명문. 검색 유입용 description 으로도 쓴다. */
  description: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const postsToTags = pgTable(
  'posts_to_tags',
  {
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.tagId] }),
    // 태그로 글을 찾는 방향 (태그 아카이브)
    index('posts_to_tags_tag_idx').on(t.tagId),
  ],
)

/**
 * 좋아요 중복 방지. 로그인이 없으므로 방문자 식별자를 해시로만 저장한다.
 * (IP + User-Agent + 서버 시크릿) 해시라 원본 IP를 되돌릴 수 없다.
 */
export const postLikes = pgTable(
  'post_likes',
  {
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    visitorHash: varchar({ length: 64 }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.visitorHash] })],
)

// ── 관계 정의 ────────────────────────────────────────────────
export const postsRelations = relations(posts, ({ one, many }) => ({
  series: one(series, { fields: [posts.seriesId], references: [series.id] }),
  postsToTags: many(postsToTags),
}))

export const seriesRelations = relations(series, ({ many }) => ({
  posts: many(posts),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  postsToTags: many(postsToTags),
}))

export const postsToTagsRelations = relations(postsToTags, ({ one }) => ({
  post: one(posts, { fields: [postsToTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postsToTags.tagId], references: [tags.id] }),
}))

export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type Tag = typeof tags.$inferSelect
export type Series = typeof series.$inferSelect
export type PostStatus = (typeof postStatus.enumValues)[number]
