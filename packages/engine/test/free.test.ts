import { describe, expect, it, vi } from 'vitest';
import { defaultCatalog, type BlockNode, type Primitive, type ProgramDoc } from '@stepkids/blocks';
import { checkLevel } from '../src/check';
import { compare, toBool, toNumber } from '../src/interpreter/primitives-advanced';
import { LevelRun, runHeadless, type RunnableLevel } from '../src/run';
import { Runtime } from '../src/runtime';
import { FreeWorld, HALF_H, HALF_W } from '../src/world/free-world';

const b = (
  type: string,
  args: Record<string, Primitive | BlockNode> = {},
  stacks?: Record<string, BlockNode[]>,
): BlockNode => {
  const node = defaultCatalog.create(type);
  node.args = { ...node.args, ...args };
  if (stacks) node.stacks = stacks;
  return node;
};

const scene = (sprites = [{ id: 'cat', character: 'kitten', x: 0, y: 0 }]) => ({
  kind: 'free' as const,
  background: 'park',
  sprites,
});

function program(scripts: Record<string, BlockNode[][]>): ProgramDoc {
  return {
    v: 1,
    targets: Object.entries(scripts).map(([target, list]) => ({
      target,
      scripts: list.map((blocks, index) => ({ id: `${target}-${index}`, blocks })),
    })),
  };
}

function run(
  scripts: Record<string, BlockNode[][]>,
  sprites?: Parameters<typeof scene>[0],
  options: ConstructorParameters<typeof Runtime>[2] = {},
) {
  const world = new FreeWorld(scene(sprites));
  const runtime = new Runtime(world, program(scripts), options);
  runtime.start();
  for (let i = 0; i < 3000 && runtime.status === 'running' && !runtime.isIdle(); i += 1)
    runtime.tick(1000 / 60);
  return { world, runtime };
}

const start = () => b('event_start');

describe('conversions', () => {
  it('follow Scratch rules', () => {
    expect(toNumber('3,5')).toBe(3.5);
    expect(toNumber('abc')).toBe(0);
    expect(toNumber(true)).toBe(1);
    expect(toNumber(Number.NaN)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toBool('false')).toBe(false);
    expect(toBool('0')).toBe(false);
    expect(toBool('')).toBe(false);
    expect(toBool('да')).toBe(true);
    expect(toBool(2)).toBe(true);
    expect(toBool(false)).toBe(false);
    expect(compare('10', 9)).toBeGreaterThan(0);
    expect(compare('Ёж', 'ёж')).toBe(0);
    expect(compare('a', 'b')).toBeLessThan(0);
    expect(compare(true, 'true')).toBe(0);
  });
});

