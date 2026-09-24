-- Aggregate: helper functions (prefix _)
-- Source of truth for the current schema state; changes arrive through db/migrations.

-- Number of blocks in a stack (with nested stacks and reporters), or -1 if malformed.
create or replace function public._count_valid_blocks(p_blocks jsonb, p_depth integer)
returns integer
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  v_block jsonb;
  v_value jsonb;
  v_total integer := 0;
  v_nested integer;
begin
  if p_depth > 24 or jsonb_typeof(p_blocks) is distinct from 'array' then
    return -1;
  end if;
  for v_block in select value from jsonb_array_elements(p_blocks) loop
    if jsonb_typeof(v_block) is distinct from 'object'
      or jsonb_typeof(v_block -> 'id') is distinct from 'string'
      or char_length(v_block ->> 'id') not between 1 and 40
      or jsonb_typeof(v_block -> 'type') is distinct from 'string'
      or char_length(v_block ->> 'type') not between 1 and 60
      or (v_block ? 'args' and jsonb_typeof(v_block -> 'args') is distinct from 'object')
      or (v_block ? 'stacks' and jsonb_typeof(v_block -> 'stacks') is distinct from 'object') then
      return -1;
    end if;
    v_total := v_total + 1;
    for v_value in select value from jsonb_each(coalesce(v_block -> 'args', '{}'::jsonb)) loop
      if jsonb_typeof(v_value) = 'object' then
        v_nested := public._count_valid_blocks(jsonb_build_array(v_value), p_depth + 1);
        if v_nested < 0 then
          return -1;
        end if;
        v_total := v_total + v_nested;
      elsif jsonb_typeof(v_value) not in ('string', 'number', 'boolean') then
        return -1;
      end if;
    end loop;
    for v_value in select value from jsonb_each(coalesce(v_block -> 'stacks', '{}'::jsonb)) loop
      v_nested := public._count_valid_blocks(v_value, p_depth + 1);
      if v_nested < 0 then
        return -1;
      end if;
      v_total := v_total + v_nested;
    end loop;
    if v_total > 2000 then
      return -1;
    end if;
  end loop;
  return v_total;
end;
$$;

create or replace function public._valid_program(p_program jsonb)
returns boolean
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  v_target jsonb;
  v_script jsonb;
  v_count integer := 0;
  v_blocks integer;
begin
  if jsonb_typeof(p_program) is distinct from 'object'
    or p_program -> 'v' is distinct from '1'::jsonb
    or jsonb_typeof(p_program -> 'targets') is distinct from 'array'
    or jsonb_array_length(p_program -> 'targets') > 32
    or pg_column_size(p_program) > 262144 then
    return false;
  end if;
  for v_target in select value from jsonb_array_elements(p_program -> 'targets') loop
    if jsonb_typeof(v_target) is distinct from 'object'
      or jsonb_typeof(v_target -> 'target') is distinct from 'string'
      or jsonb_typeof(v_target -> 'scripts') is distinct from 'array'
      or jsonb_array_length(v_target -> 'scripts') > 64 then
      return false;
    end if;
    for v_script in select value from jsonb_array_elements(v_target -> 'scripts') loop
      if jsonb_typeof(v_script) is distinct from 'object' or jsonb_typeof(v_script -> 'id') is distinct from 'string' then
        return false;
      end if;
      v_blocks := public._count_valid_blocks(v_script -> 'blocks', 0);
      v_count := v_count + v_blocks;
      if v_blocks < 0 or v_count > 2000 then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;

create or replace function public._valid_scene(p_scene jsonb)
returns boolean
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  v_cols numeric;
  v_rows numeric;
  v_entity jsonb;
