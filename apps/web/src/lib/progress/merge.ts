import type { LevelProgress } from '../storage/types';

export interface AttemptSummary {
  profileId: string;
  levelId: string;
  stars: number;
  hintsUsed: number;
  at: number;
}

/** Folds one attempt into the level summary: best stars, first solve, counters. */
export function mergeProgress(
  previous: LevelProgress | undefined,
  attempt: AttemptSummary,
): LevelProgress {
  const solved = attempt.stars > 0;
  if (!previous) {
    return {
      profileId: attempt.profileId,
      levelId: attempt.levelId,
      bestStars: attempt.stars,
      solvedAt: solved ? attempt.at : null,
      attempts: 1,
      hintsUsed: attempt.hintsUsed,
      lastPlayedAt: attempt.at,
    };
  }
  return {
    ...previous,
    bestStars: Math.max(previous.bestStars, attempt.stars),
    solvedAt: previous.solvedAt ?? (solved ? attempt.at : null),
    attempts: previous.attempts + 1,
    hintsUsed: Math.max(previous.hintsUsed, attempt.hintsUsed),
    lastPlayedAt: Math.max(previous.lastPlayedAt, attempt.at),
  };
}
