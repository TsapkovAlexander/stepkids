import { describe, expect, it } from 'vitest';
import { defaultCatalog, type ProgramDoc } from '@stepkids/blocks';
import {
  blockPosition,
  emptyRibbon,
  ensureRibbon,
  insertBlock,
  moveBlock,
  removeBlock,
  ribbonBlocks,
  updateArg,
} from '@/lib/ribbon/ops';
import { nextStepHint } from '@/lib/ribbon/hints';

const right = (count = 1) => defaultCatalog.create('motion_right', { count });
const down = (count = 1) => defaultCatalog.create('motion_down', { count });
const types = (program: ProgramDoc) => ribbonBlocks(program).map((block) => `${block.type}:${block.args?.count ?? ''}`);

describe('ribbon ops', () => {
  it('creates and repairs ribbons', () => {
    const empty = emptyRibbon();
    expect(ribbonBlocks(empty)).toEqual([]);
    expect(ensureRibbon(null).targets[0]?.scripts[0]?.blocks[0]?.type).toBe('event_start');
    expect(ensureRibbon(empty)).toBe(empty);
    const foreign: ProgramDoc = { v: 1, targets: [{ target: 'hero', scripts: [{ id: 's', blocks: [right()] }] }] };
    const repaired = ensureRibbon(foreign);
    expect(repaired.targets[0]?.scripts).toHaveLength(2);
    expect(ensureRibbon({ v: 1, targets: [] }).targets[0]?.target).toBe('hero');
    expect(ensureRibbon({ v: 2 } as unknown as ProgramDoc).v).toBe(1);
  });

  it('appends, inserts and never moves the start flag', () => {
    let program = insertBlock(emptyRibbon(), right(1));
    program = insertBlock(program, down(2));
    program = insertBlock(program, right(3), undefined, 0);
    expect(types(program)).toEqual(['motion_right:3', 'motion_right:1', 'motion_down:2']);
    program = insertBlock(program, down(1), undefined, -5);
    expect(types(program)[0]).toBe('motion_down:1');
    expect(program.targets[0]?.scripts[0]?.blocks[0]?.type).toBe('event_start');
  });

  it('removes and updates blocks without touching the input', () => {
    const a = right(1);
    const b = down(1);
    const original = insertBlock(insertBlock(emptyRibbon(), a), b);
    const removed = removeBlock(original, a.id);
    expect(types(removed)).toEqual(['motion_down:1']);
    expect(types(original)).toHaveLength(2);
    const updated = updateArg(original, b.id, 'count', 4);
    expect(types(updated)).toEqual(['motion_right:1', 'motion_down:4']);
    const hat = original.targets[0]?.scripts[0]?.blocks[0]?.id ?? '';
    expect(types(removeBlock(original, hat))).toHaveLength(2);
    expect(removeBlock(original, 'missing')).toEqual(original);
    expect(updateArg(original, 'missing', 'count', 1)).toEqual(original);
  });

  it('moves blocks inside the ribbon', () => {
    const a = right(1);
    const b = right(2);
    const c = right(3);
    const program = [a, b, c].reduce((acc, block) => insertBlock(acc, block), emptyRibbon());
    expect(types(moveBlock(program, c.id, { parentId: null, stack: 'body' }, 0))).toEqual([
      'motion_right:3',
      'motion_right:1',
      'motion_right:2',
    ]);
    expect(types(moveBlock(program, a.id, { parentId: null, stack: 'body' }, 5))).toEqual([
      'motion_right:2',
      'motion_right:3',
      'motion_right:1',
    ]);
    expect(moveBlock(program, 'missing', { parentId: null, stack: 'body' }, 0)).toEqual(program);
  });

  it('moves blocks into and out of wrappers', () => {
    const repeat = defaultCatalog.create('control_repeat', { times: 2 });
    const a = right(1);
    let program = insertBlock(insertBlock(emptyRibbon(), repeat), a);
    program = moveBlock(program, a.id, { parentId: repeat.id, stack: 'DO' }, 0);
    expect(ribbonBlocks(program)).toHaveLength(1);
    expect(ribbonBlocks(program)[0]?.stacks?.DO?.map((block) => block.id)).toEqual([a.id]);
    expect(blockPosition(program, a.id)).toEqual({ at: { parentId: repeat.id, stack: 'DO' }, index: 0 });
    expect(blockPosition(program, repeat.id)).toEqual({ at: { parentId: null, stack: 'body' }, index: 0 });
    expect(blockPosition(program, 'missing')).toBeNull();
    // A wrapper cannot swallow itself.
    expect(moveBlock(program, repeat.id, { parentId: repeat.id, stack: 'DO' }, 0)).toEqual(program);
    // Unknown target stack keeps the block where it was.
    expect(moveBlock(program, a.id, { parentId: 'nope', stack: 'DO' }, 0)).toEqual(program);
    const back = moveBlock(program, a.id, { parentId: null, stack: 'body' }, 1);
    expect(ribbonBlocks(back).map((block) => block.id)).toEqual([repeat.id, a.id]);
    const nested = insertBlock(program, down(1), { parentId: repeat.id, stack: 'DO' });
    expect(ribbonBlocks(nested)[0]?.stacks?.DO).toHaveLength(2);
    expect(removeBlock(nested, a.id).targets[0]?.scripts[0]?.blocks[1]?.stacks?.DO).toHaveLength(1);
  });
});

describe('nextStepHint', () => {
  const reference = [right(2), down(3)].reduce((acc, block) => insertBlock(acc, block), emptyRibbon());

  it('points to the first block that differs', () => {
    expect(nextStepHint(emptyRibbon(), reference)).toMatchObject({ index: 0, block: { type: 'motion_right', args: { count: 2 } } });
    const started = insertBlock(emptyRibbon(), right(2));
    expect(nextStepHint(started, reference)).toMatchObject({ index: 1, block: { type: 'motion_down' } });
    const wrong = insertBlock(emptyRibbon(), right(1));
    expect(nextStepHint(wrong, reference)?.index).toBe(0);
  });

  it('returns null when the ribbon matches or there is no reference', () => {
    const done = [right(2), down(3)].reduce((acc, block) => insertBlock(acc, block), emptyRibbon());
    expect(nextStepHint(done, reference)).toBeNull();
    expect(nextStepHint(done, undefined)).toBeNull();
  });
});
