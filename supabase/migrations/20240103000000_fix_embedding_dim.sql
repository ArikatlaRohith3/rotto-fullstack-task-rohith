-- gemini-embedding-2 supports outputDimensionality; we use 1536 to stay under HNSW's 2000-dim limit
drop index if exists candidates_embedding_hnsw_idx;
alter table candidates drop column if exists embedding;
alter table candidates add column embedding vector(1536);

create index if not exists candidates_embedding_hnsw_idx
  on candidates using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create or replace function rerank_by_embedding(
  p_embedding vector(1536),
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
