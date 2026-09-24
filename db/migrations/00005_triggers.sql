-- Migration: 00005_triggers
-- Date: 2026-09-24
-- Affects: function, trigger
-- -------------------------------------------------------

create or replace function public._touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_families_touch_updated_at before update on public.families
  for each row execute function public._touch_updated_at();
create trigger trg_child_profiles_touch_updated_at before update on public.child_profiles
  for each row execute function public._touch_updated_at();
create trigger trg_worlds_touch_updated_at before update on public.worlds
  for each row execute function public._touch_updated_at();
create trigger trg_levels_touch_updated_at before update on public.levels
  for each row execute function public._touch_updated_at();
create trigger trg_block_types_touch_updated_at before update on public.block_types
  for each row execute function public._touch_updated_at();
create trigger trg_characters_touch_updated_at before update on public.characters
  for each row execute function public._touch_updated_at();
create trigger trg_voice_lines_touch_updated_at before update on public.voice_lines
  for each row execute function public._touch_updated_at();
create trigger trg_projects_touch_updated_at before update on public.projects
  for each row execute function public._touch_updated_at();

-- Level versions are immutable: edits create a new version, progress stays attached to the old one.
create or replace function public._forbid_level_version_update()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  raise exception 'level versions are immutable; create a new version instead'
    using errcode = 'check_violation';
end;
$$;

create trigger trg_level_versions_immutable before update on public.level_versions
  for each row execute function public._forbid_level_version_update();

-- A level can be published only with a current version whose reference solution passed the check.
create or replace function public._guard_level_publish()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_check jsonb;
  v_manual boolean;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published'
      or old.current_version is distinct from new.current_version) then
    if new.current_version is null then
      raise exception 'cannot publish a level without a version' using errcode = 'check_violation';
    end if;
    select v.check_result,
           exists (select 1 from jsonb_array_elements(v.goals) g where g ->> 'kind' = 'manual')
      into v_check, v_manual
      from public.level_versions v
      where v.level_id = new.id and v.version = new.current_version;
    if not v_manual and coalesce((v_check ->> 'ok')::boolean, false) is not true then
      raise exception 'cannot publish: the reference solution has not passed the check'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_levels_guard_publish before insert or update on public.levels
  for each row execute function public._guard_level_publish();

-- level_progress is derived from attempts: best stars, first solve time, counters.
create or replace function public._apply_attempt_to_progress()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.level_progress as p
    (child_id, level_id, best_stars, solved_at, attempts_count, hints_used, last_attempt_at)
  values (
    new.child_id,
    new.level_id,
    new.stars,
    case when new.stars > 0 then new.created_at end,
    1,
    new.hints_used,
    new.created_at
  )
  on conflict (child_id, level_id) do update set
    best_stars = greatest(p.best_stars, excluded.best_stars),
    solved_at = coalesce(p.solved_at, excluded.solved_at),
    attempts_count = p.attempts_count + 1,
    hints_used = greatest(p.hints_used, excluded.hints_used),
    last_attempt_at = greatest(p.last_attempt_at, excluded.last_attempt_at);
  return new;
end;
$$;

create trigger trg_attempts_apply_progress after insert on public.attempts
  for each row execute function public._apply_attempt_to_progress();

-- Never leave a family without an owner.
create or replace function public._keep_family_owner()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if old.role = 'owner' and not exists (
    select 1 from public.family_members
    where family_id = old.family_id and role = 'owner' and user_id <> old.user_id
  ) and exists (select 1 from public.families where id = old.family_id) then
    raise exception 'a family must keep at least one owner' using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger trg_family_members_keep_owner before delete on public.family_members
  for each row execute function public._keep_family_owner();
