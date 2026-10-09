-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

create table public.companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  plan         text not null default 'free' check (plan in ('free', 'paid')),
  searches_used integer not null default 0,
  stripe_subscription_id     text,
  stripe_subscription_status text,
  stripe_current_period_end  timestamptz,
  stripe_event_created       bigint default 0,
  created_at   timestamptz default now()
);

create table public.recruiters (
  id         uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id),
  created_at timestamptz default now()
);

create table public.candidates (
  id               text primary key,
  full_name        text not null,
  avatar_url       text,
  headline         text,
  current_title    text,
  current_company  text,
  current_company_logo_url text,
  role             text,
  seniority        text,
  years_experience integer,
  location_city    text,
  location_state   text,
  location_country text,
  open_to_work     boolean default false,
  skills           text[] default '{}',
  experiences      jsonb default '[]',
  education        jsonb default '[]',
  created_at       timestamptz default now()
);

create table public.searches (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id),
  recruiter_id uuid not null references public.recruiters (id),
  brief       text not null,
  filters     jsonb not null default '{}',
  result_ids  text[] not null default '{}',
  total       integer not null default 0,
  created_at  timestamptz default now()
);

create table public.shortlists (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  name       text not null,
  created_at timestamptz default now()
);

create table public.shortlist_candidates (
  shortlist_id uuid not null references public.shortlists (id) on delete cascade,
  candidate_id text not null references public.candidates (id),
  added_at     timestamptz default now(),
  primary key (shortlist_id, candidate_id)
);

create table public.saved_briefs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id),
  recruiter_id uuid not null references public.recruiters (id),
  brief       text not null,
  filters     jsonb not null default '{}',
  created_at  timestamptz default now()
);

create table public.stripe_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────

create index idx_candidates_location_city on public.candidates (location_city);
create index idx_candidates_seniority     on public.candidates (seniority);
create index idx_candidates_role_trgm     on public.candidates using gin (role gin_trgm_ops);
create index idx_candidates_skills        on public.candidates using gin (skills);
create index idx_candidates_open_to_work  on public.candidates (open_to_work);
create index idx_candidates_years_exp     on public.candidates (years_experience);
create index idx_candidates_experiences   on public.candidates using gin (experiences);
create index idx_candidates_education     on public.candidates using gin (education);

create index idx_searches_company on public.searches (company_id);
create index idx_shortlists_company on public.shortlists (company_id);
create index idx_saved_briefs_company on public.saved_briefs (company_id);
create index idx_recruiters_company on public.recruiters (company_id);

-- ─────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────

alter table public.companies          enable row level security;
alter table public.recruiters         enable row level security;
alter table public.candidates         enable row level security;
alter table public.searches           enable row level security;
alter table public.shortlists         enable row level security;
alter table public.shortlist_candidates enable row level security;
alter table public.saved_briefs       enable row level security;
alter table public.stripe_events      enable row level security;

-- Helper: get current recruiter's company_id
create or replace function public.my_company_id()
returns uuid language sql stable security definer
as $$
  select company_id from public.recruiters where id = auth.uid()
$$;

-- candidates: all authenticated users can read
create policy "candidates_select" on public.candidates
  for select to authenticated using (true);

-- companies: recruiter sees own company only
create policy "companies_select" on public.companies
  for select to authenticated
  using (id = public.my_company_id());

-- recruiters: see own record only
create policy "recruiters_select" on public.recruiters
  for select to authenticated
  using (id = auth.uid());

-- searches: company-scoped
create policy "searches_select" on public.searches
  for select to authenticated
  using (company_id = public.my_company_id());

create policy "searches_insert" on public.searches
  for insert to authenticated
  with check (company_id = public.my_company_id());

-- shortlists: company-scoped
create policy "shortlists_select" on public.shortlists
  for select to authenticated
  using (company_id = public.my_company_id());

create policy "shortlists_insert" on public.shortlists
  for insert to authenticated
  with check (company_id = public.my_company_id());

create policy "shortlists_update" on public.shortlists
  for update to authenticated
  using (company_id = public.my_company_id());

create policy "shortlists_delete" on public.shortlists
  for delete to authenticated
  using (company_id = public.my_company_id());

-- shortlist_candidates: via shortlist company
create policy "shortlist_candidates_select" on public.shortlist_candidates
  for select to authenticated
  using (
    shortlist_id in (
      select id from public.shortlists where company_id = public.my_company_id()
    )
  );

create policy "shortlist_candidates_insert" on public.shortlist_candidates
  for insert to authenticated
  with check (
    shortlist_id in (
      select id from public.shortlists where company_id = public.my_company_id()
    )
  );

create policy "shortlist_candidates_delete" on public.shortlist_candidates
  for delete to authenticated
  using (
    shortlist_id in (
      select id from public.shortlists where company_id = public.my_company_id()
    )
  );

-- saved_briefs: company-scoped
create policy "saved_briefs_select" on public.saved_briefs
  for select to authenticated
  using (company_id = public.my_company_id());

create policy "saved_briefs_insert" on public.saved_briefs
  for insert to authenticated
  with check (company_id = public.my_company_id());

create policy "saved_briefs_delete" on public.saved_briefs
  for delete to authenticated
  using (company_id = public.my_company_id());

-- stripe_events: no direct user access
create policy "stripe_events_deny" on public.stripe_events
  for all to authenticated using (false);

-- ─────────────────────────────────────────────
-- Atomic search-count function (concurrency-safe)
-- ─────────────────────────────────────────────

create or replace function public.use_search(p_company_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_plan         text;
  v_searches_used integer;
begin
  -- Lock the row for the duration of this transaction
  select plan, searches_used
  into v_plan, v_searches_used
  from public.companies
  where id = p_company_id
  for update;

  if v_plan = 'paid' then
    update public.companies
    set searches_used = searches_used + 1
    where id = p_company_id;
    return jsonb_build_object('allowed', true, 'searches_remaining', null);
  elsif v_searches_used < 1 then
    update public.companies
    set searches_used = searches_used + 1
    where id = p_company_id;
    return jsonb_build_object('allowed', true, 'searches_remaining', 0);
  else
    return jsonb_build_object('allowed', false, 'searches_remaining', 0);
  end if;
end;
$$;
