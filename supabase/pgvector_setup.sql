-- ================================================================
-- Supabase SQL Editor에서 실행 (한 번만)
-- ================================================================

-- 1. pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. documents 테이블 생성
-- source: 'policy' | 'housing' | 'finance' | 'user_spending'
-- user_id: NULL = 공용 KB, SET = 사용자 개인 데이터
CREATE TABLE IF NOT EXISTS documents (
  id        BIGSERIAL PRIMARY KEY,
  content   TEXT        NOT NULL,
  metadata  JSONB       DEFAULT '{}',
  embedding VECTOR(384),               -- intfloat/multilingual-e5-small 출력 차원
  source    TEXT        NOT NULL,
  user_id   UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 벡터 유사도 검색 인덱스 (IVFFlat - 근사 최근접 이웃)
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. source + user_id 복합 인덱스 (중복 체크용)
CREATE INDEX IF NOT EXISTS documents_source_user_idx
  ON documents (source, user_id);

-- 5. 유사도 검색 RPC 함수
-- 공용 KB(user_id IS NULL) + 해당 사용자 개인 데이터를 함께 검색
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding  VECTOR(384),
  match_threshold  FLOAT   DEFAULT 0.25,
  match_count      INT     DEFAULT 5,
  filter_user_id   UUID    DEFAULT NULL
)
RETURNS TABLE (
  id         BIGINT,
  content    TEXT,
  metadata   JSONB,
  source     TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    content,
    metadata,
    source,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE
    (user_id IS NULL OR user_id = filter_user_id)
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 6. RLS 정책 (인증된 사용자만 읽기/쓰기)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "공용 KB 읽기 허용" ON documents
  FOR SELECT USING (user_id IS NULL);

CREATE POLICY "본인 데이터 읽기" ON documents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "본인 데이터 삽입" ON documents
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "본인 데이터 수정" ON documents
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "본인 데이터 삭제" ON documents
  FOR DELETE USING (user_id = auth.uid());
