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
 * 슬러그는 URL에 그대로 노출되므로 소문자·숫자·하이픈만 허용한다.
 * 한글 제목은 자동 변환이 불가능해서 어드민이 직접 입력한다.
 */
const slugField = z
  .string()
  .min(1, '주소를 입력해 주세요.')
  .max(160, '주소가 너무 깁니다.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '소문자·숫자·하이픈만 쓸 수 있습니다.')

export const postInputSchema = z.object({
  slug: slugField,
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력해 주세요.')
    .max(200, '제목이 너무 깁니다. 200자 안으로 줄여주세요.'),
  excerpt: z
    .string()
    .trim()
    .min(1, '요약을 입력해 주세요. 목록과 검색 결과에 쓰입니다.')
    .max(300, '요약이 너무 깁니다. 300자 안으로 줄여주세요.'),
  content: z.string().min(1, '본문이 비어 있습니다.'),
  coverImageUrl: z.url().nullish(),
  status: z.enum(['draft', 'published', 'scheduled']),
  /** 예약 발행이면 미래 시각. 비우면 발행 시점의 현재 시각을 쓴다. */
  publishedAt: z.iso.datetime({ offset: true }).nullish(),
  seriesId: z.uuid().nullish(),
  seriesOrder: z.number().int().min(1).nullish(),
  tags: z
    .array(z.string().trim().min(1, '빈 태그는 넣을 수 없습니다.').max(48, '태그가 너무 깁니다.'))
    .max(10, '태그는 10개까지 붙일 수 있습니다.')
    .default([]),
})

export const postPatchSchema = postInputSchema.partial()

export const adminListQuerySchema = z.object({
  status: z.enum(['all', 'draft', 'published', 'scheduled']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type PostInput = z.infer<typeof postInputSchema>
