import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit 은 apps/api 를 cwd 로 실행되므로 루트 .env 를 직접 가리킨다
config({ path: '../../.env' })

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // 마이그레이션은 로컬에서 Node로 돌린다 — 루트 .env 의 DATABASE_URL 을 읽는다
    url: process.env.DATABASE_URL ?? '',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
})
