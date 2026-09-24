-- JSON validators used by CHECK constraints.
do $$
declare
  v_block jsonb := '{"id":"b1","type":"motion_right","args":{"count":3}}';
  v_program jsonb;
begin
  v_program := jsonb_build_object('v', 1, 'targets', jsonb_build_array(jsonb_build_object(
    'target', 'hero', 'scripts', jsonb_build_array(jsonb_build_object(
      'id', 's1', 'blocks', jsonb_build_array('{"id":"start","type":"event_start"}'::jsonb, v_block))))));
  assert public._valid_program(v_program), 'ribbon program is valid';
  assert public._valid_program('{"v":1,"targets":[]}'), 'empty program is valid';
  assert not public._valid_program('{"targets":[]}'), 'version is required';
  assert not public._valid_program('{"v":2,"targets":[]}'), 'unknown version';
  assert not public._valid_program('[]'), 'program must be an object';
  assert not public._valid_program(jsonb_set(v_program, '{targets,0,scripts,0,blocks,1,id}', '5')), 'block id must be a string';
  assert not public._valid_program(jsonb_set(v_program, '{targets,0,scripts,0,blocks,1,args}', '[1]')), 'args must be an object';
  assert not public._valid_program(jsonb_set(v_program, '{targets,0,scripts,0,blocks,1,args,count}', '[1]')), 'arg must be a literal or block';
  assert public._valid_program(jsonb_set(v_program, '{targets,0,scripts,0,blocks,1,args,count}',
    '{"id":"r","type":"op_random"}')), 'reporter args are blocks';
  assert not public._valid_program(jsonb_set(v_program, '{targets,0,scripts,0,blocks,1,args,count}',
    '{"type":"op_random"}')), 'reporter args are validated too';
  assert public._valid_program(jsonb_set(v_program, '{targets,0,scripts,0,blocks,1,stacks}',
    jsonb_build_object('DO', jsonb_build_array(v_block)))), 'nested stacks are valid';
  assert not public._valid_program(jsonb_set(v_program, '{targets,0,scripts,0,blocks,1,stacks}',
    '{"DO":{"id":"x"}}')), 'stacks must be arrays';
end $$;

do $$
declare
  v_scene jsonb := '{"kind":"grid","cols":6,"rows":4,"actors":[{"id":"hero","character":"kitten","x":0,"y":1}],"items":[{"id":"s","kind":"star","x":5,"y":3}]}';
begin
  assert public._valid_scene(v_scene), 'grid scene is valid';
  assert not public._valid_scene(jsonb_set(v_scene, '{cols}', '11')), 'too wide';
  assert not public._valid_scene(jsonb_set(v_scene, '{cols}', '5.5')), 'fractional size';
  assert not public._valid_scene(jsonb_set(v_scene, '{items,0,x}', '6')), 'item outside the grid';
  assert not public._valid_scene(jsonb_set(v_scene, '{items,0,kind}', '"lava"')), 'unknown item kind';
  assert not public._valid_scene(v_scene #- '{items,0,kind}'), 'item kind is required';
  assert not public._valid_scene(v_scene #- '{actors,0,character}'), 'actor character is required';
  assert not public._valid_scene(jsonb_set(v_scene, '{actors}', '[]')), 'at least one actor';
  assert not public._valid_scene('{"kind":"grid"}'), 'sizes are required';
  assert public._valid_scene('{"kind":"free","background":"park","sprites":[{"id":"a"}]}'), 'free scene';
  assert not public._valid_scene('{"kind":"space"}'), 'unknown scene kind';
end $$;

do $$
begin
  assert public._valid_goals('[{"kind":"collectAll"},{"kind":"reach","x":1,"y":2}]'), 'goals are valid';
  assert not public._valid_goals('[]'), 'at least one goal';
  assert not public._valid_goals('[{"kind":"fly"}]'), 'unknown goal';
  assert not public._valid_goals('[{"x":1}]'), 'goal kind is required';
  assert not public._valid_goals('{"kind":"reach"}'), 'goals are an array';
end $$;
