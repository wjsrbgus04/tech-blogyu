import { z } from 'zod'

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  tag: z.string().max(48).optional(),
  series: z.string().max(120).optional(),
})

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(160),
})

export const idParamSchema = z.object({
  id: z.uuid(),
})

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, '검색어를 입력해 주세요.').max(100, '검색어가 너무 깁니다.'),
  limit: z.coerce.number().int().min(1).max(30).default(20),
})

/**
 * 글 입력 길이 제한. 어드민 에디터(web)도 같은 값을 써야 하므로
 * 여기 한곳에 모아둔다. 값을 바꾸면 postEditor.tsx 의 LIMITS 도 같이 고친다.
 *
 * DB 컬럼은 이보다 넉넉하다(slug 160, excerpt 300). 컬럼을 줄이려면
 * 마이그레이션이 필요하고 기존 데이터가 걸리므로, 입력 제한은 여기서만 건다.
 */
export const POST_LIMITS = {
  slug: 60,
  title: 100,
  excerpt: 160,
  content: 10_000,
  tag: 20,
  tagCount: 10,
} as const

/**
 * 슬러그는 URL에 그대로 노출되므로 소문자·숫자·하이픈만 허용한다.
 * 한글 제목은 자동 변환이 불가능해서 어드민이 직접 입력한다.
 */
const slugField = z
  .string()
  .min(1, '주소를 입력해 주세요.')
  .max(POST_LIMITS.slug, `주소가 너무 깁니다. ${POST_LIMITS.slug}자 안으로 줄여주세요.`)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '소문자·숫자·하이픈만 쓸 수 있습니다.')

export const postInputSchema = z.object({
  slug: slugField,
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력해 주세요.')
    .max(POST_LIMITS.title, `제목이 너무 깁니다. ${POST_LIMITS.title}자 안으로 줄여주세요.`),
  excerpt: z
    .string()
    .trim()
    .min(1, '요약을 입력해 주세요. 목록과 검색 결과에 쓰입니다.')
    .max(POST_LIMITS.excerpt, `요약이 너무 깁니다. ${POST_LIMITS.excerpt}자 안으로 줄여주세요.`),
  content: z
    .string()
    .min(1, '본문이 비어 있습니다.')
    .max(
      POST_LIMITS.content,
      `본문이 너무 깁니다. ${POST_LIMITS.content.toLocaleString()}자 안으로 줄여주세요.`,
    ),
  coverImageUrl: z.url().nullish(),
  status: z.enum(['draft', 'published', 'scheduled']),
  /** 예약 발행이면 미래 시각. 비우면 발행 시점의 현재 시각을 쓴다. */
  publishedAt: z.iso.datetime({ offset: true }).nullish(),
  seriesId: z.uuid().nullish(),
  seriesOrder: z.number().int().min(1).nullish(),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, '빈 태그는 넣을 수 없습니다.')
        .max(POST_LIMITS.tag, `태그가 너무 깁니다. ${POST_LIMITS.tag}자 안으로 줄여주세요.`),
    )
    .max(POST_LIMITS.tagCount, `태그는 ${POST_LIMITS.tagCount}개까지 붙일 수 있습니다.`)
    .default([]),
})

export const postPatchSchema = postInputSchema.partial()

/** 시리즈 입력 길이 제한. 컬럼(slug 120)보다 좁게 잡아 URL 과 내비에서 다루기 쉽게 한다. */
export const SERIES_LIMITS = {
  slug: 60,
  title: 60,
  description: 200,
} as const

export const seriesInputSchema = z.object({
  slug: z
    .string()
    .min(1, '주소를 입력해 주세요.')
    .max(SERIES_LIMITS.slug, `주소가 너무 깁니다. ${SERIES_LIMITS.slug}자 안으로 줄여주세요.`)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '소문자·숫자·하이픈만 쓸 수 있습니다.'),
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력해 주세요.')
    .max(SERIES_LIMITS.title, `제목이 너무 깁니다. ${SERIES_LIMITS.title}자 안으로 줄여주세요.`),
  description: z
    .string()
    .trim()
    .max(
      SERIES_LIMITS.description,
      `설명이 너무 깁니다. ${SERIES_LIMITS.description}자 안으로 줄여주세요.`,
    )
    .nullish(),
})

export const seriesPatchSchema = seriesInputSchema.partial()

export const adminListQuerySchema = z.object({
  status: z.enum(['all', 'draft', 'published', 'scheduled']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type PostInput = z.infer<typeof postInputSchema>
export type SeriesInput = z.infer<typeof seriesInputSchema>