begin
  if jsonb_typeof(p_scene) is distinct from 'object' or pg_column_size(p_scene) > 131072 then
    return false;
  end if;
  if p_scene ->> 'kind' = 'grid' then
    if jsonb_typeof(p_scene -> 'cols') is distinct from 'number' or jsonb_typeof(p_scene -> 'rows') is distinct from 'number'
      or jsonb_typeof(p_scene -> 'actors') is distinct from 'array' or jsonb_typeof(p_scene -> 'items') is distinct from 'array' then
      return false;
    end if;
    v_cols := (p_scene ->> 'cols')::numeric;
    v_rows := (p_scene ->> 'rows')::numeric;
    if v_cols <> trunc(v_cols) or v_rows <> trunc(v_rows)
      or v_cols not between 3 and 10 or v_rows not between 2 and 8
      or jsonb_array_length(p_scene -> 'actors') not between 1 and 6
      or jsonb_array_length(p_scene -> 'items') > 80 then
      return false;
    end if;
    for v_entity in
      select value || jsonb_build_object('_actor', true) from jsonb_array_elements(p_scene -> 'actors')
      union all
      select value from jsonb_array_elements(p_scene -> 'items')
    loop
      if jsonb_typeof(v_entity -> 'id') is distinct from 'string'
        or jsonb_typeof(v_entity -> 'x') is distinct from 'number'
        or jsonb_typeof(v_entity -> 'y') is distinct from 'number'
        or (v_entity ->> 'x')::numeric not between 0 and v_cols - 1
        or (v_entity ->> 'y')::numeric not between 0 and v_rows - 1 then
        return false;
      end if;
      if v_entity ? '_actor' then
        if jsonb_typeof(v_entity -> 'character') is distinct from 'string' then
          return false;
        end if;
      elsif coalesce(v_entity ->> 'kind', '') not in
        ('star', 'rock', 'tree', 'water', 'flag', 'door', 'key', 'teleport', 'flower') then
        return false;
      end if;
    end loop;
    return true;
  elsif p_scene ->> 'kind' = 'free' then
    return jsonb_typeof(p_scene -> 'background') = 'string'
      and jsonb_typeof(p_scene -> 'sprites') = 'array'
      and jsonb_array_length(p_scene -> 'sprites') between 1 and 30;
  end if;
  return false;
end;
$$;

create or replace function public._valid_goals(p_goals jsonb)
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select jsonb_typeof(p_goals) = 'array'
    and jsonb_array_length(p_goals) between 1 and 10
    and not exists (
      select 1
      from jsonb_array_elements(p_goals) as goal
      where jsonb_typeof(goal) is distinct from 'object'
        or goal ->> 'kind' is null
        or goal ->> 'kind' not in (
          'collectAll', 'reach', 'say', 'varEquals', 'withinTime', 'drawShape', 'costume', 'hidden', 'manual'
        )
    );
$$;

-- Helpers (SECURITY DEFINER so policies can consult membership tables without recursion).

create or replace function public._is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.platform_roles where user_id = public._current_user_id() and role = 'admin');
$$;

create or replace function public._is_editor()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.platform_roles where user_id = public._current_user_id() and role in ('editor', 'admin'));
$$;

create or replace function public._is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.family_members where family_id = p_family_id and user_id = public._current_user_id()
  );
$$;

create or replace function public._is_family_owner(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = public._current_user_id() and role = 'owner'
  );
$$;

create or replace function public._owns_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.child_profiles c
    join public.family_members m on m.family_id = c.family_id
    where c.id = p_child_id and m.user_id = public._current_user_id()
  );
$$;

-- Platform worlds are visible when published (editors see drafts); family worlds only to the family.
create or replace function public._can_read_world(p_world_id text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.worlds w
    where w.id = p_world_id
      and (
        (w.owner_family_id is null and (w.status = 'published' or public._is_editor()))
        or (w.owner_family_id is not null and public._is_family_member(w.owner_family_id))
      )
  );
$$;

create or replace function public._can_edit_world(p_world_id text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.worlds w
    where w.id = p_world_id
      and (
        (w.owner_family_id is null and public._is_editor())
        or (w.owner_family_id is not null and public._is_family_member(w.owner_family_id))
      )
  );
$$;

revoke execute on function public._is_admin(), public._is_editor(), public._is_family_member(uuid),
  public._is_family_owner(uuid), public._owns_child(uuid), public._can_read_world(text),
  public._can_edit_world(text) from public;
grant execute on function public._is_admin(), public._is_editor(), public._is_family_member(uuid),
  public._is_family_owner(uuid), public._owns_child(uuid), public._can_read_world(text),
  public._can_edit_world(text) to stepkids_app;
