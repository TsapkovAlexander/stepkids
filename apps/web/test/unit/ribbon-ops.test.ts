import { describe, expect, it } from 'vitest';
import { defaultCatalog, type ProgramDoc } from '@stepkids/blocks';
import {
  addScript,
  blockPosition,
  countPlaced,
  emptyRibbon,
  ensureRibbon,
  insertBlock,
  laneBlocks,
  laneKey,
  mainLane,
  moveBlock,
  removeBlock,
  removeScript,
  ribbonBlocks,
  sameLane,
  scriptsOf,
  updateArg,
  type LaneRef,
} from '@/lib/ribbon/ops';
import { nextStepHint } from '@/lib/ribbon/hints';

const right = (count = 1) => defaultCatalog.create('motion_right', { count });
const down = (count = 1) => defaultCatalog.create('motion_down', { count });
const types = (program: ProgramDoc) =>
  ribbonBlocks(program).map((block) => `${block.type}:${block.args?.count ?? ''}`);

function lane(program: ProgramDoc): LaneRef {
  const found = mainLane(program);
  if (!found) throw new Error('no main lane');
  return found;
}

function build(...blocks: ReturnType<typeof right>[]): ProgramDoc {
  return blocks.reduce((acc, block) => insertBlock(acc, block, lane(acc)), emptyRibbon());
}

describe('ribbon ops', () => {
  it('creates and repairs ribbons', () => {
    const empty = emptyRibbon();
    expect(ribbonBlocks(empty)).toEqual([]);
    expect(ensureRibbon(null).targets[0]?.scripts[0]?.blocks[0]?.type).toBe('event_start');
    expect(ensureRibbon(empty)).toBe(empty);
    const foreign: ProgramDoc = {
      v: 1,
      targets: [{ target: 'hero', scripts: [{ id: 's', blocks: [right()] }] }],
    };
    expect(ensureRibbon(foreign).targets[0]?.scripts).toHaveLength(2);
    expect(ensureRibbon({ v: 1, targets: [] }).targets[0]?.target).toBe('hero');
    expect(ensureRibbon({ v: 2 } as unknown as ProgramDoc).v).toBe(1);
    expect(mainLane({ v: 1, targets: [] })).toBeNull();
  });

  it('appends, inserts and never moves the start flag', () => {
    let program = build(right(1), down(2));
    program = insertBlock(program, right(3), lane(program), 0);
    expect(types(program)).toEqual(['motion_right:3', 'motion_right:1', 'motion_down:2']);
    program = insertBlock(program, down(1), lane(program), -5);
    expect(types(program)[0]).toBe('motion_down:1');
    expect(program.targets[0]?.scripts[0]?.blocks[0]?.type).toBe('event_start');
    const missing = { ...lane(program), scriptId: 'nope' };
    expect(insertBlock(program, down(1), missing)).toBe(program);
  });

  it('removes and updates blocks without touching the input', () => {
    const a = right(1);
    const b = down(1);
    const original = build(a, b);
    expect(types(removeBlock(original, a.id))).toEqual(['motion_down:1']);
    expect(types(original)).toHaveLength(2);
    expect(types(updateArg(original, b.id, 'count', 4))).toEqual([
      'motion_right:1',
      'motion_down:4',
    ]);
    const hat = original.targets[0]?.scripts[0]?.blocks[0]?.id ?? '';
    expect(removeBlock(original, hat)).toBe(original);
    expect(removeBlock(original, 'missing')).toBe(original);
    expect(updateArg(original, 'missing', 'count', 1)).toBe(original);
  });

  it('moves blocks inside the ribbon', () => {
    const a = right(1);
    const b = right(2);
    const c = right(3);
    const program = build(a, b, c);
    expect(types(moveBlock(program, c.id, lane(program), 0))).toEqual([
      'motion_right:3',
      'motion_right:1',
      'motion_right:2',
    ]);
    expect(types(moveBlock(program, a.id, lane(program), 5))).toEqual([
      'motion_right:2',
      'motion_right:3',
      'motion_right:1',
    ]);
    expect(moveBlock(program, 'missing', lane(program), 0)).toBe(program);
  });

  it('moves blocks into and out of wrappers', () => {
    const repeat = defaultCatalog.create('control_repeat', { times: 2 });
    const a = right(1);
    let program = build(repeat, a);
    const inner: LaneRef = { ...lane(program), parentId: repeat.id, stack: 'DO' };
    program = moveBlock(program, a.id, inner, 0);
    expect(ribbonBlocks(program)).toHaveLength(1);
    expect(laneBlocks(program, inner).map((block) => block.id)).toEqual([a.id]);
    expect(blockPosition(program, a.id)).toEqual({ lane: inner, index: 0 });
    expect(blockPosition(program, repeat.id)).toEqual({ lane: lane(program), index: 0 });
    expect(blockPosition(program, 'missing')).toBeNull();
    expect(moveBlock(program, repeat.id, inner, 0)).toBe(program);
    expect(moveBlock(program, a.id, { ...inner, parentId: 'nope' }, 0)).toBe(program);
    const back = moveBlock(program, a.id, lane(program), 1);
    expect(ribbonBlocks(back).map((block) => block.id)).toEqual([repeat.id, a.id]);
    const nested = insertBlock(program, down(1), inner);
    expect(laneBlocks(nested, inner)).toHaveLength(2);
    expect(laneBlocks(removeBlock(nested, a.id), inner)).toHaveLength(1);
    expect(countPlaced(nested)).toBe(3);
    expect(laneBlocks(program, { ...inner, scriptId: 'nope' })).toEqual([]);
  });

  it('manages extra scripts and actors', () => {
    const base = build(right(1));
    const { program, lane: tapLane } = addScript(base, 'hero', defaultCatalog.create('event_tap'));
    expect(scriptsOf(program, 'hero')).toHaveLength(2);
    const withBlock = insertBlock(program, down(2), tapLane);
    expect(laneBlocks(withBlock, tapLane).map((block) => block.type)).toEqual(['motion_down']);
    // A block can travel from one script to another.
    const moved = moveBlock(withBlock, ribbonBlocks(withBlock)[0]?.id ?? '', tapLane, 0);
    expect(laneBlocks(moved, tapLane)).toHaveLength(2);
    expect(scriptsOf(removeScript(moved, 'hero', tapLane.scriptId), 'hero')).toHaveLength(1);
    expect(removeScript(moved, 'nobody', 'x')).toBe(moved);
    const friend = addScript(base, 'friend', defaultCatalog.create('event_start'));
    expect(friend.program.targets.map((target) => target.target)).toEqual(['hero', 'friend']);
    expect(sameLane(tapLane, { ...tapLane })).toBe(true);
    expect(sameLane(tapLane, null)).toBe(false);
    expect(laneKey(tapLane)).toContain(tapLane.scriptId);
  });
});

describe('nextStepHint', () => {
  const reference = build(right(2), down(3));

  it('points to the first block that differs', () => {
    expect(nextStepHint(emptyRibbon(), reference)).toMatchObject({
      index: 0,
      block: { type: 'motion_right', args: { count: 2 } },
    });
    expect(nextStepHint(build(right(2)), reference)).toMatchObject({
      index: 1,
      block: { type: 'motion_down' },
    });
    expect(nextStepHint(build(right(1)), reference)?.index).toBe(0);
  });

  it('returns null when the ribbon matches or there is no reference', () => {
    expect(nextStepHint(build(right(2), down(3)), reference)).toBeNull();
    expect(nextStepHint(reference, undefined)).toBeNull();
  });
});
