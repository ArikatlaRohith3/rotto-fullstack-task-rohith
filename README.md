# Rotto — Recruiter Search App

## How Search Works

1. **Brief → Filters (LLM):** The recruiter types a plain-English brief. The server sends it to `gemini-3.8-flash` with a tightly-scoped system prompt that maps natural language to a fixed filter schema (`skills`, `location`, `seniority`, `role`, `open_to_work`, `company_type`, `education_level`, `education_school`, `min/max_years_experience`). The response is strictly whitelisted—no field the DB can't support gets through.

2. **Filters → SQL (Postgres):** The server builds a Supabase query using only the extracted fields. All filters are **hard** (AND logic): a candidate must match every filter specified. This prioritises precision—returning nothing beats returning the wrong people. GIN indexes on `skills[]` and JSONB columns make filtering fast.

3. **Scoring & ranking:** Among matching candidates we compute a relevance score server-side: +2 per matching skill, +5 for exact seniority, +3 for location, +2 for open-to-work and company type, +3 for education matches. Top results appear first on page 1.

4. **Pagination:** All matching IDs are stored in the `searches` table at query time. Paging just slices that array and hydrates the candidates—no LLM call, no recount, always < 300 ms.

## Preventing LLM Filter Hallucination

- The system prompt enumerates **every legal field and every legal value** (e.g. seniority must be one of `junior|mid|senior|staff|lead|principal`).
- After parsing the JSON we run a **whitelist pass**: any field or value not in our schema is silently dropped.
- The LLM input is truncated at 500 characters and `<>` stripped to neutralise prompt-injection attempts.
- The model is instructed: *"Only extract filters EXPLICITLY stated or directly implied. Never invent or guess."*

## Model Choice

**`gemini-3.8-flash`** (Google). Chosen for:
- Fast (~0.4 s median latency) — keeps total search time well under 3 s.
- Low cost: ~$0.00005–$0.0001 per search call (input ~300 tokens, output ~80 tokens at Flash pricing).
- Reliable JSON output for constrained extraction tasks.
- Generous free tier (1,500 requests/day) suitable for development and light production use.

**Estimated cost per search:** < $0.001 including the API overhead.

## Trade-offs

| Decision | What I chose | What I gave up |
|---|---|---|
| Hard vs soft filters | Hard (all must match) | Recall on vague briefs |
| Skills matching | ALL specified skills must be present | Partially-matching candidates |
| Ranking | Server-side score formula | ML-quality ranking |
| Search storage | Store all result IDs upfront | Freshness (results don't update if DB changes) |
| RLS | Full RLS + API-level auth | Slightly more complex queries |

## What I'd Do With Another Week

1. **Better ranking:** Use Postgres `tsvector` + `ts_rank` for role/title matching, and weight skills by recency in work history.
2. **Fuzzy location:** Normalize city aliases ("NYC" → "New York") and support radius search.
3. **Real-time filter suggestions:** As the recruiter types, show a live filter preview.
4. **Webhook retry queue:** Persist failed webhook events in a dead-letter table for manual replay.
5. **Semantic search fallback:** For briefs with no filter matches, embed the brief and use pgvector to find nearest candidates.
6. **Team invitations and roles** (admin vs. viewer).

## Local Setup

```bash
make setup   # install deps, start Supabase, migrate, seed candidates
make dev     # start Next.js on http://localhost:3000
```

Credentials:
- `recruiter@acme.test` / `rotto-assessment`
- `recruiter@globex.test` / `rotto-assessment`

Environment variables required (set in `.env.local`):
```
GEMINI_API_KEY=...
STRIPE_WEBHOOK_SECRET=whsec_rotto_assessment_sample
```
