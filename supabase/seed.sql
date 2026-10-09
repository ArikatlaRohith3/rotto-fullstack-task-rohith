-- Seed two companies
insert into public.companies (id, name, slug, plan, searches_used)
values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Acme Corp',   'acme',   'free', 0),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Globex Corp', 'globex', 'free', 0)
on conflict (slug) do nothing;

-- Seed auth users (Supabase local dev: insert directly into auth.users)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
  (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'recruiter@acme.test',
    crypt('rotto-assessment', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    'c0000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'recruiter@globex.test',
    crypt('rotto-assessment', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

-- Seed auth.identities required for email/password login
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  provider_id
) values
  (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'c0000000-0000-0000-0000-000000000001'::uuid,
    '{"sub":"c0000000-0000-0000-0000-000000000001","email":"recruiter@acme.test"}',
    'email',
    now(), now(), now(),
    'c0000000-0000-0000-0000-000000000001'
  ),
  (
    'c0000000-0000-0000-0000-000000000002'::uuid,
    'c0000000-0000-0000-0000-000000000002'::uuid,
    '{"sub":"c0000000-0000-0000-0000-000000000002","email":"recruiter@globex.test"}',
    'email',
    now(), now(), now(),
    'c0000000-0000-0000-0000-000000000002'
  )
on conflict (provider, provider_id) do nothing;

-- Link recruiters to companies
insert into public.recruiters (id, company_id)
values
  ('c0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid),
  ('c0000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid)
on conflict (id) do nothing;
