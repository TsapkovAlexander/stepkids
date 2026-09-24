-- Migration: 00007_goal_kinds_costume_hidden
-- Date: 2026-09-24
-- Affects: function
-- -------------------------------------------------------
-- Tier 2 goals: the actor wears a costume / is hidden when the program ends.

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
