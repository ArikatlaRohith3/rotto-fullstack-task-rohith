-- Enable pgvector for semantic search
create extension if not exists vector;

-- Add 768-dim embedding column (Gemini text-embedding-004)
alter table candidates add column if not exists embedding vector(768);

-- HNSW index — no data needed upfront, unlike IVFFlat
create index if not exists candidates_embedding_hnsw_idx
  on candidates using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- RPC: rerank a set of candidate IDs by semantic similarity to an embedding
create or replace function rerank_by_embedding(
  p_embedding vector(768),
  p_candidate_ids text[],
  p_limit int default 500
) returns table(id text, similarity float8) as $$
  select
    c.id,
    1.0 - (c.embedding <=> p_embedding) as similarity
  from candidates c
  where c.id = any(p_candidate_ids)
    and c.embedding is not null
  order by c.embedding <=> p_embedding
  limit p_limit
$$ language sql stable;
