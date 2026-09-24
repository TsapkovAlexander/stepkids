import { describe, expect, it, vi } from 'vitest';
import type { Goal, LevelContent, StarsRule } from '@stepkids/blocks';
import { checkLevel, findViolations } from '../src/check';
import { computeStars, evaluateGoal, evaluateGoals } from '../src/goals';
import { LevelRun, runHeadless, type RunnableLevel } from '../src/run';
import { GridWorld } from '../src/world/grid-world';
import { block, down, ribbon, right, scene } from './helpers';

const starScene = scene({
  items: [
    { id: 's1', kind: 'star', x: 2, y: 0 },
    { id: 's2', kind: 'star', x: 2, y: 1 },
  ],
});

function level(goals: Goal[], stars: StarsRule = {}, sceneInput = starScene): RunnableLevel {
  return { scene: sceneInput, goals, stars };
}

describe('computeStars', () => {
  const rule: StarsRule = { two: { maxBlocks: 4 }, three: { maxBlocks: 2, noBumps: true } };
  it.each([
    [{ success: false, blocks: 1, bumps: 0 }, 0],
    [{ success: true, blocks: 5, bumps: 0 }, 1],
    [{ success: true, blocks: 3, bumps: 0 }, 2],
    [{ success: true, blocks: 2, bumps: 1 }, 2],
    [{ success: true, blocks: 2, bumps: 0 }, 3],
  ])('%o → %i stars', (input, stars) => {
    expect(computeStars(rule, input)).toBe(stars);
  });

  it('gives three stars without extra rules', () => {
    expect(computeStars({}, { success: true, blocks: 50, bumps: 3 })).toBe(3);
    expect(computeStars({ three: { noBumps: true } }, { success: true, blocks: 1, bumps: 1 })).toBe(
      2,
    );
  });
});

describe('evaluateGoal', () => {
  const world = new GridWorld(starScene);

  it('checks stars and positions', () => {
    expect(evaluateGoal({ kind: 'collectAll' }, { world, timeMs: 0 })).toMatchObject({
      met: false,
      detail: 'starsLeft',
      starsLeft: 2,
    });
    expect(evaluateGoal({ kind: 'reach', x: 0, y: 0 }, { world, timeMs: 0 }).met).toBe(true);
    expect(
      evaluateGoal({ kind: 'reach', x: 1, y: 0, actor: 'ghost' }, { world, timeMs: 0 }),
    ).toMatchObject({
      met: false,
      detail: 'notReached',
    });
  });

  it('checks phrases, variables and time', () => {
    const w = new GridWorld(starScene);
    w.say('hero', 'Привет, мир!', 0);
    expect(evaluateGoal({ kind: 'say', text: 'привет мир' }, { world: w, timeMs: 0 }).met).toBe(
      true,
    );
    expect(evaluateGoal({ kind: 'say', text: 'пока' }, { world: w, timeMs: 0 }).detail).toBe(
      'notSaid',
    );
    const variable = (name: string) => (name === 'score' ? 5 : undefined);
    expect(
      evaluateGoal(
        { kind: 'varEquals', variable: 'score', value: '5' },
        { world: w, timeMs: 0, variable },
      ).met,
    ).toBe(true);
    expect(
      evaluateGoal(
        { kind: 'varEquals', variable: 'lives', value: 1 },
        { world: w, timeMs: 0, variable },
      ).detail,
    ).toBe('variableMismatch');
    expect(
      evaluateGoal({ kind: 'varEquals', variable: 'x', value: 1 }, { world: w, timeMs: 0 }).met,
    ).toBe(false);
    expect(evaluateGoal({ kind: 'withinTime', seconds: 2 }, { world: w, timeMs: 1999 }).met).toBe(
      true,
    );
    expect(
      evaluateGoal({ kind: 'withinTime', seconds: 2 }, { world: w, timeMs: 2001 }).detail,
    ).toBe('tooSlow');
    expect(evaluateGoal({ kind: 'manual' }, { world: w, timeMs: 0 }).detail).toBe('manual');
  });

  it('compares drawings as sets of cells', () => {
    const w = new GridWorld(scene());
    const goal: Goal = {
      kind: 'drawShape',
      cells: [
        [0, 0],
        [1, 0],
      ],
    };
    expect(evaluateGoal(goal, { world: w, timeMs: 0 }).detail).toBe('shapeMismatch');
    w.beginWalk('hero', 'right', 1, 0, 0, 1);
    w.arrive('hero', 1);
    expect(evaluateGoal(goal, { world: w, timeMs: 0 }).met).toBe(true);
    expect(
      evaluateGoal({ kind: 'drawShape', cells: [[0, 0]], actor: 'ghost' }, { world: w, timeMs: 0 })
        .met,
    ).toBe(false);
  });

  it('needs at least one goal', () => {
    expect(evaluateGoals([], { world, timeMs: 0 }).met).toBe(false);
  });
});

