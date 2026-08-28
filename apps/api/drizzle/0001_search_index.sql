-- 검색은 ILIKE 부분 문자열 매칭으로 한다.
-- Postgres 전문 검색(tsvector)은 한국어 형태소 분석기가 기본 제공되지 않아
-- "커넥션"이 "커넥션을"에 걸리지 않는다. 부분 문자열 매칭이 한국어에 맞다.
--
-- 다만 인덱스 없는 ILIKE 는 풀스캔이므로 pg_trgm GIN 인덱스를 걸어둔다.
-- Neon 은 pg_trgm 을 지원한다.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_title_trgm_idx" ON "posts" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_excerpt_trgm_idx" ON "posts" USING gin ("excerpt" gin_trgm_ops);
--> statement-breakpoint
-- 본문은 길어서 인덱스가 크다. 글이 수백 편 규모를 넘어가면
-- 이 인덱스를 빼고 제목·요약만 검색하는 쪽이 나을 수 있다.
CREATE INDEX IF NOT EXISTS "posts_content_trgm_idx" ON "posts" USING gin ("content" gin_trgm_ops);
