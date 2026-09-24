-- Migration: 00002_users_and_sessions
-- Date: 2026-09-24
-- Affects: role, table, function
-- -------------------------------------------------------
-- Adult accounts and their sessions. Children are profiles inside a family and never log in.
--
-- The web app connects as the `stepkids_app` role, which owns nothing and cannot bypass RLS.
-- Every request runs in a transaction that sets `app.user_id` (see apps/web/src/server/db.ts);
-- policies read it through public._current_user_id().

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'stepkids_app') then
    create role stepkids_app nologin noinherit nobypassrls;
  end if;
end $$;

grant usage on schema public to stepkids_app;
alter default privileges in schema public grant select, insert, update, delete on tables to stepkids_app;
alter default privileges in schema public grant usage, select on sequences to stepkids_app;
alter default privileges in schema public grant execute on functions to stepkids_app;

create or replace function public._current_user_id()
returns uuid
language sql
stable
set search_path to 'public'
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  -- scrypt$N$r$p$salt$hash (see apps/web/src/server/auth/password.ts)
  password_hash text not null,
  display_name text check (char_length(display_name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  disabled_at timestamptz,
  unique (email)
);

-- Opaque session tokens live only in the httpOnly cookie; the database keeps their SHA-256.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  user_agent text check (char_length(user_agent) <= 300)
);
create index sessions_user_idx on public.sessions (user_id);
create index sessions_expires_idx on public.sessions (expires_at);

-- Brute-force protection for sign-in: attempts per e-mail and per client address.
create table public.login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  ip text,
  succeeded boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_email_idx on public.login_attempts (email, created_at desc);
create index login_attempts_ip_idx on public.login_attempts (ip, created_at desc);
