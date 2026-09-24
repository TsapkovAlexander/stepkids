import {
  PROGRAM_SCHEMA_VERSION,
  createId,
  type BlockNode,
  type ProgramDoc,
  type ScriptNode,
} from './ast';

export const START_BLOCK = 'event_start';

/**
 * Helpers for the ribbon editor of tiers 1–2. A ribbon is a script that starts with
 * an explicit hat; on tier 1 the hat is always `event_start` and shown as a green flag.
 */
export function ribbonScript(
  blocks: BlockNode[] = [],
  hat: BlockNode = { id: createId(), type: START_BLOCK },
): ScriptNode {
  return { id: createId(), blocks: [hat, ...blocks] };
}

export function singleRibbonProgram(target: string, blocks: BlockNode[] = []): ProgramDoc {
  return { v: PROGRAM_SCHEMA_VERSION, targets: [{ target, scripts: [ribbonScript(blocks)] }] };
}

export function scriptBody(script: ScriptNode): BlockNode[] {
  return script.blocks.slice(1);
}

/** Scripts of a target, creating the target entry if missing. Returns a new program. */
export function withTargetScripts(
  program: ProgramDoc,
  target: string,
  scripts: ScriptNode[],
): ProgramDoc {
  const exists = program.targets.some((entry) => entry.target === target);
  const targets = exists
    ? program.targets.map((entry) => (entry.target === target ? { ...entry, scripts } : entry))
    : [...program.targets, { target, scripts }];
  return { ...program, targets };
}

export function targetScripts(program: ProgramDoc, target: string): ScriptNode[] {
  return program.targets.find((entry) => entry.target === target)?.scripts ?? [];
}
