import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * tsconfig 의 @/* 별칭을 vitest 에도 알려준다. 이게 없으면 @/ 를 쓰는 모듈은
 * 테스트에서 "Cannot find package" 로 죽는다.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
