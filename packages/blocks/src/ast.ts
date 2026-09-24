/**
 * Program AST shared by every editor (ribbon on tiers 1–2, Blockly on tiers 3–4),
 * the interpreter, the headless checker and the code panel.
 *
 * The format is editor-agnostic on purpose: a program built in the ribbon must open
 * in Blockly without losses, so nothing here describes how a block is drawn.
 */

export const PROGRAM_SCHEMA_VERSION = 1 as const;

export type Primitive = string | number | boolean;

/** An argument is either a literal or a reporter/condition block (tiers 3+). */
export type ArgValue = Primitive | BlockNode;

export interface BlockNode {
  id: string;
  type: string;
  args?: Record<string, ArgValue>;
  /** Nested stacks of wrapper blocks, e.g. `{ DO: [...] }` or `{ THEN: [...], ELSE: [...] }`. */
  stacks?: Record<string, BlockNode[]>;
  comment?: string;
}

/** A vertical stack of blocks. `blocks[0]` is a hat when the script is event-driven. */
export interface ScriptNode {
  id: string;
  blocks: BlockNode[];
  /** Workspace position for the Blockly editor; the ribbon ignores it. */
  x?: number;
  y?: number;
}

/** Scripts that belong to one actor (hero or sprite) of the scene. */
export interface TargetProgram {
  target: string;
  scripts: ScriptNode[];
}

export interface ProgramDoc {
  v: typeof PROGRAM_SCHEMA_VERSION;
  targets: TargetProgram[];
}

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Short collision-resistant id; enough for blocks inside one program. */
export function createId(length = 10): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let id = '';
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return id;
}

export function isBlockNode(value: unknown): value is BlockNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as BlockNode).id === 'string' &&
    typeof (value as BlockNode).type === 'string'
  );
}

export function emptyProgram(): ProgramDoc {
  return { v: PROGRAM_SCHEMA_VERSION, targets: [] };
}

/** Visits every block (including nested stacks and reporter arguments) depth-first. */
export function walkBlocks(
  blocks: readonly BlockNode[],
  visit: (block: BlockNode, depth: number) => void,
  depth = 0,
): void {
  for (const block of blocks) {
    visit(block, depth);
    if (block.args) {
      for (const arg of Object.values(block.args)) {
        if (isBlockNode(arg)) walkBlocks([arg], visit, depth + 1);
      }
    }
    if (block.stacks) {
      for (const stack of Object.values(block.stacks)) walkBlocks(stack, visit, depth + 1);
    }
  }
}

export function walkProgram(program: ProgramDoc, visit: (block: BlockNode) => void): void {
  for (const target of program.targets) {
    for (const script of target.scripts) walkBlocks(script.blocks, (block) => visit(block));
  }
}

/**
 * Counts blocks the way the star rules do: every block the child placed, including
 * hats they added explicitly. The implicit start of the ribbon is excluded by the caller
 * passing `ignoreTypes`.
 */
export function countBlocks(program: ProgramDoc, ignoreTypes: readonly string[] = []): number {
  let count = 0;
  walkProgram(program, (block) => {
    if (!ignoreTypes.includes(block.type)) count += 1;
  });
  return count;
}

export function findBlock(program: ProgramDoc, blockId: string): BlockNode | undefined {
  let found: BlockNode | undefined;
  walkProgram(program, (block) => {
    if (!found && block.id === blockId) found = block;
  });
  return found;
}

/** Deep copy with fresh ids — used when duplicating blocks or loading a starter program. */
export function cloneWithNewIds<T extends BlockNode>(block: T): T {
  const copy: BlockNode = { ...block, id: createId() };
  if (block.args) {
    copy.args = Object.fromEntries(
      Object.entries(block.args).map(([key, value]) => [
        key,
        isBlockNode(value) ? cloneWithNewIds(value) : value,
      ]),
    );
  }
  if (block.stacks) {
    copy.stacks = Object.fromEntries(
      Object.entries(block.stacks).map(([key, stack]) => [key, stack.map(cloneWithNewIds)]),
    );
  }
  return copy as T;
}

export function cloneProgram(program: ProgramDoc): ProgramDoc {
  return structuredClone(program);
}