describe('FreeWorld', () => {
  it('moves, turns and clamps to the stage', () => {
    const world = new FreeWorld(scene());
    world.moveSteps('cat', 50);
    expect(world.actor('cat').x).toBeCloseTo(50);
    world.turn('cat', -90);
    world.moveSteps('cat', 30);
    expect(world.actor('cat').y).toBeCloseTo(30);
    world.goTo('cat', 1000, -1000);
    expect(world.actor('cat')).toMatchObject({ x: HALF_W, y: -HALF_H });
    world.pointIn('cat', 270);
    expect(world.actor('cat').direction).toBe(-90);
    world.turn('cat', -90);
    expect(world.actor('cat').direction).toBe(180);
    world.changeBy('cat', -10, 10);
    expect(world.actor('cat').x).toBe(HALF_W - 10);
  });

  it('glides with interpolated poses', () => {
    const world = new FreeWorld(scene());
    world.beginGlide('cat', 100, 50, 0, 1000);
    expect(world.pose('cat', 500)).toMatchObject({ x: 50, y: 25 });
    world.finishGlide('cat');
    world.finishGlide('cat');
    expect(world.actor('cat')).toMatchObject({ x: 100, y: 50, glide: null });
  });

  it('bounces off edges', () => {
    const world = new FreeWorld(scene());
    world.goTo('cat', HALF_W, 0);
    world.bounceOnEdge('cat');
    expect(world.actor('cat').direction).toBe(-90);
    world.goTo('cat', 0, HALF_H);
    world.pointIn('cat', 0);
    world.bounceOnEdge('cat');
    expect(world.actor('cat').direction).toBe(180);
  });

  it('detects touches, distances, clones and layers', () => {
    const world = new FreeWorld(
      scene([
        { id: 'cat', character: 'kitten', x: 0, y: 0 },
        { id: 'ball', character: 'ball', x: 40, y: 0 },
      ]),
    );
    expect(world.touching('cat', 'ball', 0)).toBe(true);
    expect(world.distance('cat', 'ball', 0)).toBe(40);
    expect(world.distance('cat', 'nobody', 0)).toBe(0);
    world.goTo('ball', 230, 100);
    expect(world.touching('cat', 'ball', 0)).toBe(false);
    expect(world.touching('ball', 'edge', 0)).toBe(true);
    world.setVisible('cat', false);
    expect(world.touching('cat', 'edge', 0)).toBe(false);
    const clone = world.clone('ball');
    expect(world.clone(clone)).toBe('ball#2');
    expect(world.cloneTotal()).toBe(2);
    expect(world.deleteClone('ball')).toBe(false);
    expect(world.deleteClone(clone)).toBe(true);
    world.bringToFront('cat');
    expect(world.actor('cat').layer).toBeGreaterThan(world.actor('ball').layer);
    world.setSize('cat', 1000);
    expect(world.actor('cat').size).toBe(500);
    expect(() => world.actor('ghost')).toThrow();
    expect(world.totalBumps()).toBe(0);
    expect(world.drainTouches()).toEqual([]);
  });

  it('speaks and switches costumes', () => {
    const world = new FreeWorld(scene(), { costumes: () => ['default', 'party'] });
    world.say('cat', 'Мяу', 5);
    world.endSay('cat', 10);
    world.endSay('nobody', 10);
    expect(world.said).toEqual([{ actorId: 'cat', text: 'Мяу', time: 5 }]);
    world.setCostume('cat', 'next');
    expect(world.actor('cat').costume).toBe('party');
    world.setCostume('cat', 'default');
    world.setCostume('cat', 'nope');
    expect(world.actor('cat').costume).toBe('default');
    world.markStopped('cat');
    expect(world.actor('cat').stopped).toBe(true);
  });
});

