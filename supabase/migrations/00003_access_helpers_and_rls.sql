-- Migration: 00003_access_helpers_and_rls
-- Date: 2026-09-24
-- Affects: function, rls
-- -------------------------------------------------------
-- Row level security: a family sees only its own profiles, progress, projects and voice
-- recordings; content editors manage platform content without access to family data;
-- administrators additionally manage block types and roles.

-- Helpers (SECURITY DEFINER so policies can consult membership tables without recursion).

create or replace function public._is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.platform_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public._is_editor()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.platform_roles where user_id = auth.uid() and role in ('editor', 'admin'));
$$;

create or replace function public._is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.family_members where family_id = p_family_id and user_id = auth.uid()
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
    where family_id = p_family_id and user_id = auth.uid() and role = 'owner'
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
    where c.id = p_child_id and m.user_id = auth.uid()
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

-- First folder of a storage path as a family id; null when it is not a uuid.
create or replace function public._family_folder(p_name text)
returns uuid
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  v_folder text := split_part(p_name, '/', 1);
begin
  if v_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_folder::uuid;
  end if;
  return null;
end;
$$;

revoke execute on function public._is_admin(), public._is_editor(), public._is_family_member(uuid),
  public._is_family_owner(uuid), public._owns_child(uuid), public._can_read_world(text),
  public._can_edit_world(text) from public, anon;
grant execute on function public._is_admin(), public._is_editor(), public._is_family_member(uuid),
  public._is_family_owner(uuid), public._owns_child(uuid), public._can_read_world(text),
  public._can_edit_world(text) to authenticated, service_role;

-- Enable RLS everywhere --------------------------------------------------------

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.platform_roles enable row level security;
alter table public.child_profiles enable row level security;
alter table public.assets enable row level security;
alter table public.tiers enable row level security;
alter table public.characters enable row level security;
alter table public.worlds enable row level security;
alter table public.levels enable row level security;
alter table public.level_versions enable row level security;
alter table public.block_types enable row level security;
alter table public.voice_lines enable row level security;
alter table public.voice_overrides enable row level security;
alter table public.attempts enable row level security;
alter table public.level_progress enable row level security;
alter table public.projects enable row level security;

-- Families ---------------------------------------------------------------------

create policy "members read their family" on public.families
  for select to authenticated using (public._is_family_member(id));
create policy "owners update their family" on public.families
  for update to authenticated using (public._is_family_owner(id)) with check (public._is_family_owner(id));

create policy "members see co-members" on public.family_members
  for select to authenticated using (public._is_family_member(family_id));
create policy "owners add parents" on public.family_members
  for insert to authenticated with check (public._is_family_owner(family_id) and role = 'parent');
create policy "owners remove parents" on public.family_members
  for delete to authenticated using (public._is_family_owner(family_id) and role = 'parent');

create policy "users see their own platform role" on public.platform_roles
  for select to authenticated using (user_id = auth.uid() or public._is_admin());
create policy "admins manage platform roles" on public.platform_roles
  for all to authenticated using (public._is_admin()) with check (public._is_admin());

create policy "family manages child profiles" on public.child_profiles
  for all to authenticated using (public._is_family_member(family_id)) with check (public._is_family_member(family_id));

-- Content ----------------------------------------------------------------------

create policy "everyone reads tiers" on public.tiers for select to authenticated using (true);
create policy "admins manage tiers" on public.tiers
  for all to authenticated using (public._is_admin()) with check (public._is_admin());

create policy "everyone reads characters" on public.characters for select to authenticated using (true);
create policy "editors manage characters" on public.characters
  for all to authenticated using (public._is_editor()) with check (public._is_editor());

create policy "everyone reads enabled block types" on public.block_types
  for select to authenticated using (enabled or public._is_editor());
create policy "admins manage block types" on public.block_types
  for all to authenticated using (public._is_admin()) with check (public._is_admin());

create policy "read visible worlds" on public.worlds
  for select to authenticated using (public._can_read_world(id));
create policy "create worlds" on public.worlds
  for insert to authenticated with check (
    (owner_family_id is null and public._is_editor())
    or (owner_family_id is not null and public._is_family_member(owner_family_id))
  );
create policy "edit worlds" on public.worlds
  for update to authenticated using (public._can_edit_world(id)) with check (
    (owner_family_id is null and public._is_editor())
    or (owner_family_id is not null and public._is_family_member(owner_family_id))
  );
create policy "delete worlds" on public.worlds
  for delete to authenticated using (public._can_edit_world(id));

create policy "read levels of visible worlds" on public.levels
  for select to authenticated using (
    public._can_read_world(world_id) and (status = 'published' or public._can_edit_world(world_id))
  );
create policy "manage levels of editable worlds" on public.levels
  for all to authenticated using (public._can_edit_world(world_id)) with check (public._can_edit_world(world_id));

create policy "read versions of readable levels" on public.level_versions
  for select to authenticated using (
    exists (
      select 1 from public.levels l
      where l.id = level_id
        and public._can_read_world(l.world_id)
        and (l.status = 'published' or public._can_edit_world(l.world_id))
    )
  );
create policy "add versions to editable levels" on public.level_versions
  for insert to authenticated with check (
    exists (select 1 from public.levels l where l.id = level_id and public._can_edit_world(l.world_id))
  );
create policy "delete versions of editable draft levels" on public.level_versions
  for delete to authenticated using (
    exists (
      select 1 from public.levels l
      where l.id = level_id and l.status = 'draft' and public._can_edit_world(l.world_id)
    )
  );

create policy "read platform or own assets" on public.assets
  for select to authenticated using (
    owner_family_id is null or public._is_family_member(owner_family_id)
  );
create policy "manage platform assets" on public.assets
  for all to authenticated using (owner_family_id is null and public._is_editor())
  with check (owner_family_id is null and public._is_editor());
create policy "manage family assets" on public.assets
  for all to authenticated using (owner_family_id is not null and public._is_family_member(owner_family_id))
  with check (owner_family_id is not null and public._is_family_member(owner_family_id));

create policy "everyone reads voice lines" on public.voice_lines for select to authenticated using (true);
create policy "editors manage voice lines" on public.voice_lines
  for all to authenticated using (public._is_editor()) with check (public._is_editor());

create policy "family manages voice overrides" on public.voice_overrides
  for all to authenticated using (public._is_family_member(family_id))
  with check (
    public._is_family_member(family_id)
    and exists (select 1 from public.assets a where a.id = asset_id and a.owner_family_id = family_id)
  );

-- Progress -------------------------------------------------------------------

create policy "family reads attempts" on public.attempts
  for select to authenticated using (public._owns_child(child_id));
create policy "family records attempts" on public.attempts
  for insert to authenticated with check (public._owns_child(child_id));

create policy "family reads progress" on public.level_progress
  for select to authenticated using (public._owns_child(child_id));

create policy "family manages projects" on public.projects
  for all to authenticated using (public._owns_child(child_id)) with check (public._owns_child(child_id));
