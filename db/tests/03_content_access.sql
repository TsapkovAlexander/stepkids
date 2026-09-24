-- Content visibility, publishing rules and roles.
begin;

select tests.remember('alice', tests.create_user('alice@example.com'));
select tests.remember('bob', tests.create_user('bob@example.com'));
select tests.remember('editor', tests.create_user('editor@example.com'));
select tests.remember('admin', tests.create_user('admin@example.com'));
insert into public.platform_roles (user_id, role) values
  (tests.id('editor'), 'editor'),
  (tests.id('admin'), 'admin');

-- Editor drafts a platform world with a level.
set local role stepkids_app;
select tests.login('editor');
insert into public.worlds (id, tier_id, "order", title) values ('test-draft', 1, 9, 'Черновик');
insert into public.levels (id, world_id, "order") values ('test-draft-01', 'test-draft', 1);
insert into public.level_versions (level_id, version, kind, task_text, scene, allowed_blocks, goals, reference_solution)
values ('test-draft-01', 1, 'reach', 'Иди к флажку',
  '{"kind":"grid","cols":6,"rows":4,"actors":[{"id":"hero","character":"kitten","x":0,"y":0}],"items":[]}',
  array['motion_right'], '[{"kind":"reach","x":2,"y":0}]', '{"v":1,"targets":[]}');
update public.levels set current_version = 1 where id = 'test-draft-01';
do $$ begin
  begin
    update public.levels set status = 'published' where id = 'test-draft-01';
    raise exception 'published a level whose reference was not checked';
  exception when check_violation then null;
  end;
  update public.level_versions set task_text = 'Другое' where level_id = 'test-draft-01';
  assert not found, 'level versions have no update policy';
  begin
    insert into public.level_versions (level_id, version, kind, task_text, scene, allowed_blocks, goals)
    values ('test-draft-01', 2, 'reach', 'x', '{"kind":"grid","cols":99}', array['motion_right'], '[{"kind":"reach"}]');
    raise exception 'an invalid scene was stored';
  exception when check_violation then null;
  end;
end $$;
insert into public.level_versions (level_id, version, kind, task_text, scene, allowed_blocks, goals, reference_solution, check_result)
values ('test-draft-01', 2, 'reach', 'Иди к флажку',
  '{"kind":"grid","cols":6,"rows":4,"actors":[{"id":"hero","character":"kitten","x":0,"y":0}],"items":[]}',
  array['motion_right'], '[{"kind":"reach","x":2,"y":0}]', '{"v":1,"targets":[]}', '{"ok":true}');
update public.levels set current_version = 2, status = 'published' where id = 'test-draft-01';
reset role;
do $$ begin
  begin
    update public.level_versions set task_text = 'Другое' where level_id = 'test-draft-01';
    raise exception 'a level version was edited in place';
  exception when check_violation then null;
  end;
end $$;
set local role stepkids_app;
select tests.login('editor');
do $$ begin
  assert (select count(*) from public.worlds where id = 'test-draft') = 1, 'editor sees the draft world';
  begin
    update public.block_types set label = 'Хак' where id = 'motion_right';
    if found then
      raise exception 'editor changed the block catalog';
    end if;
  end;
end $$;
reset role;

-- Families see published platform worlds, not drafts; they cannot create platform content.
set local role stepkids_app;
select tests.login('alice');
select tests.remember('fam_a', public.ensure_family('Семья Алисы'));
do $$ begin
  assert (select count(*) from public.worlds where id in ('meadow', 'forest')) = 2, 'seed worlds are visible';
  assert (select count(*) from public.levels where world_id = 'meadow') = 10, 'seed levels are visible';
  assert (select count(*) from public.level_versions where level_id like 'meadow-%') = 10, 'seed versions are visible';
  assert (select count(*) from public.worlds where id = 'test-draft') = 0, 'draft platform world is hidden';
  assert (select count(*) from public.levels where id = 'test-draft-01') = 0, 'levels of a draft world are hidden';
  assert (select count(*) from public.block_types) >= 13, 'block catalog is readable';
  assert (select count(*) from public.characters) >= 4, 'characters are readable';
  begin
    insert into public.worlds (id, tier_id, title) values ('hack', 1, 'Взлом');
    raise exception 'a family created a platform world';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_platform_role('alice@example.com', 'admin');
    raise exception 'a family granted itself admin';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Parent world «От мамы» with a draft level: visible to the family only.
insert into public.worlds (id, tier_id, title, owner_family_id, status)
values ('from-mom', 1, 'От мамы', tests.id('fam_a'), 'published');
insert into public.levels (id, world_id, "order") values ('from-mom-01', 'from-mom', 1);
do $$ begin
  assert (select count(*) from public.worlds where id = 'from-mom') = 1, 'family sees its world';
  assert (select count(*) from public.levels where id = 'from-mom-01') = 1, 'family sees its draft level';
end $$;
reset role;

set local role stepkids_app;
select tests.login('bob');
select public.ensure_family('Семья Боба');
do $$
declare
  v_rows integer;
begin
  assert (select count(*) from public.worlds where id = 'from-mom') = 0, 'other families do not see it';
  update public.worlds set title = 'Взлом' where id = 'from-mom';
  get diagnostics v_rows = row_count;
  assert v_rows = 0, 'other families cannot edit it';
  begin
    insert into public.levels (id, world_id) values ('bob-in-mom', 'from-mom');
    raise exception 'bob added a level to alice''s world';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Admin manages roles and the block catalog.
set local role stepkids_app;
select tests.login('admin');
select public.set_platform_role('bob@example.com', 'editor');
update public.block_types set enabled = false where id = 'sound_music';
do $$ begin
  assert (select role from public.platform_roles where user_id = tests.id('bob')) = 'editor', 'role granted';
  assert (select count(*) from public.child_profiles) = 0, 'admin does not read children directly';
end $$;
select public.set_platform_role('bob@example.com', null);
reset role;

set local role stepkids_app;
select tests.login('alice');
do $$ begin
  assert not exists (select 1 from public.block_types where id = 'sound_music'), 'disabled blocks are hidden';
  assert not exists (select 1 from public.platform_roles where user_id = tests.id('bob')), 'role revoked';
end $$;
reset role;

rollback;