describe('LevelRun', () => {
  it('succeeds and scores a good program', () => {
    const program = ribbon(right(2), down(1));
    const result = runHeadless(
      level([{ kind: 'collectAll' }], { two: { maxBlocks: 3 }, three: { maxBlocks: 2 } }),
      program,
    );
    expect(result).toMatchObject({ success: true, stars: 3, blocks: 2, bumps: 0, failure: null });
    expect(result.timeMs).toBeGreaterThan(1000);
  });

  it('reports the first bump as the failure', () => {
    const rocky = scene({ items: [{ id: 'r', kind: 'rock', x: 1, y: 0 }] });
    const result = runHeadless(level([{ kind: 'reach', x: 3, y: 0 }], {}, rocky), ribbon(right(3)));
    expect(result.success).toBe(false);
    expect(result.failure).toMatchObject({ kind: 'bump', reason: 'rock', actorId: 'hero' });
    expect(result.bumps).toBe(1);
  });

  it('explains unmet goals', () => {
    const result = runHeadless(level([{ kind: 'collectAll' }]), ribbon(right(2)));
    expect(result.failure?.kind).toBe('goal');
    expect(result.goals[0]).toMatchObject({ detail: 'starsLeft', starsLeft: 1 });
  });

  it('refuses to run an empty program', () => {
    const run = new LevelRun(level([{ kind: 'collectAll' }]), ribbon());
    const finish = vi.fn();
    run.events.on('finish', finish);
    run.start();
    expect(run.finished).toBe(true);
    expect(run.result?.failure).toEqual({ kind: 'empty' });
    expect(finish).toHaveBeenCalledTimes(1);
    run.advance(100);
    expect(run.timeMs).toBe(0);
  });

  it('finishes continuous programs as soon as the goal is met', () => {
    const program = ribbon(block('control_forever', {}, { DO: [right(1)] }));
    const oneStar = scene({ items: [{ id: 's', kind: 'star', x: 2, y: 0 }] });
    const result = runHeadless(level([{ kind: 'collectAll' }], {}, oneStar), program);
    expect(result.success).toBe(true);
  });

  it('times out endless programs that never reach the goal', () => {
    const program = ribbon(block('control_forever', {}, { DO: [block('looks_show')] }));
    const result = runHeadless(level([{ kind: 'collectAll' }]), program, { maxTimeMs: 3000 });
    expect(result.failure).toEqual({ kind: 'timeout' });
  });

  it('waits for taps while interactive scripts can still react', () => {
    const program = {
      v: 1 as const,
      targets: [{ target: 'hero', scripts: [{ id: 't', blocks: [block('event_tap'), right(2)] }] }],
    };
    const oneStar = scene({ items: [{ id: 's', kind: 'star', x: 2, y: 0 }] });
    const run = new LevelRun(level([{ kind: 'collectAll' }], {}, oneStar), program);
    run.start();
    for (let i = 0; i < 60; i += 1) run.advance(1000 / 60);
    expect(run.finished).toBe(false);
    run.runtime.tap('hero');
    for (let i = 0; i < 60 && !run.finished; i += 1) run.advance(1000 / 60);
    expect(run.result?.success).toBe(true);
  });

  it('marks manual tasks for a parent check', () => {
    const result = runHeadless(level([{ kind: 'manual' }]), ribbon(right(1)));
    expect(result.failure).toEqual({ kind: 'manual' });
  });

  it('turns runtime errors into failures', () => {
    const result = runHeadless(level([{ kind: 'collectAll' }]), ribbon({ id: 'x', type: 'nope' }));
    expect(result.failure).toMatchObject({ kind: 'error', code: 'unknown_block', blockId: 'x' });
  });

  it('can be stopped by the child without a verdict and aborted from outside', () => {
    const run = new LevelRun(level([{ kind: 'collectAll' }]), ribbon(right(3)));
    run.start();
    run.advance(100);
    run.stop();
    expect(run.runtime.status).toBe('stopped');
    expect(run.finished).toBe(false);
    const aborted = run.abort({ kind: 'timeout' });
    expect(aborted.failure).toEqual({ kind: 'timeout' });
    run.stop();
    expect(run.abort({ kind: 'empty' })).toBe(aborted);
  });
});

