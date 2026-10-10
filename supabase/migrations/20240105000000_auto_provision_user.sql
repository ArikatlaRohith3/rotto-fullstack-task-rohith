-- Auto-provision company + recruiter when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_company_id uuid;
begin
  insert into public.companies (name, slug, plan)
  values (
    split_part(new.email, '@', 1),
    replace(split_part(new.email, '@', 1), '.', '-') || '-' || substr(new.id::text, 1, 6),
    'free'
  )
  returning id into new_company_id;

  insert into public.recruiters (id, company_id)
  values (new.id, new_company_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Back-fill existing users who don't have a recruiter record
do $$
declare
  u record;
  new_company_id uuid;
begin
  for u in
    select id, email from auth.users
    where id not in (select id from public.recruiters)
  loop
    insert into public.companies (name, slug, plan)
    values (
      split_part(u.email, '@', 1),
      replace(split_part(u.email, '@', 1), '.', '-') || '-' || substr(u.id::text, 1, 6),
      'free'
    )
    returning id into new_company_id;

    insert into public.recruiters (id, company_id)
    values (u.id, new_company_id);
  end loop;
end;
$$;
