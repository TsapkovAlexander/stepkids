import {
  PROGRAM_SCHEMA_VERSION,
  START_BLOCK,
  createId,
  type BlockNode,
  type Primitive,
  type ProgramDoc,
  type ScriptNode,
} from '@stepkids/blocks';

/**
 * Pure edits of ribbon programs. A program has scripts per actor; every script starts with a
 * hat (the tier 1 ribbon is the hero's single "when start" script). Blocks are addressed by id
 * (unique in the program); positions are addressed by lanes: the body of a script or a stack
 * of a wrapper block. Every function returns a new program and leaves the input untouched.
 */

export const HERO = 'hero';

export interface LaneRef {
  target: string;
  scriptId: string;
  /** null — the script body right after the hat; otherwise a wrapper block id. */
  parentId: string | null;
  stack: string;
}

export function laneKey(lane: LaneRef): string {
  return `${lane.target}/${lane.scriptId}/${lane.parentId ?? 'root'}/${lane.stack}`;
}

export function sameLane(a: LaneRef | null, b: LaneRef | null): boolean {
  return !!a && !!b && laneKey(a) === laneKey(b);
}

export function emptyRibbon(target = HERO): ProgramDoc {
  return {
    v: PROGRAM_SCHEMA_VERSION,
    targets: [
      { target, scripts: [{ id: createId(), blocks: [{ id: createId(), type: START_BLOCK }] }] },
    ],
  };
}

function scriptsOfTarget(program: ProgramDoc, target: string): ScriptNode[] {
  return program.targets.find((entry) => entry.target === target)?.scripts ?? [];
}

function mainScript(program: ProgramDoc, target: string): ScriptNode | undefined {
  return scriptsOfTarget(program, target).find((script) => script.blocks[0]?.type === START_BLOCK);
}

/** Makes sure the target has a "when start" script first (e.g. an empty or foreign program). */
export function ensureRibbon(program: ProgramDoc | null | undefined, target = HERO): ProgramDoc {
  if (!program || program.v !== PROGRAM_SCHEMA_VERSION) return emptyRibbon(target);
  if (mainScript(program, target)) return program;
  const copy = structuredClone(program);
  const entry = copy.targets.find((item) => item.target === target);
  const script: ScriptNode = { id: createId(), blocks: [{ id: createId(), type: START_BLOCK }] };
  if (entry) entry.scripts.unshift(script);
  else copy.targets.unshift({ target, scripts: [script] });
  return copy;
}

/** Blocks of the main ribbon after the start flag. */
export function ribbonBlocks(program: ProgramDoc, target = HERO): BlockNode[] {
  return mainScript(program, target)?.blocks.slice(1) ?? [];
}

/** Lane of the target's main ribbon. */
export function mainLane(program: ProgramDoc, target = HERO): LaneRef | null {
  const script = mainScript(program, target);
  return script ? { target, scriptId: script.id, parentId: null, stack: 'body' } : null;
}

export function scriptsOf(program: ProgramDoc, target: string): ScriptNode[] {
  return scriptsOfTarget(program, target);
}

/** Blocks of a lane (without the hat for a script body). */
export function laneBlocks(program: ProgramDoc, lane: LaneRef): BlockNode[] {
  const script = scriptsOfTarget(program, lane.target).find((entry) => entry.id === lane.scriptId);
  if (!script) return [];
  if (lane.parentId === null) return script.blocks.slice(1);
  let found: BlockNode[] = [];
  walk(script.blocks, (block) => {
    if (block.id === lane.parentId) found = block.stacks?.[lane.stack] ?? [];
  });
  return found;
}

function walk(blocks: readonly BlockNode[], visit: (block: BlockNode) => void): void {
  for (const block of blocks) {
    visit(block);
    for (const stack of Object.values(block.stacks ?? {})) walk(stack, visit);
  }
}

/** Mutable stack array of a lane inside a cloned program; the hat stays at index 0 of a body. */
function laneArray(program: ProgramDoc, lane: LaneRef): BlockNode[] | null {
  const script = scriptsOfTarget(program, lane.target).find((entry) => entry.id === lane.scriptId);
  if (!script) return null;
  if (lane.parentId === null) return script.blocks;
  let found: BlockNode[] | null = null;
  walk(script.blocks, (block) => {
    if (found || block.id !== lane.parentId) return;
    block.stacks ??= {};
    block.stacks[lane.stack] ??= [];
    found = block.stacks[lane.stack] ?? null;
  });
  return found;
}

const offset = (lane: LaneRef) => (lane.parentId === null ? 1 : 0);

interface Location {
  stack: BlockNode[];
  index: number;
  script: ScriptNode;
}

