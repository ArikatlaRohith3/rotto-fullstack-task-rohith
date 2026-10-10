-- RPC to find globally similar candidates by embedding (no ID filter)
create or replace function find_similar_candidates(
  p_embedding vector(1536),
  p_exclude_id text default null,
  p_limit int default 20
) returns table(id text, similarity float8) as $$
  select
    c.id,
    1.0 - (c.embedding <=> p_embedding) as similarity
  from candidates c
  where c.embedding is not null
    and (p_exclude_id is null or c.id != p_exclude_id)
  order by c.embedding <=> p_embedding
  limit p_limit
$$ language sql stable;
