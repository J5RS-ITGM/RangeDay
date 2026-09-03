-- ============================================================
-- Range Day — M1 schema: users, roles, RLS foundation
-- Run this in the Supabase SQL editor (it is idempotent-ish for
-- first setup; re-running will error on existing objects).
--
-- Cross-cutting rule: RLS is the security model. The client is
-- untrusted. Every table here has RLS enabled and policies that
-- express exactly who can see and change what.
-- ============================================================

-- ---------- Roles ----------
create type public.app_role as enum ('shooter', 'instructor_pending', 'instructor', 'admin');

-- ---------- App users (mirror of auth.users, holds role + profile) ----------
create table public.app_users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text not null default '',
  role         public.app_role not null default 'shooter',
  disabled     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.app_users enable row level security;

-- ---------- Helper: is the caller an admin? ----------
-- SECURITY DEFINER so it can read app_users without recursing
-- through the very policies that call it.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where id = auth.uid() and role = 'admin' and not disabled
  );
$$;

revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- Policies ----------
-- Read: you can see yourself; admins can see everyone.
create policy app_users_select on public.app_users
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Update: you can update yourself; admins can update anyone.
-- (Role/disabled changes are additionally guarded by the trigger below.)
create policy app_users_update on public.app_users
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No insert/delete policies: rows are created by the signup trigger
-- and removed by the auth.users cascade. Clients cannot forge rows.

-- ---------- Guard: only admins change role or disabled ----------
create or replace function public.guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.disabled is distinct from old.disabled)
     and not public.is_admin() then
    raise exception 'Only admins can change role or disabled status';
  end if;
  -- Admins cannot strip their own admin role (prevents locking everyone out)
  if old.role = 'admin' and new.role <> 'admin' and old.id = auth.uid() then
    raise exception 'You cannot remove your own admin role';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger app_users_guard
  before update on public.app_users
  for each row execute function public.guard_privileged_columns();

-- ---------- Signup trigger: every new auth user gets an app row ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- AFTER RUNNING THIS FILE:
-- 1. Sign up your own account through the app's login page.
-- 2. Promote yourself to admin (one-time bootstrap; replace the email):
--
--    update public.app_users set role = 'admin'
--    where email = 'you@example.com';
--
-- From then on, all role changes happen in the app's Admin panel.
-- ============================================================
