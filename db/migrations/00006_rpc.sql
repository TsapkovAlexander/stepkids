-- Migration: 00006_rpc
-- Date: 2026-09-24
-- Affects: function
-- -------------------------------------------------------

-- Creates the caller's family on first sign-in (idempotent) and returns its id.
create or replace function public.ensure_family(p_name text default 'Моя семья')
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := public._current_user_id();
  v_family uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  select family_id into v_family from public.family_members where user_id = v_user order by created_at limit 1;
  if v_family is not null then
    return v_family;
  end if;
  insert into public.families (name)
    values (left(coalesce(nullif(btrim(p_name), ''), 'Моя семья'), 60))
    returning id into v_family;
  insert into public.family_members (family_id, user_id, role) values (v_family, v_user, 'owner');
  return v_family;
end;
$$;

revoke execute on function public.ensure_family(text) from public;
grant execute on function public.ensure_family(text) to stepkids_app;

-- Administrators grant or revoke editor/admin roles by e-mail.
create or replace function public.set_platform_role(p_email text, p_role public.platform_role)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid;
begin
  if not public._is_admin() then
    raise exception 'only administrators can change roles' using errcode = 'insufficient_privilege';
  end if;
  select id into v_user from public.users where lower(email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'user not found' using errcode = 'no_data_found';
  end if;
  if p_role is null then
    delete from public.platform_roles where user_id = v_user;
  else
    insert into public.platform_roles (user_id, role) values (v_user, p_role)
      on conflict (user_id) do update set role = excluded.role, granted_at = now();
  end if;
end;
$$;

revoke execute on function public.set_platform_role(text, public.platform_role) from public;
grant execute on function public.set_platform_role(text, public.platform_role) to stepkids_app;
