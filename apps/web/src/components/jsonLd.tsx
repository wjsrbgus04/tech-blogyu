import type { JsonLd as JsonLdData } from '@/lib/jsonLd'

/** 구조화 데이터를 <script type="application/ld+json"> 으로 심는다. */
export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 구조화 데이터
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