describe('advanced blocks', () => {
  it('loops with conditions and variables', () => {
    const { runtime } = run({
      cat: [
        [
          start(),
          b('data_set', { var: 'счёт', value: 0 }),
          b(
            'control_while',
            { cond: b('op_lt', { a: b('data_var', { var: 'счёт' }), b: 5 }) },
            { DO: [b('data_change', { var: 'счёт', by: 1 })] },
          ),
          b(
            'control_if_else',
            { cond: b('op_eq', { a: b('data_var', { var: 'счёт' }), b: 5 }) },
            {
              THEN: [b('data_set', { var: 'итог', value: 'да' })],
              ELSE: [b('data_set', { var: 'итог', value: 'нет' })],
            },
          ),
          b(
            'control_if',
            { cond: b('op_gt', { a: 1, b: 2 }) },
            { THEN: [b('data_set', { var: 'итог', value: 'ошибка' })] },
          ),
        ],
      ],
    });
    expect(runtime.getVariable('счёт')).toBe(5);
    expect(runtime.getVariable('итог')).toBe('да');
    expect(runtime.getVariable('нет такой')).toBe(0);
  });

  it('computes arithmetic, logic, text and random numbers', () => {
    const set = (name: string, value: BlockNode) => b('data_set', { var: name, value });
    const { runtime } = run({
      cat: [
        [
          start(),
          set('a', b('op_add', { a: 2, b: 3 })),
          set('s', b('op_sub', { a: 2, b: 3 })),
          set('m', b('op_mul', { a: 2, b: 3 })),
          set('d', b('op_div', { a: 3, b: 2 })),
          set('z', b('op_div', { a: 3, b: 0 })),
          set('and', b('op_and', { a: true, b: b('op_not', { a: false }) })),
          set('or', b('op_or', { a: false, b: false })),
          set('join', b('op_join', { a: 'При', b: 'вет' })),
          set('r', b('op_random', { from: 1, to: 6 })),
          set('f', b('op_random', { from: 0.5, to: 1 })),
        ],
      ],
    });
    expect(Object.fromEntries(runtime.variables)).toMatchObject({
      a: 5,
      s: -1,
      m: 6,
      d: 1.5,
      z: 0,
      and: true,
      or: false,
      join: 'Привет',
    });
    expect(runtime.getVariable('r')).toBeGreaterThanOrEqual(1);
    expect(runtime.getVariable('r')).toBeLessThanOrEqual(6);
    expect(Number.isInteger(runtime.getVariable('r'))).toBe(true);
    expect(runtime.getVariable('f')).toBeGreaterThanOrEqual(0.5);
    const again = run(
      { cat: [[start(), set('r', b('op_random', { from: 1, to: 1000 }))]] },
      undefined,
      { seed: 7 },
    );
    const twice = run(
      { cat: [[start(), set('r', b('op_random', { from: 1, to: 1000 }))]] },
      undefined,
      { seed: 7 },
    );
    expect(again.runtime.getVariable('r')).toBe(twice.runtime.getVariable('r'));
  });

  it('moves sprites in the free scene', () => {
    const { world, runtime } = run({
      cat: [
        [
          start(),
          b('motion_goto', { x: 10, y: 20 }),
          b('motion_point', { direction: 90 }),
          b('motion_move', { steps: 30 }),
          b('motion_turn_cw', { degrees: 90 }),
          b('motion_turn_ccw', { degrees: 45 }),
          b('motion_change_x', { dx: 5 }),
          b('motion_change_y', { dy: -5 }),
          b('looks_size', { size: 150 }),
          b('looks_size_change', { by: -50 }),
          b('looks_front'),
          b('data_set', { var: 'x', value: b('motion_x') }),
          b('data_set', { var: 'y', value: b('motion_y') }),
          b('data_set', { var: 'dir', value: b('motion_direction') }),
          b('motion_glide', { seconds: 0.5, x: -100, y: -100 }),
          b('motion_goto', { x: 235, y: 0 }),
          b('motion_bounce'),
        ],
      ],
    });
    expect(Object.fromEntries(runtime.variables)).toMatchObject({ x: 45, y: 15, dir: 135 });
    expect(world.actor('cat')).toMatchObject({ size: 100, direction: -135 });
    expect(runtime.now).toBeGreaterThanOrEqual(500);
  });

  it('senses touching, distance, timer and answers', () => {
    const { runtime } = run(
      {
        cat: [
          [
            start(),
            b('data_set', { var: 't', value: b('sensing_touching', { target: 'ball' }) }),
            b('data_set', { var: 'e', value: b('sensing_touching', { target: 'edge' }) }),
            b('data_set', { var: 'd', value: b('sensing_distance', { target: 'ball' }) }),
            b('control_wait', { seconds: 1 }),
            b('data_set', { var: 'timer', value: b('sensing_timer') }),
            b('sensing_reset_timer'),
            b('sensing_ask', { question: 'Как тебя зовут?' }),
            b('data_set', { var: 'answer', value: b('sensing_answer') }),
            b('looks_say_for', {
              text: b('op_join', { a: 'Привет, ', b: b('sensing_answer') }),
              seconds: 0.5,
            }),
          ],
        ],
      },
      [
        { id: 'cat', character: 'kitten', x: 0, y: 0 },
        { id: 'ball', character: 'ball', x: 30, y: 40 },
      ],
      { answers: ['Маша'] },
    );
    expect(Object.fromEntries(runtime.variables)).toMatchObject({
      t: true,
      e: false,
      d: 50,
      answer: 'Маша',
    });
    expect(runtime.getVariable('timer')).toBeGreaterThanOrEqual(1);
    expect(runtime.world.said.map((entry) => entry.text)).toEqual([
      'Как тебя зовут?',
      'Привет, Маша',
    ]);
  });

  it('waits for the host to answer a question', () => {
    const ask = vi.fn();
    const world = new FreeWorld(scene());
    const runtime = new Runtime(
      world,
      program({
        cat: [
          [
            start(),
            b('sensing_ask', { question: '?' }),
            b('data_set', { var: 'x', value: b('sensing_answer') }),
          ],
        ],
      }),
      { ask },
    );
    const asked = vi.fn();
    runtime.events.on('ask', asked);
    runtime.start();
    for (let i = 0; i < 30; i += 1) runtime.tick(16);
    expect(ask).toHaveBeenCalledWith({ actorId: 'cat', text: '?' });
    expect(asked).toHaveBeenCalled();
    expect(runtime.isIdle()).toBe(false);
    runtime.submitAnswer('42');
    for (let i = 0; i < 3; i += 1) runtime.tick(16);
    expect(runtime.getVariable('x')).toBe('42');
  });

  it('broadcasts messages and reacts to keys', () => {
    const { runtime } = run(
      {
        cat: [
          [start(), b('event_broadcast', { message: 'go' })],
          [b('event_message', { message: 'go' }), b('data_set', { var: 'got', value: 'cat' })],
        ],
        ball: [
          [b('event_message', { message: 'go' }), b('data_set', { var: 'ball', value: 'yes' })],
          [b('event_message', { message: 'other' }), b('data_set', { var: 'wrong', value: 1 })],
        ],
      },
      [
        { id: 'cat', character: 'kitten', x: 0, y: 0 },
        { id: 'ball', character: 'ball', x: 100, y: 0 },
      ],
    );
    expect(Object.fromEntries(runtime.variables)).toEqual({ got: 'cat', ball: 'yes' });
    const keys = new Runtime(
      new FreeWorld(scene()),
      program({
        cat: [
          [b('event_key', { key: 'left' }), b('data_change', { var: 'n', by: 1 })],
          [b('event_key', { key: 'any' }), b('data_change', { var: 'any', by: 1 })],
        ],
      }),
    );
    keys.keyPress('left');
    keys.start();
    expect(keys.hasInteractiveHats()).toBe(true);
    keys.keyPress('left');
    keys.tick(16);
    keys.keyPress('space');
    keys.tick(16);
    expect(Object.fromEntries(keys.variables)).toEqual({ n: 1, any: 2 });
    keys.broadcast('late');
  });

  it('runs custom blocks with parameters and recursion limits', () => {
    const define = b('procedures_define', { name: 'шаги', params: 'n, m' });
    const { runtime } = run({
      cat: [
        [
          start(),
          b('procedures_call', { name: 'шаги', arg0: 3, arg1: 4 }),
          b('procedures_call', { name: 'нет такого' }),
        ],
        [
          define,
          b('data_set', {
            var: 'sum',
            value: b('op_add', {
              a: b('procedures_param', { name: 'n' }),
              b: b('procedures_param', { name: 'm' }),
            }),
          }),
          b('data_set', { var: 'none', value: b('procedures_param', { name: 'zzz' }) }),
        ],
      ],
    });
    expect(runtime.getVariable('sum')).toBe(7);
    expect(runtime.getVariable('none')).toBe(0);

    const loop = b('procedures_define', { name: 'снова', params: '' });
    const deep = run({
      cat: [
        [start(), b('procedures_call', { name: 'снова' })],
        [loop, b('procedures_call', { name: 'снова' })],
      ],
    });
    expect(deep.runtime.error?.code).toBe('too_many_steps');
  });

  it('manages lists', () => {
    const { runtime } = run({
      cat: [
        [
          start(),
          b('list_add', { list: 'фрукты', item: 'яблоко' }),
          b('list_add', { list: 'фрукты', item: 'груша' }),
          b('list_add', { list: 'фрукты', item: 'слива' }),
          b('list_delete', { list: 'фрукты', index: 2 }),
          b('list_delete', { list: 'фрукты', index: 9 }),
          b('data_set', { var: 'len', value: b('list_length', { list: 'фрукты' }) }),
          b('data_set', { var: 'second', value: b('list_item', { list: 'фрукты', index: 2 }) }),
          b('data_set', { var: 'missing', value: b('list_item', { list: 'фрукты', index: 5 }) }),
          b('data_set', {
            var: 'has',
            value: b('list_contains', { list: 'фрукты', item: 'Яблоко' }),
          }),
          b('list_clear', { list: 'пусто' }),
        ],
      ],
    });
    expect(Object.fromEntries(runtime.variables)).toMatchObject({
      len: 2,
      second: 'слива',
      missing: '',
      has: true,
    });
    expect(runtime.list('фрукты')).toEqual(['яблоко', 'слива']);
  });

  it('creates and deletes clones', () => {
    const { world, runtime } = run({
      cat: [
        [start(), b('control_repeat', { times: 3 }, { DO: [b('control_create_clone')] })],
        [
          b('event_clone_start'),
          b('motion_change_x', { dx: 50 }),
          b('data_change', { var: 'clones', by: 1 }),
          b('control_delete_clone'),
        ],
      ],
    });
    expect(runtime.getVariable('clones')).toBe(3);
    expect(world.cloneTotal()).toBe(0);
    const many = run(
      { cat: [[start(), b('control_forever', {}, { DO: [b('control_create_clone')] })]] },
      undefined,
      { limits: { maxClones: 5 } },
    );
    expect(many.runtime.error?.code).toBe('too_many_clones');
  });

  it('stops everything or just the script', () => {
    const { runtime } = run({
      cat: [
        [start(), b('control_wait', { seconds: 0.2 }), b('control_stop', { what: 'all' })],
        [start(), b('control_forever', {}, { DO: [b('data_change', { var: 'n', by: 1 })] })],
        [start(), b('control_stop', { what: 'this' }), b('data_set', { var: 'after', value: 1 })],
      ],
    });
    expect(runtime.isIdle()).toBe(true);
    expect(runtime.getVariable('after')).toBe(0);
  });

  it('refuses grid-only and free-only blocks in the wrong scene', () => {
    const { runtime } = run({ cat: [[start(), b('motion_right', { count: 1 })]] });
    expect(runtime.error?.code).toBe('unsupported_scene');
  });
});

