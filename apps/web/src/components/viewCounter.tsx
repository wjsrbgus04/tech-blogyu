'use client'

import { useEffect } from 'react'
import { api, uncached } from '@/lib/apiClient'

/**
 * 조회수만 올리고 아무것도 그리지 않는다.
 *
 * 화면의 좋아요·조회수 표시는 걷어냈지만 집계는 남겨야 한다 —
 * 어드민 목록에서 "어떤 글이 읽혔는지" 보는 유일한 지표다.
 */
export function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    // 세션당 한 번만. 새로고침으로 숫자가 부풀지 않게 한다.
    const key = `blogyu-viewed:${slug}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // 스토리지가 막혀 있으면 매번 올라가지만 통계가 크게 틀어지진 않는다
    }

    api.posts[':slug'].view.$post({ param: { slug } }, uncached).catch(() => {})
  }, [slug])

  return null
}
