-- Migration: 00002_core_schema
-- Date: 2026-09-24
-- Affects: table
-- -------------------------------------------------------
-- Core data model of «Шаг за шагом». Scenes, programs and goals are JSONB with a schema
-- version inside; everything else is relational. Content ids (worlds, levels, block types,
-- characters) are text so worlds can be exported/imported between environments as JSON.

create type public.family_role as enum ('owner', 'parent');
create type public.platform_role as enum ('editor', 'admin');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.scene_mode as enum ('grid', 'free');
create type public.editor_mode as enum ('ribbon', 'blocks');
create type public.asset_kind as enum ('image', 'sound', 'voice', 'drawing', 'thumbnail');

-- Families -------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  -- { dailyLimitMinutes: int|null, pin: {hash, salt, iterations}|null, cloudVoice: bool }
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.family_role not null default 'parent',
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_idx on public.family_members (user_id);

create table public.platform_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.platform_role not null,
  granted_at timestamptz not null default now()
);

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  avatar_id text not null default 'kitten' check (char_length(avatar_id) <= 40),
  hero_id text not null default 'kitten' check (char_length(hero_id) <= 40),
  current_tier smallint not null default 1 check (current_tier between 1 and 4),
  -- { tiers: [1], worlds: ["meadow"] } — manual unlocks by a parent
  unlocked jsonb not null default '{"tiers": [1], "worlds": []}'::jsonb check (jsonb_typeof(unlocked) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index child_profiles_family_idx on public.child_profiles (family_id);

-- Content --------------------------------------------------------------------

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  kind public.asset_kind not null,
  bucket text not null check (bucket in ('content', 'family')),
  storage_path text not null check (char_length(storage_path) between 1 and 300),
  owner_family_id uuid references public.families (id) on delete cascade,
  meta jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, storage_path),
  -- Family files live in the private bucket under the family folder.
  check (
    (owner_family_id is null and bucket = 'content')
    or (owner_family_id is not null and bucket = 'family' and storage_path like owner_family_id::text || '/%')
  )
);
create index assets_family_idx on public.assets (owner_family_id);

create table public.tiers (
  id smallint primary key check (id between 1 and 4),
  "order" smallint not null,
  title text not null,
  scene_mode public.scene_mode not null,
  editor_mode public.editor_mode not null,
  unlock_share numeric(3, 2) not null default 0.8 check (unlock_share between 0 and 1)
);

