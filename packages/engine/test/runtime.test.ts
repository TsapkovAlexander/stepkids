import { describe, expect, it, vi } from 'vitest';
import { BlockCatalog, CORE_BLOCKS, type BlockDef, type ProgramDoc } from '@stepkids/blocks';
import { TIMING } from '../src/constants';
import { createCorePrimitives } from '../src/interpreter/primitives';
import { Latch } from '../src/waits';
import { block, down, ribbon, right, runUntilIdle, scene, setup, ticks } from './helpers';

describe('Runtime basics', () => {
  it('walks the hero and finishes', () => {
    const { world, runtime } = setup(ribbon(right(2), down(1)));
    const idle = vi.fn();
    runtime.events.on('idle', idle);
    runUntilIdle(runtime);
    expect(world.actor('hero')).toMatchObject({ x: 2, y: 1, dir: 'down' });
    expect(idle).toHaveBeenCalledTimes(1);
    expect(runtime.now).toBeGreaterThanOrEqual(3 * TIMING.stepMs);
    expect(runtime.now).toBeLessThan(3 * TIMING.stepMs + 100);
    expect(runtime.totalSteps).toBeGreaterThan(0);
  });

  it('reports block start and end and exposes active blocks', () => {
    const first = right(1);
    const second = down(1);
    const { runtime } = setup(ribbon(first, second));
    const started: string[] = [];
    const ended: string[] = [];
    runtime.events.on('blockStart', (event) => started.push(event.blockId));
    runtime.events.on('blockEnd', (event) => ended.push(event.blockId));
    runtime.start();
    ticks(runtime, 1);
    expect([...runtime.activeBlockIds()]).toEqual([first.id]);
    runUntilIdle(runtime);
    expect(started).toEqual([first.id, second.id]);
    expect(ended).toEqual([first.id, second.id]);
    expect(runtime.activeBlockIds().size).toBe(0);
  });

  it('emits idle right away for a program without start scripts', () => {
    const program: ProgramDoc = {
      v: 1,
      targets: [{ target: 'hero', scripts: [{ id: 's', blocks: [right()] }] }],
    };
    const { runtime } = setup(program);
    const idle = vi.fn();
    runtime.events.on('idle', idle);
    runtime.start();
    expect(idle).toHaveBeenCalledTimes(1);
    expect(runtime.isIdle()).toBe(true);
  });

  it('does nothing when ticking before start or after stop', () => {
    const { runtime, world } = setup(ribbon(right(3)));
    runtime.tick(1000);
    expect(runtime.now).toBe(0);
    runtime.start();
    runtime.start();
    ticks(runtime, 5);
    const stop = vi.fn();
    runtime.events.on('stop', stop);
    runtime.stop();
    runtime.stop();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(runtime.status).toBe('stopped');
    const x = world.actor('hero').x;
    ticks(runtime, 100);
    expect(world.actor('hero').x).toBe(x);
  });
});

describe('Runtime bumps and obstacles', () => {
  it('stops the actor on a rock and skips the remaining blocks', () => {
    const { world, runtime } = setup(
      ribbon(right(3), down(1)),
      scene({ items: [{ id: 'r', kind: 'rock', x: 2, y: 0 }] }),
    );
    const bumps: string[] = [];
    runtime.events.on('bump', (event) => bumps.push(event.reason));
    runUntilIdle(runtime);
    expect(bumps).toEqual(['rock']);
    expect(world.actor('hero')).toMatchObject({ x: 1, y: 0, stopped: true, bumps: 1 });
  });

  it('stops every script of the bumped actor but not other actors', () => {
    const program: ProgramDoc = {
      v: 1,
      targets: [
        {
          target: 'hero',
          scripts: [
            { id: 'a', blocks: [block('event_start'), block('motion_left')] },
            {
              id: 'b',
              blocks: [block('event_start'), block('control_wait', { seconds: 1 }), right(1)],
            },
          ],
        },
        { target: 'friend', scripts: [{ id: 'c', blocks: [block('event_start'), right(1)] }] },
      ],
    };
    const { world, runtime } = setup(
      program,
      scene({
        actors: [
          { id: 'hero', character: 'kitten', x: 0, y: 0 },
          { id: 'friend', character: 'bunny', x: 0, y: 2 },
        ],
      }),
    );
    runUntilIdle(runtime);
    expect(world.actor('hero').x).toBe(0);
    expect(world.actor('friend').x).toBe(1);
  });

  it('collects stars, keys and teleports on the way', () => {
    const { world, runtime } = setup(
      ribbon(right(2)),
      scene({
        items: [
          { id: 's', kind: 'star', x: 1, y: 0 },
          { id: 't1', kind: 'teleport', x: 2, y: 0, pair: 'x' },
          { id: 't2', kind: 'teleport', x: 5, y: 3, pair: 'x' },
        ],
      }),
    );
    const collected: string[] = [];
    const teleports = vi.fn();
    runtime.events.on('collect', (event) => collected.push(event.itemId));
    runtime.events.on('teleport', teleports);
    runUntilIdle(runtime);
    expect(collected).toEqual(['s']);
    expect(teleports).toHaveBeenCalledTimes(1);
    expect(world.actor('hero')).toMatchObject({ x: 5, y: 3 });
  });
});

