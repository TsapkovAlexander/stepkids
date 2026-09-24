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
 * Pure edits of a ribbon program. The ribbon edits the first "when start" script of an actor;
 * wrapper blocks (tier 2) hold nested stacks, addressed by the wrapper id and stack name.
 * Every function returns a new program and leaves the input untouched.
 */

export const HERO = 'hero';

export interface StackRef {
  /** null — the ribbon itself; otherwise the id of a wrapper block. */
  parentId: string | null;
  stack: string;
}

export const ROOT: StackRef = { parentId: null, stack: 'body' };

export function emptyRibbon(target = HERO): ProgramDoc {
  return {
    v: PROGRAM_SCHEMA_VERSION,
    targets: [{ target, scripts: [{ id: createId(), blocks: [{ id: createId(), type: START_BLOCK }] }] }],
  };
}

function mainScript(program: ProgramDoc, target: string): ScriptNode | undefined {
  return program.targets.find((entry) => entry.target === target)?.scripts.find((script) => script.blocks[0]?.type === START_BLOCK);
}

/** Makes sure the program has a ribbon for the target (e.g. an empty or foreign program). */
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

/** Blocks of the ribbon after the start flag. */
export function ribbonBlocks(program: ProgramDoc, target = HERO): BlockNode[] {
  return mainScript(program, target)?.blocks.slice(1) ?? [];
}

function stackOf(script: ScriptNode, ref: StackRef): BlockNode[] | null {
  if (ref.parentId === null) return script.blocks;
  let found: BlockNode[] | null = null;
  const visit = (blocks: BlockNode[]) => {
    for (const block of blocks) {
      if (found) return;
      if (block.id === ref.parentId) {
        block.stacks ??= {};
        block.stacks[ref.stack] ??= [];
        found = block.stacks[ref.stack] ?? null;
        return;
      }
      for (const stack of Object.values(block.stacks ?? {})) visit(stack);
    }
  };
  visit(script.blocks);
  return found;
}

/** Offset inside a stack: the root stack starts with the hat, which stays first. */
const offset = (ref: StackRef) => (ref.parentId === null ? 1 : 0);

function edit(program: ProgramDoc, target: string, change: (script: ScriptNode) => void): ProgramDoc {
  const copy = ensureRibbon(structuredClone(program), target);
  const script = mainScript(copy, target);
  if (script) change(script);
  return copy;
}

interface Location {
  stack: BlockNode[];
  index: number;
}

function locate(script: ScriptNode, blockId: string): Location | null {
  const search = (stack: BlockNode[]): Location | null => {
    for (let index = 0; index < stack.length; index += 1) {
      const block = stack[index];
      if (!block) continue;
      if (block.id === blockId) return { stack, index };
      for (const nested of Object.values(block.stacks ?? {})) {
        const hit = search(nested);
        if (hit) return hit;
      }
    }
    return null;
  };
  return search(script.blocks);
}

export function insertBlock(program: ProgramDoc, block: BlockNode, at: StackRef = ROOT, index?: number, target = HERO): ProgramDoc {
  return edit(program, target, (script) => {
    const stack = stackOf(script, at);
    if (!stack) return;
    const position = index === undefined ? stack.length : Math.min(stack.length, Math.max(offset(at), index + offset(at)));
    stack.splice(position, 0, block);
  });
}

export function removeBlock(program: ProgramDoc, blockId: string, target = HERO): ProgramDoc {
  return edit(program, target, (script) => {
    const location = locate(script, blockId);
    if (!location || (location.stack === script.blocks && location.index === 0)) return;
    location.stack.splice(location.index, 1);
  });
}

export function updateArg(program: ProgramDoc, blockId: string, name: string, value: Primitive, target = HERO): ProgramDoc {
  return edit(program, target, (script) => {
    const location = locate(script, blockId);
    const block = location?.stack[location.index];
    if (!block) return;
    block.args = { ...block.args, [name]: value };
  });
}

/** Moves a block to a position of a stack (index counts blocks after the hat for the root). */
export function moveBlock(program: ProgramDoc, blockId: string, to: StackRef, index: number, target = HERO): ProgramDoc {
  return edit(program, target, (script) => {
    const location = locate(script, blockId);
    const block = location?.stack[location.index];
    if (!location || !block || block.type === START_BLOCK) return;
    // A wrapper cannot be moved into itself.
    if (to.parentId !== null && (to.parentId === blockId || containsBlock(block, to.parentId))) return;
    location.stack.splice(location.index, 1);
    const stack = stackOf(script, to);
    if (!stack) {
      location.stack.splice(location.index, 0, block);
      return;
    }
    const position = Math.min(stack.length, Math.max(offset(to), index + offset(to)));
    stack.splice(position, 0, block);
  });
}

function containsBlock(block: BlockNode, id: string): boolean {
  return Object.values(block.stacks ?? {}).some((stack) => stack.some((child) => child.id === id || containsBlock(child, id)));
}

/** Where a block lives: its stack and index (root indexes count after the hat). */
export function blockPosition(program: ProgramDoc, blockId: string, target = HERO): { at: StackRef; index: number } | null {
  const script = mainScript(program, target);
  if (!script) return null;
  const rootIndex = script.blocks.findIndex((block) => block.id === blockId);
  if (rootIndex > 0) return { at: ROOT, index: rootIndex - 1 };
  const search = (blocks: BlockNode[]): { at: StackRef; index: number } | null => {
    for (const block of blocks) {
      for (const [stack, children] of Object.entries(block.stacks ?? {})) {
        const index = children.findIndex((child) => child.id === blockId);
        if (index >= 0) return { at: { parentId: block.id, stack }, index };
        const deeper = search(children);
        if (deeper) return deeper;
      }
    }
    return null;
  };
  return search(script.blocks);
}
