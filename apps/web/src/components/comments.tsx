'use client'

import { useEffect, useRef } from 'react'

const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID
const CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? 'Announcements'
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID

const GISCUS_ORIGIN = 'https://giscus.app'

function themeName(isDark: boolean) {
  return isDark ? 'dark_dimmed' : 'light'
}

/**
 * Giscus (GitHub Discussions). 스팸·인증·신고를 GitHub 이 대신 처리한다.
 * 독자에게 GitHub 계정을 요구하는 게 유일한 제약인데, 기술 블로그 독자층에선 문제가 되지 않는다.
 */
export function Comments() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !REPO || !REPO_ID || !CATEGORY_ID) return
    // StrictMode 의 이중 마운트로 위젯이 두 번 붙는 걸 막는다
    if (container.querySelector('iframe, script')) return

    const root = document.documentElement
    const script = document.createElement('script')

    script.src = `${GISCUS_ORIGIN}/client.js`
    script.async = true
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-repo', REPO)
    script.setAttribute('data-repo-id', REPO_ID)
    script.setAttribute('data-category', CATEGORY)
    script.setAttribute('data-category-id', CATEGORY_ID)
    script.setAttribute('data-mapping', 'pathname')
    // 글 자체에 대한 GitHub 리액션(👍 🎉 ❤️ …)을 댓글 위에 띄운다.
    // 자체 좋아요 버튼을 걷어낸 자리를 이쪽이 대신한다.
    script.setAttribute('data-reactions-enabled', '1')
    script.setAttribute('data-emit-metadata', '0')
    script.setAttribute('data-input-position', 'top')
    script.setAttribute('data-theme', themeName(root.classList.contains('dark')))
    script.setAttribute('data-lang', 'ko')
    script.setAttribute('data-loading', 'lazy')

    container.appendChild(script)

    /**
     * 테마를 바꿔도 위젯은 iframe 안에 있어 CSS 가 닿지 않는다.
     * 스크립트 속성은 최초 로드에만 쓰이므로 이후 전환은 postMessage 로 알려야 한다.
     */
    const observer = new MutationObserver(() => {
      const iframe = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
      iframe?.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: themeName(root.classList.contains('dark')) } } },
        GISCUS_ORIGIN,
      )
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  if (!REPO_ID || !CATEGORY_ID) {
    return (
      <p className="rounded-md border border-border-strong border-dashed px-5 py-9 text-center text-[1.0625rem] text-fg-faint leading-relaxed">
        댓글을 쓰려면 Giscus 설정이 필요합니다.
        <br />
        giscus.app 에서 발급받은 값을 NEXT_PUBLIC_GISCUS_* 에 넣어주세요.
      </p>
    )
  }

  return <div ref={containerRef} />
}
