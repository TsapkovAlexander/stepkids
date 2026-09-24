import { describe, expect, it } from 'vitest';
import {
  cloneWithNewIds,
  countBlocks,
  createId,
  emptyProgram,
  findBlock,
  singleRibbonProgram,
  scriptBody,
  targetScripts,
  withTargetScripts,
  type BlockNode,
  type ProgramDoc,
} from '../src';

const nested: BlockNode = {
  id: 'rep',
  type: 'control_repeat',
  args: { times: 2 },
  stacks: { DO: [{ id: 'a', type: 'motion_right', args: { count: 1 } }] },
};

function program(): ProgramDoc {
  return {
    v: 1,
    targets: [
      {
        target: 'hero',
        scripts: [
          {
            id: 's1',
            blocks: [
              { id: 'h', type: 'event_start' },
              nested,
              { id: 'b', type: 'op_test', args: { value: { id: 'rep2', type: 'op_random' } } },
            ],
          },
        ],
      },
    ],
  };
}

describe('ast helpers', () => {
  it('creates unique ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => createId()));
    expect(ids.size).toBe(500);
    expect(createId(4)).toHaveLength(4);
  });

  it('counts nested blocks and reporters, optionally ignoring types', () => {
    expect(countBlocks(program())).toBe(5);
    expect(countBlocks(program(), ['event_start'])).toBe(4);
    expect(countBlocks(emptyProgram())).toBe(0);
  });

  it('finds blocks deep inside', () => {
    expect(findBlock(program(), 'a')?.type).toBe('motion_right');
    expect(findBlock(program(), 'rep2')?.type).toBe('op_random');
    expect(findBlock(program(), 'missing')).toBeUndefined();
  });

  it('clones with fresh ids everywhere', () => {
    const copy = cloneWithNewIds({
      ...nested,
      args: { times: 2, cond: { id: 'c', type: 'op_true' } },
    });
    expect(copy.id).not.toBe('rep');
    expect(copy.stacks?.DO?.[0]?.id).not.toBe('a');
    expect((copy.args?.cond as BlockNode).id).not.toBe('c');
    expect(copy.args?.times).toBe(2);
  });

  it('manages ribbon programs', () => {
    const ribbon = singleRibbonProgram('hero', [nested]);
    const scripts = targetScripts(ribbon, 'hero');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.blocks[0]?.type).toBe('event_start');
    const first = scripts[0];
    if (!first) throw new Error('no script');
    expect(scriptBody(first)).toEqual([nested]);
    expect(targetScripts(ribbon, 'nobody')).toEqual([]);
    const withFriend = withTargetScripts(ribbon, 'friend', []);
    expect(withFriend.targets.map((t) => t.target)).toEqual(['hero', 'friend']);
    const replaced = withTargetScripts(withFriend, 'hero', []);
    expect(targetScripts(replaced, 'hero')).toEqual([]);
    expect(replaced.targets).toHaveLength(2);
  });
});
