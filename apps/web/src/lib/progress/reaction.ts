import type { RunResult } from '@stepkids/engine';
import {
  BUMP_LINES,
  REACTION_LINES,
  characterById,
  pickLine,
  type ReactionKey,
} from '@stepkids/content';

/** What the hero says after a run: praise or a friendly explanation of what happened. */
export function reactionLine(result: RunResult, heroId: string, seed: number): string {
  const hero = characterById(heroId);
  const lines = (key: ReactionKey) => hero?.lines?.[key] ?? REACTION_LINES[key];
  if (result.success) return pickLine(lines('win'), seed);
  const failure = result.failure;
  if (!failure) return pickLine(lines('tryAgain'), seed);
  switch (failure.kind) {
    case 'bump':
      return pickLine(hero?.lines?.[failure.reason] ?? BUMP_LINES[failure.reason], seed);
    case 'goal': {
      const unmet = failure.statuses.find((status) => !status.met);
      const detail = unmet?.detail;
      if (detail && detail !== 'manual') return pickLine(lines(detail), seed);
      return pickLine(lines('tryAgain'), seed);
    }
    case 'empty':
      return pickLine(lines('empty'), seed);
    case 'timeout':
      return pickLine(lines('timeout'), seed);
    case 'manual':
      return pickLine(lines('manual'), seed);
    case 'error':
      return failure.message || pickLine(lines('error'), seed);
  }
}

/** Short machine-readable failure for attempts and analytics. */
export function failureCode(result: RunResult): string | null {
  const failure = result.failure;
  if (!failure) return null;
  switch (failure.kind) {
    case 'bump':
      return `bump:${failure.reason}`;
    case 'goal':
      return `goal:${failure.statuses.find((status) => !status.met)?.detail ?? 'unknown'}`;
    case 'error':
      return `error:${failure.code}`;
    default:
      return failure.kind;
  }
}
