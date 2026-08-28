import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/apiClient'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 검색 결과와 어드민은 색인 대상이 아니다
      disallow: ['/admin', '/search'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
