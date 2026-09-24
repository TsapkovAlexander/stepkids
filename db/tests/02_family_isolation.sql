-- Families see only their own children, progress, projects, assets and recordings.
begin;

select tests.remember('alice', tests.create_user('alice@example.com'));
select tests.remember('bob', tests.create_user('bob@example.com'));
select tests.remember('editor', tests.create_user('editor@example.com'));
insert into public.platform_roles (user_id, role) values (tests.id('editor'), 'editor');

-- Alice: family, child, attempt, project, family asset and a voice override.
set local role stepkids_app;
select tests.login('alice');
select tests.remember('fam_a', public.ensure_family('Семья Алисы'));
do $$ begin
  assert public.ensure_family('другое имя') = tests.id('fam_a'), 'ensure_family is idempotent';
end $$;
insert into public.child_profiles (family_id, name) values (tests.id('fam_a'), 'Маша');
select tests.remember('masha', (select id from public.child_profiles where name = 'Маша'));
insert into public.attempts (client_id, child_id, level_id, level_version, program, result, stars, hints_used, duration_ms)
values (gen_random_uuid(), tests.id('masha'), 'meadow-01', 1, '{"v":1,"targets":[]}', '{"success":true}', 3, 0, 4200);
insert into public.projects (child_id, title, scene, program)
values (tests.id('masha'), 'Мой сад',
  '{"kind":"grid","cols":6,"rows":4,"actors":[{"id":"hero","character":"kitten","x":0,"y":0}],"items":[]}',
  '{"v":1,"targets":[]}');
insert into public.assets (kind, bucket, storage_path, owner_family_id)
values ('voice', 'family', tests.id('fam_a')::text || '/voice/one.webm', tests.id('fam_a'));
do $$ begin
  begin
    insert into public.voice_lines (key, text) values ('x', 'y');
    raise exception 'a family added a platform voice line';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
insert into public.voice_lines (key, text) values ('task.meadow-01', 'Помоги котёнку дойти до флажка!');
set local role stepkids_app;
select tests.login('alice');
insert into public.voice_overrides (family_id, voice_line_id, asset_id)
select tests.id('fam_a'), v.id, a.id
from public.voice_lines v, public.assets a
where v.key = 'task.meadow-01' and a.owner_family_id = tests.id('fam_a');

do $$ begin
  assert (select count(*) from public.child_profiles) = 1, 'alice sees her child';
  assert (select best_stars from public.level_progress where child_id = tests.id('masha') and level_id = 'meadow-01') = 3,
    'progress is derived from attempts';
  assert (select count(*) from public.voice_overrides) = 1, 'alice sees her override';
end $$;
reset role;

-- Bob: his own family sees nothing of Alice's.
set local role stepkids_app;
select tests.login('bob');
select tests.remember('fam_b', public.ensure_family('Семья Боба'));
do $$
declare
  v_rows integer;
begin
  assert tests.id('fam_b') <> tests.id('fam_a'), 'bob gets his own family';
  assert (select count(*) from public.families) = 1, 'bob sees only his family';
  assert (select count(*) from public.family_members) = 1, 'bob sees only his membership';
  assert (select count(*) from public.child_profiles) = 0, 'bob does not see alice''s child';
  assert (select count(*) from public.attempts) = 0, 'bob does not see attempts';
  assert (select count(*) from public.level_progress) = 0, 'bob does not see progress';
  assert (select count(*) from public.projects) = 0, 'bob does not see projects';
  assert (select count(*) from public.assets where owner_family_id is not null) = 0, 'bob does not see family assets';
  assert (select count(*) from public.voice_overrides) = 0, 'bob does not see overrides';

  update public.child_profiles set name = 'Взлом' where id = tests.id('masha');
  get diagnostics v_rows = row_count;
  assert v_rows = 0, 'bob cannot rename alice''s child';
  delete from public.projects;
  get diagnostics v_rows = row_count;
  assert v_rows = 0, 'bob cannot delete alice''s projects';

  begin
    insert into public.child_profiles (family_id, name) values (tests.id('fam_a'), 'Подкидыш');
    raise exception 'bob added a child to alice''s family';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.attempts (client_id, child_id, level_id, level_version, program, result, stars)
    values (gen_random_uuid(), tests.id('masha'), 'meadow-01', 1, '{"v":1,"targets":[]}', '{}', 3);
    raise exception 'bob recorded an attempt for alice''s child';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.assets (kind, bucket, storage_path, owner_family_id)
    values ('voice', 'family', tests.id('fam_a')::text || '/voice/evil.webm', tests.id('fam_a'));
    raise exception 'bob registered a file in alice''s folder';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.family_members (family_id, user_id, role) values (tests.id('fam_a'), tests.id('bob'), 'parent');
    raise exception 'bob joined alice''s family';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- The content editor manages content but never sees family data.
set local role stepkids_app;
select tests.login('editor');
do $$ begin
  assert (select count(*) from public.child_profiles) = 0, 'editor does not see children';
  assert (select count(*) from public.attempts) = 0, 'editor does not see attempts';
  assert (select count(*) from public.projects) = 0, 'editor does not see projects';
  assert (select count(*) from public.voice_overrides) = 0, 'editor does not see overrides';
  assert (select count(*) from public.assets where owner_family_id is not null) = 0, 'editor does not see family files';
end $$;
reset role;

-- Requests without a signed-in user see nothing at all.
set local role stepkids_app;
select tests.logout();
do $$ begin
  -- Published platform content is public; everything else is not.
  assert (select count(*) from public.worlds where owner_family_id is not null or status <> 'published') = 0,
    'no user: only published platform worlds';
  assert (select count(*) from public.families) = 0, 'no user: no families';
  assert (select count(*) from public.attempts) = 0, 'no user: no attempts';
  assert (select count(*) from public.child_profiles) = 0, 'no user: no children';
  begin
    perform public.ensure_family('x');
    raise exception 'a family was created without a user';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- A second parent in Alice's family sees the same child; the last owner cannot leave.
select tests.remember('dad', tests.create_user('dad@example.com'));
set local role stepkids_app;
select tests.login('alice');
insert into public.family_members (family_id, user_id, role) values (tests.id('fam_a'), tests.id('dad'), 'parent');
do $$
declare
  v_rows integer;
begin
  delete from public.family_members where user_id = tests.id('alice');
  get diagnostics v_rows = row_count;
  assert v_rows = 0, 'owners are not removed through the API';
end $$;
select tests.login('dad');
do $$ begin
  assert (select count(*) from public.child_profiles) = 1, 'second parent sees the child';
end $$;
reset role;

do $$ begin
  begin
    delete from public.family_members where user_id = tests.id('alice');
    raise exception 'the last owner was removed';
  exception when check_violation then null;
  end;
end $$;

rollback;