function locate(program: ProgramDoc, blockId: string): Location | null {
  for (const target of program.targets) {
    for (const script of target.scripts) {
      const search = (stack: BlockNode[]): Location | null => {
        for (let index = 0; index < stack.length; index += 1) {
          const block = stack[index];
          if (!block) continue;
          if (block.id === blockId) return { stack, index, script };
          for (const nested of Object.values(block.stacks ?? {})) {
            const hit = search(nested);
            if (hit) return hit;
          }
        }
        return null;
      };
      const hit = search(script.blocks);
      if (hit) return hit;
    }
  }
  return null;
}

const isHatSlot = (location: Location) =>
  location.stack === location.script.blocks && location.index === 0;

function containsBlock(block: BlockNode, id: string): boolean {
  return Object.values(block.stacks ?? {}).some((stack) =>
    stack.some((child) => child.id === id || containsBlock(child, id)),
  );
}

export function insertBlock(
  program: ProgramDoc,
  block: BlockNode,
  lane: LaneRef,
  index?: number,
): ProgramDoc {
  const copy = structuredClone(program);
  const stack = laneArray(copy, lane);
  if (!stack) return program;
  const position =
    index === undefined
      ? stack.length
      : clampIndex(index + offset(lane), offset(lane), stack.length);
  stack.splice(position, 0, block);
  return copy;
}

export function removeBlock(program: ProgramDoc, blockId: string): ProgramDoc {
  const copy = structuredClone(program);
  const location = locate(copy, blockId);
  if (!location || isHatSlot(location)) return program;
  location.stack.splice(location.index, 1);
  return copy;
}

export function updateArg(
  program: ProgramDoc,
  blockId: string,
  name: string,
  value: Primitive,
): ProgramDoc {
  const copy = structuredClone(program);
  const location = locate(copy, blockId);
  const block = location?.stack[location.index];
  if (!block) return program;
  block.args = { ...block.args, [name]: value };
  return copy;
}

/** Moves a block (with its nested blocks) to a lane position; index counts blocks of the lane. */
export function moveBlock(
  program: ProgramDoc,
  blockId: string,
  lane: LaneRef,
  index: number,
): ProgramDoc {
  const copy = structuredClone(program);
  const location = locate(copy, blockId);
  const block = location?.stack[location.index];
  if (!location || !block || isHatSlot(location)) return program;
  if (lane.parentId !== null && (lane.parentId === blockId || containsBlock(block, lane.parentId)))
    return program;
  const target = laneArray(copy, lane);
  if (!target) return program;
  location.stack.splice(location.index, 1);
  const position = clampIndex(index + offset(lane), offset(lane), target.length);
  target.splice(position, 0, block);
  return copy;
}

function clampIndex(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Where a block lives: its lane and index. */
export function blockPosition(
  program: ProgramDoc,
  blockId: string,
): { lane: LaneRef; index: number } | null {
  for (const target of program.targets) {
    for (const script of target.scripts) {
      const rootIndex = script.blocks.findIndex((block) => block.id === blockId);
      if (rootIndex > 0)
        return {
          lane: { target: target.target, scriptId: script.id, parentId: null, stack: 'body' },
          index: rootIndex - 1,
        };
      let hit: { lane: LaneRef; index: number } | null = null;
      walk(script.blocks, (block) => {
        for (const [stack, children] of Object.entries(block.stacks ?? {})) {
          const index = children.findIndex((child) => child.id === blockId);
          if (!hit && index >= 0)
            hit = {
              lane: { target: target.target, scriptId: script.id, parentId: block.id, stack },
              index,
            };
        }
      });
      if (hit) return hit;
    }
  }
  return null;
}

/** Adds a script with the given hat to an actor; returns the program and the new lane. */
export function addScript(
  program: ProgramDoc,
  target: string,
  hat: BlockNode,
): { program: ProgramDoc; lane: LaneRef } {
  const copy = structuredClone(program);
  const script: ScriptNode = { id: createId(), blocks: [hat] };
  const entry = copy.targets.find((item) => item.target === target);
  if (entry) entry.scripts.push(script);
  else copy.targets.push({ target, scripts: [script] });
  return { program: copy, lane: { target, scriptId: script.id, parentId: null, stack: 'body' } };
}

export function removeScript(program: ProgramDoc, target: string, scriptId: string): ProgramDoc {
  const copy = structuredClone(program);
  const entry = copy.targets.find((item) => item.target === target);
  if (!entry) return program;
  entry.scripts = entry.scripts.filter((script) => script.id !== scriptId);
  return copy;
}

/** Counts every block the child placed (the implicit start flags do not count). */
export function countPlaced(program: ProgramDoc): number {
  let count = 0;
  for (const target of program.targets) {
    for (const script of target.scripts)
      walk(script.blocks, (block) => void (block.type !== START_BLOCK && (count += 1)));
  }
  return count;
}
