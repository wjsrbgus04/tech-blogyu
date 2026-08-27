'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminBar } from '@/components/admin/adminBar'
import { type EditorValue, PostEditor } from '@/components/admin/postEditor'
import { api, uncached } from '@/lib/apiClient'

export default function EditPostPage() {
  const params = useParams<{ id: string }>()
  const [initial, setInitial] = useState<EditorValue | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params.id) return
    let alive = true

    api.admin.posts[':id']
      .$get({ param: { id: params.id } }, uncached)
      .then(async (res) => {
        if (!res.ok) throw new Error('글을 불러오지 못했습니다.')
        return res.json()
      })
      .then((data) => {
        if (!alive) return
        const { post, tags } = data
        setInitial({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          coverImageUrl: post.coverImageUrl,
          status: post.status,
          publishedAt: post.publishedAt,
          seriesId: post.seriesId,
          seriesOrder: post.seriesOrder,
          tags,
        })
      })
      .catch((err: Error) => alive && setError(err.message))

    return () => {
      alive = false
    }
  }, [params.id])

  if (error) {
    return (
      <>
        <AdminBar />
        <p className="py-24 text-center text-[0.875rem] text-fg-faint">{error}</p>
      </>
    )
  }

  if (!initial) {
    return (
      <>
        <AdminBar />
        <p className="py-24 text-center text-[0.875rem] text-fg-faint">불러오는 중…</p>
      </>
    )
  }

  return <PostEditor postId={params.id} initial={initial} />
}