describe('free scene levels', () => {
  const level = (goals: RunnableLevel['goals']): RunnableLevel => ({
    scene: scene([
      { id: 'rocket', character: 'rocket', x: -200, y: 0 },
      { id: 'planet', character: 'planet', x: 150, y: 0 },
    ]),
    goals,
    stars: { three: { maxBlocks: 3 } },
  });

  it('reaches a planet and counts a variable', () => {
    const fly = program({
      rocket: [
        [
          start(),
          b('motion_glide', { seconds: 1, x: 150, y: 0 }),
          b('data_set', { var: 'fuel', value: 3 }),
        ],
      ],
    });
    const result = runHeadless(
      level([
        { kind: 'touching', target: 'planet' },
        { kind: 'varEquals', variable: 'fuel', value: 3 },
      ]),
      fly,
    );
    expect(result).toMatchObject({ success: true, stars: 3, blocks: 2 });
    const miss = runHeadless(
      level([{ kind: 'touching', target: 'planet' }]),
      program({ rocket: [[start(), b('motion_move', { steps: 10 })]] }),
    );
    expect(miss.goals[0]?.detail).toBe('notTouching');
    const grid = runHeadless(level([{ kind: 'collectAll' }, { kind: 'reach', x: 0, y: 0 }]), fly);
    expect(grid.goals.map((goal) => goal.met)).toEqual([true, false]);
  });

  it('replays keys for key-driven levels', () => {
    const keysProgram = program({
      rocket: [[b('event_key', { key: 'right' }), b('motion_change_x', { dx: 175 })]],
    });
    const goals = level([{ kind: 'touching', target: 'planet' }]);
    expect(
      runHeadless(goals, keysProgram, {
        inputs: [
          { atMs: 100, key: 'right' },
          { atMs: 300, key: 'right' },
        ],
      }).success,
    ).toBe(true);
    const run2 = new LevelRun(goals, keysProgram);
    expect(run2.world.kind).toBe('free');
  });

  it('checks free levels in the backoffice', () => {
    const check = checkLevel({
      schemaVersion: 1,
      kind: 'reach',
      tier: 3,
      taskText: 'Долети до планеты',
      scene: {
        kind: 'free',
        background: 'space',
        sprites: [
          { id: 'rocket', character: 'rocket', x: -200, y: 0, direction: 90, size: 100 },
          { id: 'planet', character: 'planet', x: 150, y: 0, direction: 90, size: 100 },
        ],
      },
      allowedBlocks: ['motion_glide'],
      goals: [{ kind: 'touching', target: 'planet', actor: 'rocket' }],
      stars: {},
      hints: [],
      reference: program({ rocket: [[start(), b('motion_glide', { seconds: 1, x: 150, y: 0 })]] }),
    });
    expect(check.problems).toEqual([]);
    expect(check.ok).toBe(true);
  });
});
