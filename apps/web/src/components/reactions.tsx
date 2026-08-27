'use client'

import { useEffect, useState } from 'react'
import { api, uncached } from '@/lib/apiClient'

/**
 * 조회수·좋아요. ISR 로 캐시된 페이지 위에서 클라이언트가 따로 가져온다.
 * 서버 렌더 값을 초기값으로 쓰되, 캐시된 값이라 실제와 다를 수 있어 마운트 후 보정한다.
 */
export function Reactions({
  slug,
  initialViewCount,
  initialLikeCount,
}: {
  slug: string
  initialViewCount: number
  initialLikeCount: number
}) {
  const [viewCount, setViewCount] = useState(initialViewCount)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [liked, setLiked] = useState(false)
  const [pending, setPending] = useState(false)

  // 조회수는 세션당 한 번만 올린다 — 새로고침으로 부풀지 않게.
  useEffect(() => {
    const key = `blogyu-viewed:${slug}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // 스토리지가 막혀 있으면 매번 올라가지만 통계가 크게 틀어지진 않는다
    }

    api.posts[':slug'].view
      .$post({ param: { slug } }, uncached)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setViewCount(data.viewCount))
      .catch(() => {})
  }, [slug])

  async function toggleLike() {
    if (pending) return
    setPending(true)

    // 낙관적 업데이트 — 왕복을 기다리면 버튼이 죽은 것처럼 느껴진다
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)))

    try {
      const res = await api.posts[':slug'].like.$post({ param: { slug } }, uncached)
      if (!res.ok) throw new Error('like failed')
      const data = await res.json()
      setLiked(data.liked)
      setLikeCount(data.likeCount)
    } catch {
      // 실패하면 되돌린다
      setLiked(!nextLiked)
      setLikeCount((count) => Math.max(0, count + (nextLiked ? -1 : 1)))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-12 flex flex-wrap items-center gap-2 border-border border-t border-b py-5 text-[0.8125rem] text-fg-faint">
      <button
        type="button"
        onClick={toggleLike}
        aria-pressed={liked}
        className={
          liked
            ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-accent bg-accent px-3 py-1.5 font-[560] text-[0.8125rem] text-accent-fg transition-transform active:scale-[0.97]'
            : 'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[0.8125rem] text-fg-muted transition-colors hover:border-border-strong hover:text-fg active:scale-[0.97]'
        }
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 13.4S1.8 9.9 1.8 5.9A3.1 3.1 0 018 4.3a3.1 3.1 0 016.2 1.6c0 4-6.2 7.5-6.2 7.5z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
            fill={liked ? 'currentColor' : 'none'}
          />
        </svg>
        <span className="tabular">{likeCount}</span>
      </button>

      <span className="tabular ml-auto">조회 {viewCount.toLocaleString('ko-KR')}</span>
    </div>
  )
}
