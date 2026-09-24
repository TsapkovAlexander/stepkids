import {
  START_BLOCK,
  countBlocks,
  walkProgram,
  type LevelContent,
  type ProgramDoc,
} from '@stepkids/blocks';
import { runHeadless, type LevelRunOptions, type RunResult } from './run';

export interface ProgramViolations {
  /** Block types used by the program but missing from the level's whitelist. */
  disallowed: string[];
  /** Blocks over the level limit (0 when within). */
  overLimit: number;
}

export function findViolations(
  level: Pick<LevelContent, 'allowedBlocks' | 'blockLimit'>,
  program: ProgramDoc,
): ProgramViolations {
  const allowed = new Set([...level.allowedBlocks, START_BLOCK]);
  const disallowed = new Set<string>();
  walkProgram(program, (block) => {
    if (!allowed.has(block.type)) disallowed.add(block.type);
  });
  const blocks = countBlocks(program, [START_BLOCK]);
  const overLimit = level.blockLimit ? Math.max(0, blocks - level.blockLimit) : 0;
  return { disallowed: [...disallowed], overLimit };
}

export interface LevelCheck {
  ok: boolean;
  result: RunResult | null;
  violations: ProgramViolations;
  problems: string[];
}

/**
 * Backoffice pass check: the reference solution must use allowed blocks only, fit the
 * limit and reach the goal with three stars. The level cannot be published otherwise.
 */
export function checkLevel(level: LevelContent, options: LevelRunOptions = {}): LevelCheck {
  const problems: string[] = [];
  if (!level.reference) {
    const manual = level.goals.some((goal) => goal.kind === 'manual');
    return {
      ok: manual,
      result: null,
      violations: { disallowed: [], overLimit: 0 },
      problems: manual ? [] : ['Нет эталонного решения'],
    };
  }
  const violations = findViolations(level, level.reference);
  if (violations.disallowed.length > 0) {
    problems.push(`Эталон использует запрещённые блоки: ${violations.disallowed.join(', ')}`);
  }
  if (violations.overLimit > 0)
    problems.push(`Эталон длиннее лимита на ${violations.overLimit} бл.`);
  const result = runHeadless(level, level.reference, {
    ...(level.inputs ? { inputs: level.inputs } : {}),
    ...(level.answers ? { answers: level.answers } : {}),
    ...options,
  });
  if (!result.success) problems.push('Эталон не достигает цели');
  else if (result.stars < 3) problems.push(`Эталон получает ${result.stars} зв. вместо 3`);
  return { ok: problems.length === 0, result, violations, problems };
}