create table public.characters (
  id text primary key check (id ~ '^[a-z][a-z0-9_-]{1,39}$'),
  name text not null check (char_length(name) between 1 and 40),
  role text not null default 'hero' check (role in ('hero', 'npc')),
  costumes jsonb not null default '[]'::jsonb check (jsonb_typeof(costumes) = 'array'),
  voice_profile jsonb not null default '{}'::jsonb,
  unlock_rule jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.worlds (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{1,59}$'),
  tier_id smallint not null references public.tiers (id),
  "order" integer not null default 0,
  title text not null check (char_length(title) between 1 and 40),
  voice_text text check (char_length(voice_text) <= 160),
  island text not null default 'meadow',
  cover_asset_id uuid references public.assets (id) on delete set null,
  unlock_rule jsonb not null default '{}'::jsonb check (jsonb_typeof(unlock_rule) = 'object'),
  reward jsonb not null default '{}'::jsonb check (jsonb_typeof(reward) = 'object'),
  -- null = platform content; otherwise a parent's own world («От папы»)
  owner_family_id uuid references public.families (id) on delete cascade,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index worlds_tier_idx on public.worlds (tier_id, "order");
create index worlds_family_idx on public.worlds (owner_family_id);

create table public.levels (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{1,59}$'),
  world_id text not null references public.worlds (id) on delete cascade,
  "order" integer not null default 0,
  status public.content_status not null default 'draft',
  current_version integer,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index levels_world_idx on public.levels (world_id, "order");

-- Immutable versions: editing a published level creates a new version; progress is tied to it.
create table public.level_versions (
  level_id text not null references public.levels (id) on delete cascade,
  version integer not null check (version > 0),
  kind text not null check (kind in ('reach', 'collect', 'fix', 'shorten', 'draw', 'free')),
  task_text text not null check (char_length(task_text) between 1 and 400),
  task_audio_id uuid references public.assets (id) on delete set null,
  scene jsonb not null check (public._valid_scene(scene)),
  allowed_blocks text[] not null check (cardinality(allowed_blocks) > 0),
  block_limit integer check (block_limit between 1 and 200),
  starter_program jsonb check (starter_program is null or public._valid_program(starter_program)),
  goals jsonb not null check (public._valid_goals(goals)),
  stars_rule jsonb not null default '{}'::jsonb check (jsonb_typeof(stars_rule) = 'object'),
  hints jsonb not null default '[]'::jsonb check (jsonb_typeof(hints) = 'array' and jsonb_array_length(hints) <= 3),
  reference_solution jsonb check (reference_solution is null or public._valid_program(reference_solution)),
  -- Result of the headless pass check computed by the server: { ok, blocks, steps, stars, problems }
  check_result jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (level_id, version)
);

alter table public.levels
  add constraint levels_current_version_fk
  foreign key (id, current_version) references public.level_versions (level_id, version)
  deferrable initially deferred;

create table public.block_types (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,59}$'),
  category text not null check (
    category in ('events', 'motion', 'looks', 'sound', 'control', 'sensing', 'operators', 'data', 'myblocks')
  ),
  tier_min smallint not null references public.tiers (id),
  label text not null check (char_length(label) between 1 and 12),
  icon text not null,
  icon_asset_id uuid references public.assets (id) on delete set null,
  voice_text text not null,
  voice_asset_id uuid references public.assets (id) on delete set null,
  shape text not null check (shape in ('hat', 'command', 'wrapper', 'cap', 'value', 'condition')),
  params_schema jsonb not null default '[]'::jsonb check (jsonb_typeof(params_schema) = 'array'),
  -- { primitive, with } — what the interpreter runs
  behavior jsonb not null check (behavior ? 'primitive'),
  codegen jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.voice_lines (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (char_length(key) between 1 and 120),
  text text not null check (char_length(text) between 1 and 400),
  character_id text references public.characters (id) on delete set null,
  asset_id uuid references public.assets (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- A parent's own recording replaces a voice line for their family only.
create table public.voice_overrides (
  family_id uuid not null references public.families (id) on delete cascade,
  voice_line_id uuid not null references public.voice_lines (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (family_id, voice_line_id)
);

-- Progress -------------------------------------------------------------------

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  -- Generated on the device; makes offline sync idempotent.
  client_id uuid not null unique,
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  level_id text not null,
  level_version integer not null,
  program jsonb not null check (public._valid_program(program)),
  -- { success, goalMet, blocks, steps, bumps, failure }
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  stars smallint not null check (stars between 0 and 3),
  hints_used smallint not null default 0 check (hints_used between 0 and 3),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  created_at timestamptz not null default now(),
  foreign key (level_id, level_version) references public.level_versions (level_id, version) on delete cascade
);
create index attempts_child_idx on public.attempts (child_id, created_at desc);
create index attempts_level_idx on public.attempts (level_id, level_version);

create table public.level_progress (
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  level_id text not null references public.levels (id) on delete cascade,
  best_stars smallint not null default 0 check (best_stars between 0 and 3),
  solved_at timestamptz,
  attempts_count integer not null default 0,
  hints_used smallint not null default 0,
  last_attempt_at timestamptz,
  primary key (child_id, level_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  title text not null default 'Мой проект' check (char_length(title) between 1 and 60),
  scene jsonb not null check (public._valid_scene(scene)),
  program jsonb not null check (public._valid_program(program)),
  thumbnail_asset_id uuid references public.assets (id) on delete set null,
  -- Set when the child sends the field to a parent as a task.
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index projects_child_idx on public.projects (child_id, updated_at desc);