describe('Runtime timing blocks', () => {
  it('waits the given seconds', () => {
    const { runtime } = setup(ribbon(block('control_wait', { seconds: 2 })));
    runUntilIdle(runtime);
    expect(runtime.now).toBeGreaterThanOrEqual(2000);
    expect(runtime.now).toBeLessThan(2040);
  });

  it('plays melodies', () => {
    const { runtime } = setup(ribbon(block('sound_music', { melody: 'drum' })));
    const sounds: string[] = [];
    runtime.events.on('sound', (event) => sounds.push(event.melody));
    runUntilIdle(runtime);
    expect(sounds).toEqual(['drum']);
    expect(runtime.now).toBeGreaterThanOrEqual(TIMING.melodyMs);
  });

  it('says phrases for an estimated time without host speech', () => {
    const { world, runtime } = setup(
      ribbon(block('looks_say', { text: 'Привет!' }), block('looks_say', { text: '  ' })),
    );
    const said = vi.fn();
    runtime.events.on('say', said);
    runUntilIdle(runtime);
    expect(said).toHaveBeenCalledTimes(1);
    expect(world.said.map((entry) => entry.text)).toEqual(['Привет!']);
    expect(runtime.now).toBeGreaterThanOrEqual(TIMING.sayMinMs);
    expect(world.actor('hero').bubble?.end).toBeGreaterThan(runtime.now);
  });

  it('waits for host speech to finish', () => {
    const latch = new Latch();
    const speak = vi.fn(() => latch);
    const { runtime } = setup(ribbon(block('looks_say', { text: 'Привет!' }), right(1)), scene(), {
      speak,
    });
    runtime.start();
    ticks(runtime, 180);
    expect(speak).toHaveBeenCalledWith({ actorId: 'hero', text: 'Привет!' });
    expect(runtime.activeBlockIds().size).toBe(1);
    const before = runtime.now;
    latch.resolve();
    ticks(runtime, 1);
    expect(runtime.now).toBeGreaterThan(before);
    runUntilIdle(runtime);
    expect(runtime.isIdle()).toBe(true);
  });

  it('does not hang when host speech never finishes', () => {
    const { runtime } = setup(ribbon(block('looks_say', { text: 'Ку-ку!' })), scene(), {
      speak: () => new Latch(),
    });
    runUntilIdle(runtime, 20_000);
    expect(runtime.isIdle()).toBe(true);
    expect(runtime.now).toBeLessThan(TIMING.sayMaxMs * 2);
  });
});