describe('checkLevel', () => {
  function content(overrides: Partial<LevelContent> = {}): LevelContent {
    return {
      schemaVersion: 1,
      kind: 'collect',
      tier: 1,
      taskText: 'Собери звёзды',
      scene: {
        ...starScene,
        theme: 'meadow',
        actors: [{ id: 'hero', character: 'kitten', x: 0, y: 0, dir: 'right' }],
        items: starScene.items,
      },
      allowedBlocks: ['motion_right', 'motion_down'],
      goals: [{ kind: 'collectAll' }],
      stars: { two: { maxBlocks: 3 }, three: { maxBlocks: 2 } },
      hints: [],
      reference: ribbon(right(2), down(1)),
      ...overrides,
    } as LevelContent;
  }

  it('accepts a level whose reference earns three stars', () => {
    const check = checkLevel(content());
    expect(check.ok).toBe(true);
    expect(check.result?.stars).toBe(3);
  });

  it('lists problems of a weak reference', () => {
    const check = checkLevel(
      content({
        reference: ribbon(right(1), right(1), down(1), block('looks_say', { text: 'Ура' })),
        blockLimit: 3,
      }),
    );
    expect(check.ok).toBe(false);
    expect(check.violations).toEqual({ disallowed: ['looks_say'], overLimit: 1 });
    expect(check.problems).toHaveLength(3);
    expect(check.problems[2]).toMatch(/1 зв/);
    expect(checkLevel(content({ reference: ribbon(right(1)) })).problems).toContain(
      'Эталон не достигает цели',
    );
  });

  it('handles levels without a reference', () => {
    expect(checkLevel(content({ reference: undefined })).problems).toEqual([
      'Нет эталонного решения',
    ]);
    expect(checkLevel(content({ reference: undefined, goals: [{ kind: 'manual' }] })).ok).toBe(
      true,
    );
  });

  it('finds violations without a limit', () => {
    expect(findViolations({ allowedBlocks: ['motion_right'] }, ribbon(right(1), right(1)))).toEqual(
      {
        disallowed: [],
        overLimit: 0,
      },
    );
  });
});

describe('tier 2 goals and scripted taps', () => {
  it('checks costumes and visibility', () => {
    const w = new GridWorld(scene(), { costumes: () => ['default', 'party'] });
    expect(
      evaluateGoal({ kind: 'costume', costume: 'party' }, { world: w, timeMs: 0 }).detail,
    ).toBe('wrongCostume');
    w.setCostume('hero', 'party');
    expect(evaluateGoal({ kind: 'costume', costume: 'party' }, { world: w, timeMs: 0 }).met).toBe(
      true,
    );
    expect(evaluateGoal({ kind: 'hidden', hidden: true }, { world: w, timeMs: 0 }).detail).toBe(
      'wrongVisibility',
    );
    w.setVisible('hero', false);
    expect(evaluateGoal({ kind: 'hidden', hidden: true }, { world: w, timeMs: 0 }).met).toBe(true);
    expect(
      evaluateGoal({ kind: 'hidden', hidden: false, actor: 'ghost' }, { world: w, timeMs: 0 }).met,
    ).toBe(false);
  });

  it('replays scripted taps in headless runs', () => {
    const program = {
      v: 1 as const,
      targets: [{ target: 'hero', scripts: [{ id: 't', blocks: [block('event_tap'), right(1)] }] }],
    };
    const goal = level([{ kind: 'reach', x: 3, y: 0 }], {}, scene());
    expect(runHeadless(goal, program).success).toBe(false);
    const taps = [500, 1200, 1900].map((atMs) => ({ atMs, tap: 'hero' }));
    expect(runHeadless(goal, program, { inputs: taps }).success).toBe(true);
    expect(runHeadless(goal, program, { inputs: taps.slice(0, 2) }).failure?.kind).toBe('goal');
  });
});
