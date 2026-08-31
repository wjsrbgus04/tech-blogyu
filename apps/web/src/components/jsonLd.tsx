import type { JsonLd as JsonLdData } from '@/lib/jsonLd'

/** 구조화 데이터를 <script type="application/ld+json"> 으로 심는다. */
export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  return (
    <script
      type="application/ld+json"
      // 제목에 </script> 가 들어 있으면 스크립트 블록이 거기서 끊긴다 — < 를 유니코드 이스케이프로 바꿔 둔다
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 구조화 데이터
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