describe('Runtime loops and limits', () => {
  it('repeats nested blocks', () => {
    const { world, runtime } = setup(
      ribbon(block('control_repeat', { times: 3 }, { DO: [right(1)] })),
    );
    runUntilIdle(runtime);
    expect(world.actor('hero').x).toBe(3);
  });

  it('keeps "forever" responsive by yielding every iteration', () => {
    const { runtime } = setup(ribbon(block('control_forever', {}, { DO: [block('looks_show')] })));
    runtime.start();
    ticks(runtime, 120);
    expect(runtime.status).toBe('running');
    expect(runtime.isIdle()).toBe(false);
    expect(runtime.totalSteps).toBeLessThan(120 * 4);
  });

  it('stops with a friendly error when a tick does too much work', () => {
    const program = ribbon(...Array.from({ length: 10 }, () => block('looks_show')));
    const { runtime } = setup(program, scene(), { limits: { maxStepsPerTick: 5 } });
    const errors: string[] = [];
    runtime.events.on('error', (event) => errors.push(event.code));
    runUntilIdle(runtime);
    expect(runtime.status).toBe('error');
    expect(errors).toEqual(['too_many_steps']);
    expect(runtime.error?.message).toMatch(/подожди/);
  });

  it('limits the number of threads', () => {
    const program: ProgramDoc = {
      v: 1,
      targets: [
        {
          target: 'hero',
          scripts: [
            { id: 'a', blocks: [block('event_start'), right()] },
            { id: 'b', blocks: [block('event_start'), right()] },
          ],
        },
      ],
    };
    const { runtime } = setup(program, scene(), { limits: { maxThreads: 1 } });
    runtime.start();
    expect(runtime.status).toBe('error');
    expect(runtime.error?.code).toBe('too_many_threads');
  });

  it('rejects unknown blocks and actors before running', () => {
    const unknown = setup(ribbon({ id: 'x', type: 'nope' }));
    unknown.runtime.start();
    expect(unknown.runtime.error?.code).toBe('unknown_block');
    expect(unknown.runtime.error?.blockId).toBe('x');

    const noActor: ProgramDoc = { v: 1, targets: [{ target: 'ghost', scripts: [] }] };
    const ghost = setup(noActor);
    ghost.runtime.start();
    expect(ghost.runtime.error?.code).toBe('unknown_actor');
  });

  it('rejects blocks whose primitive is not implemented', () => {
    const def: BlockDef = {
      ...(CORE_BLOCKS[1] as BlockDef),
      type: 'mystery',
      behavior: { primitive: 'nothing' },
    };
    const catalog = new BlockCatalog([...CORE_BLOCKS, def]);
    const { runtime } = setup(ribbon({ id: 'm', type: 'mystery', args: { count: 1 } }), scene(), {
      catalog,
    });
    runtime.start();
    expect(runtime.error?.code).toBe('unknown_block');
  });

  it('turns internal failures into a gentle error', () => {
    const primitives = createCorePrimitives();
    primitives.commands['looks.visible'] = () => {
      throw new Error('boom');
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { runtime } = setup(ribbon(block('looks_hide')), scene(), { primitives });
    runUntilIdle(runtime);
    expect(runtime.error?.code).toBe('internal');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('Runtime step mode', () => {
  it('runs exactly one block per granted step', () => {
    const first = right(1);
    const second = right(1);
    const { world, runtime } = setup(ribbon(first, second));
    runtime.setStepMode(true);
    runtime.start();
    ticks(runtime, 60);
    expect(world.actor('hero').x).toBe(0);
    runtime.grantStep();
    ticks(runtime, 60);
    expect(world.actor('hero').x).toBe(1);
    expect(runtime.stepBudget).toBe(0);
    ticks(runtime, 60);
    expect(world.actor('hero').x).toBe(1);
    runtime.setStepMode(false);
    runUntilIdle(runtime);
    expect(world.actor('hero').x).toBe(2);
  });
});

describe('Runtime events and looks', () => {
  function tapProgram(): ProgramDoc {
    return {
      v: 1,
      targets: [
        {
          target: 'hero',
          scripts: [{ id: 'tap', blocks: [block('event_tap'), right(1)] }],
        },
      ],
    };
  }

  it('starts tap scripts on tap and restarts them', () => {
    const { world, runtime } = setup(tapProgram());
    expect(runtime.hasInteractiveHats()).toBe(true);
    runtime.tap('hero');
    runtime.start();
    expect(runtime.isIdle()).toBe(true);
    runtime.tap('hero');
    ticks(runtime, 5);
    runtime.tap('hero');
    expect(runtime.threadCount).toBe(1);
    ticks(runtime, 60);
    expect(world.actor('hero').x).toBe(1);
    world.markStopped('hero');
    runtime.tap('hero');
    expect(runtime.isIdle()).toBe(true);
  });

  it('fires touch hats when stars are collected or friends meet', () => {
    const program: ProgramDoc = {
      v: 1,
      targets: [
        {
          target: 'hero',
          scripts: [
            { id: 'go', blocks: [block('event_start'), right(2)] },
            {
              id: 'star',
              blocks: [
                block('event_touch', { what: 'star' }),
                block('looks_say', { text: 'Звезда!' }),
              ],
            },
          ],
        },
        {
          target: 'friend',
          scripts: [
            {
              id: 'hi',
              blocks: [
                block('event_touch', { what: 'actor' }),
                block('looks_say', { text: 'Привет!' }),
              ],
            },
          ],
        },
      ],
    };
    const { world, runtime } = setup(
      program,
      scene({
        actors: [
          { id: 'hero', character: 'kitten', x: 0, y: 0 },
          { id: 'friend', character: 'bunny', x: 2, y: 0 },
        ],
        items: [{ id: 's', kind: 'star', x: 1, y: 0 }],
      }),
    );
    runtime.start();
    ticks(runtime, 400);
    expect(world.said.map((entry) => `${entry.actorId}:${entry.text}`)).toEqual([
      'hero:Звезда!',
      'friend:Привет!',
    ]);
  });

  it('hides, shows, switches costumes and stops scripts', () => {
    // control_stop arrives with tier 3; exercise the primitive through a custom catalog.
    const stopDef: BlockDef = {
      type: 'control_stop',
      category: 'control',
      tier: 3,
      shape: 'cap',
      icon: 'octagon',
      label: 'Стоп',
      voice: 'стоп',
      params: [],
      behavior: { primitive: 'control.stop' },
      codegen: { js: 'return;', py: 'return' },
    };
    const catalog = new BlockCatalog([...CORE_BLOCKS, stopDef]);
    const program = ribbon(
      block('looks_hide'),
      block('looks_costume', { costume: 'next' }),
      { id: 'stop', type: 'control_stop' },
      right(),
    );
    const custom = setup(program, scene(), { catalog });
    runUntilIdle(custom.runtime);
    expect(custom.world.actor('hero')).toMatchObject({ hidden: true, costume: 'party', x: 0 });

    const shown = setup(ribbon(block('looks_hide'), block('looks_show')));
    runUntilIdle(shown.runtime);
    expect(shown.world.actor('hero').hidden).toBe(false);
  });

  it('evaluates reporter arguments through registered reporters', () => {
    const primitives = createCorePrimitives();
    primitives.reporters['test.three'] = () => 3;
    const three: BlockDef = {
      type: 'test_three',
      category: 'operators',
      tier: 3,
      shape: 'value',
      icon: 'hash',
      label: 'Три',
      voice: 'три',
      params: [],
      behavior: { primitive: 'test.three' },
      codegen: { js: '3', py: '3' },
    };
    const slotArrow: BlockDef = {
      ...(CORE_BLOCKS[1] as BlockDef),
      type: 'slot_right',
      params: [{ name: 'count', kind: 'slot', voice: 'сколько', accepts: 'value', default: 1 }],
    };
    const catalog = new BlockCatalog([...CORE_BLOCKS, three, slotArrow]);
    const program = ribbon({
      id: 'a',
      type: 'slot_right',
      args: { count: { id: 'r', type: 'test_three' } },
    });
    const { world, runtime } = setup(program, scene(), { catalog, primitives });
    runUntilIdle(runtime);
    expect(world.actor('hero').x).toBe(3);

    const broken = ribbon({
      id: 'b',
      type: 'slot_right',
      args: { count: { id: 'r2', type: 'motion_right' } },
    });
    const failing = setup(broken, scene(), { catalog, primitives });
    runUntilIdle(failing.runtime);
    expect(failing.runtime.error?.code).toBe('unknown_block');
  });
});
