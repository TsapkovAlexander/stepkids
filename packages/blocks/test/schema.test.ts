import { describe, expect, it } from 'vitest';
import {
  gridSceneSchema,
  jsonSchemas,
  levelContentSchema,
  parseProgram,
  programSchema,
  singleRibbonProgram,
  type LevelContentInput,
} from '../src';

const scene = {
  kind: 'grid' as const,
  cols: 6,
  rows: 4,
  actors: [{ id: 'hero', character: 'kitten', x: 0, y: 1 }],
  items: [
    { id: 's1', kind: 'star' as const, x: 3, y: 1 },
    { id: 'f', kind: 'flag' as const, x: 5, y: 1 },
  ],
};

function level(overrides: Partial<LevelContentInput> = {}): LevelContentInput {
  return {
    schemaVersion: 1,
    kind: 'reach',
    tier: 1,
    taskText: 'Доведи котёнка до флажка',
    scene,
    allowedBlocks: ['motion_right'],
    goals: [{ kind: 'reach', x: 5, y: 1 }],
    stars: { two: { maxBlocks: 2 }, three: { maxBlocks: 1 } },
    hints: [{ kind: 'say', text: 'Иди вправо' }],
    reference: singleRibbonProgram('hero', [{ id: 'a', type: 'motion_right', args: { count: 5 } }]),
    ...overrides,
  };
}

describe('grid scene schema', () => {
  it('accepts a valid scene and fills defaults', () => {
    const parsed = gridSceneSchema.parse(scene);
    expect(parsed.theme).toBe('meadow');
    expect(parsed.actors[0]?.dir).toBe('right');
  });

  it('rejects entities outside the grid and duplicate ids', () => {
    const outside = gridSceneSchema.safeParse({
      ...scene,
      items: [{ id: 'x', kind: 'rock', x: 6, y: 0 }],
    });
    expect(outside.success).toBe(false);
    const dup = gridSceneSchema.safeParse({
      ...scene,
      items: [{ id: 'hero', kind: 'rock', x: 1, y: 0 }],
    });
    expect(dup.success).toBe(false);
  });

  it('requires teleports to come in pairs', () => {
    const lonely = gridSceneSchema.safeParse({
      ...scene,
      items: [{ id: 't1', kind: 'teleport', x: 1, y: 0, pair: 'a' }],
    });
    expect(lonely.success).toBe(false);
    const unpaired = gridSceneSchema.safeParse({
      ...scene,
      items: [{ id: 't1', kind: 'teleport', x: 1, y: 0 }],
    });
    expect(unpaired.success).toBe(false);
    const ok = gridSceneSchema.safeParse({
      ...scene,
      items: [
        { id: 't1', kind: 'teleport', x: 1, y: 0, pair: 'a' },
        { id: 't2', kind: 'teleport', x: 4, y: 3, pair: 'a' },
      ],
    });
    expect(ok.success).toBe(true);
  });
});

describe('program schema', () => {
  it('parses ribbon programs', () => {
    const program = singleRibbonProgram('hero', [
      { id: 'a', type: 'motion_right', args: { count: 2 } },
    ]);
    expect(parseProgram(program)).toEqual(program);
  });

  it('rejects duplicate ids, bad versions and deep nesting', () => {
    const dup = singleRibbonProgram('hero', [
      { id: 'a', type: 'motion_right' },
      { id: 'a', type: 'motion_left' },
    ]);
    expect(programSchema.safeParse(dup).success).toBe(false);
    expect(programSchema.safeParse({ v: 2, targets: [] }).success).toBe(false);
    let deep = { id: 'leaf', type: 'motion_right' } as {
      id: string;
      type: string;
      stacks?: object;
    };
    for (let i = 0; i < 30; i += 1)
      deep = { id: `n${i}`, type: 'control_forever', stacks: { DO: [deep] } };
    expect(programSchema.safeParse(singleRibbonProgram('hero', [deep as never])).success).toBe(
      false,
    );
  });
});

describe('level schema', () => {
  it('accepts a valid level', () => {
    expect(levelContentSchema.safeParse(level()).success).toBe(true);
  });

  it('limits task text for young tiers', () => {
    expect(levelContentSchema.safeParse(level({ taskText: 'а'.repeat(81) })).success).toBe(false);
    expect(levelContentSchema.safeParse(level({ tier: 3, taskText: 'а'.repeat(81) })).success).toBe(
      true,
    );
  });

  it('requires a reference unless the goal is manual', () => {
    expect(levelContentSchema.safeParse(level({ reference: undefined })).success).toBe(false);
    expect(
      levelContentSchema.safeParse(level({ reference: undefined, goals: [{ kind: 'manual' }] }))
        .success,
    ).toBe(true);
  });

  it('keeps young tiers on the grid', () => {
    const free = {
      kind: 'free' as const,
      background: 'park',
      sprites: [{ id: 'cat', character: 'kitten', x: 0, y: 0 }],
    };
    expect(levelContentSchema.safeParse(level({ scene: free })).success).toBe(false);
  });
});

describe('json schemas', () => {
  it('exports every schema', () => {
    const schemas = jsonSchemas();
    expect(Object.keys(schemas)).toEqual(['program', 'scene', 'goals', 'stars', 'level']);
    expect(JSON.stringify(schemas.level)).toContain('taskText');
  });
});
