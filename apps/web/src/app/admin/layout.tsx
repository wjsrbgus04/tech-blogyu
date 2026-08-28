import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AdminGate } from '@/components/admin/adminGate'

export const metadata: Metadata = {
  title: '관리자',
  // 어드민은 색인 대상이 아니다
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminGate>{children}</AdminGate>
}
