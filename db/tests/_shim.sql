-- Test helpers for `pnpm test:db`; applied after the migrations and the seed.
create schema if not exists tests;
grant usage on schema tests to stepkids_app;

create or replace function tests.create_user(p_email text) returns uuid language sql as $$
  insert into public.users (email, password_hash) values (lower(p_email), 'scrypt$test') returning id;
$$;

create table tests.ids (name text primary key, id uuid not null);
grant select, insert, update on tests.ids to stepkids_app;

create or replace function tests.id(p_name text) returns uuid language sql stable as $$
  select id from tests.ids where name = p_name;
$$;

create or replace function tests.remember(p_name text, p_id uuid) returns uuid language sql as $$
  insert into tests.ids (name, id) values (p_name, p_id)
    on conflict (name) do update set id = excluded.id
    returning id;
$$;

-- Acts as a remembered user; switch the role with SET LOCAL ROLE stepkids_app.
create or replace function tests.login(p_name text) returns void language sql as $$
  select set_config('app.user_id', coalesce(tests.id(p_name)::text, ''), false);
$$;

create or replace function tests.logout() returns void language sql as $$
  select set_config('app.user_id', '', false);
$$;
grant execute on all functions in schema tests to stepkids_app;
