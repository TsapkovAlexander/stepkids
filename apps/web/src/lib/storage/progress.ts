import type { ProgramDoc } from '@stepkids/blocks';
import { mergeProgress } from '../progress/merge';
import { randomId } from '../utils';
import { db } from './db';
import type { AttemptRecord, LevelProgress } from './types';

export type NewAttempt = Omit<AttemptRecord, 'clientId' | 'createdAt' | 'synced'>;

/** Stores an attempt (queued for sync) and folds it into the level progress atomically. */
export async function recordAttempt(input: NewAttempt): Promise<LevelProgress> {
  const d = db();
  const attempt: AttemptRecord = {
    ...input,
    clientId: randomId(),
    createdAt: Date.now(),
    synced: 0,
  };
  return d.transaction('rw', ['attempts', 'progress'], async () => {
    await d.attempts.add(attempt);
    const previous = await d.progress.get([attempt.profileId, attempt.levelId]);
    const next = mergeProgress(previous, {
      profileId: attempt.profileId,
      levelId: attempt.levelId,
      stars: attempt.stars,
      hintsUsed: attempt.hintsUsed,
      at: attempt.createdAt,
    });
    await d.progress.put(next);
    return next;
  });
}

export async function progressOf(profileId: string): Promise<LevelProgress[]> {
  return db().progress.where('profileId').equals(profileId).toArray();
}

export async function recentAttempts(profileId: string, limit = 50): Promise<AttemptRecord[]> {
  const list = await db().attempts.where('profileId').equals(profileId).sortBy('createdAt');
  return list.reverse().slice(0, limit);
}

export async function getDraft(profileId: string, levelId: string): Promise<ProgramDoc | null> {
  return (await db().drafts.get([profileId, levelId]))?.program ?? null;
}

export async function saveDraft(
  profileId: string,
  levelId: string,
  program: ProgramDoc,
): Promise<void> {
  await db().drafts.put({ profileId, levelId, program, updatedAt: Date.now() });
}

export async function clearDraft(profileId: string, levelId: string): Promise<void> {
  await db().drafts.delete([profileId, levelId]);
}

export async function markRewardSeen(profileId: string, rewardId: string): Promise<void> {
  await db().seenRewards.put({ profileId, rewardId, seenAt: Date.now() });
}

export async function seenRewards(profileId: string): Promise<string[]> {
  const rows = await db().seenRewards.where('profileId').equals(profileId).toArray();
  return rows.map((row) => row.rewardId);
}
