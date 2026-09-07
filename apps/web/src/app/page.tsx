import type { Metadata } from 'next'
import { PostListPage, postListMetadata } from '@/components/postListPage'

// Next 의 segment config 는 정적 리터럴만 인식한다 (apiClient 의 REVALIDATE_SECONDS 와 같은 값)
export const revalidate = 300

export function generateMetadata(): Metadata {
  return postListMetadata(1)
}

export default function HomePage() {
  return <PostListPage page={1} />
}
