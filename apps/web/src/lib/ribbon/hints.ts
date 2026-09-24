import type { BlockNode, ProgramDoc } from '@stepkids/blocks';
import { ribbonBlocks } from './ops';

export interface NextStepHint {
  /** Position in the child's ribbon where the suggested block belongs. */
  index: number;
  block: BlockNode;
}

function sameBlock(a: BlockNode, b: BlockNode): boolean {
  return a.type === b.type && JSON.stringify(a.args ?? {}) === JSON.stringify(b.args ?? {});
}

/**
 * Third hint: the first reference block the child's ribbon does not match yet.
 * Returns null when the ribbon already starts like the reference all the way through.
 */
export function nextStepHint(
  program: ProgramDoc,
  reference: ProgramDoc | undefined,
): NextStepHint | null {
  if (!reference) return null;
  const mine = ribbonBlocks(program);
  const wanted = ribbonBlocks(reference);
  for (let index = 0; index < wanted.length; index += 1) {
    const expected = wanted[index];
    const actual = mine[index];
    if (!expected) return null;
    if (!actual || !sameBlock(actual, expected)) return { index, block: expected };
  }
  return null;
}
