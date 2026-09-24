import { describe, expect, it } from 'vitest';
import { SEED_WORLDS } from '@stepkids/content';
import { mergeProgress } from '@/lib/progress/merge';
import {
  isLevelUnlocked,
  isTierUnlocked,
  isWorldCompleted,
  maxStarsOfWorld,
  nextUnsolvedIndex,
  solvedShare,
  starsOfTier,
  starsOfWorld,
  toProgressMap,
  unlockedHeroes,
  worldLock,
} from '@/lib/progress/unlocks';
import type { LevelProgress, Profile } from '@/lib/storage/types';

const profile: Profile = {
  id: 'p',
  name: 'Маша',
  avatarId: 'kitten',
  heroId: 'kitten',
  currentTier: 1,
  unlockedWorlds: [],
  createdAt: 0,
  updatedAt: 0,
  remoteId: null,
};
const [meadow, forest] = SEED_WORLDS;
if (!meadow || !forest) throw new Error('seed worlds missing');

function solve(levelIds: string[], stars = 3): Map<string, LevelProgress> {
  return toProgressMap(
    levelIds.map((levelId) => ({
      profileId: 'p',
      levelId,
      bestStars: stars,
      solvedAt: 1,
      attempts: 1,
      hintsUsed: 0,
      lastPlayedAt: 1,
    })),
  );
}

describe('mergeProgress', () => {
  it('starts a summary and keeps the best result', () => {
    const first = mergeProgress(undefined, {
      profileId: 'p',
      levelId: 'l',
      stars: 0,
      hintsUsed: 1,
      at: 10,
    });
    expect(first).toMatchObject({ bestStars: 0, solvedAt: null, attempts: 1, hintsUsed: 1 });
    const second = mergeProgress(first, {
      profileId: 'p',
      levelId: 'l',
      stars: 2,
      hintsUsed: 0,
      at: 20,
    });
    expect(second).toMatchObject({
      bestStars: 2,
      solvedAt: 20,
      attempts: 2,
      hintsUsed: 1,
      lastPlayedAt: 20,
    });
    const third = mergeProgress(second, {
      profileId: 'p',
      levelId: 'l',
      stars: 1,
      hintsUsed: 3,
      at: 15,
    });
    expect(third).toMatchObject({
      bestStars: 2,
      solvedAt: 20,
      attempts: 3,
      hintsUsed: 3,
      lastPlayedAt: 20,
    });
  });
});

describe('unlock rules', () => {
  it('counts stars and completion', () => {
    const progress = solve(
      meadow.levels.slice(0, 5).map((level) => level.id),
      2,
    );
    expect(starsOfWorld(meadow, progress)).toBe(10);
    expect(maxStarsOfWorld(meadow)).toBe(30);
    expect(starsOfTier(SEED_WORLDS, 1, progress)).toBe(10);
    expect(isWorldCompleted(meadow, progress)).toBe(false);
    expect(nextUnsolvedIndex(meadow, progress)).toBe(5);
    const all = solve(meadow.levels.map((level) => level.id));
    expect(isWorldCompleted(meadow, all)).toBe(true);
    expect(nextUnsolvedIndex(meadow, all)).toBe(9);
    expect(solvedShare(SEED_WORLDS, 1, all)).toBe(0.5);
    expect(solvedShare(SEED_WORLDS, 3, all)).toBe(0);
  });

  it('opens worlds by stars or by a parent', () => {
    expect(worldLock(meadow, SEED_WORLDS, new Map(), profile)).toEqual({
      unlocked: true,
      starsNeeded: 0,
      afterWorld: null,
    });
    expect(worldLock(forest, SEED_WORLDS, new Map(), profile)).toMatchObject({
      unlocked: false,
      starsNeeded: 15,
    });
    const some = solve(meadow.levels.slice(0, 5).map((level) => level.id));
    expect(worldLock(forest, SEED_WORLDS, some, profile).unlocked).toBe(true);
    expect(
      worldLock(forest, SEED_WORLDS, new Map(), { ...profile, unlockedWorlds: ['forest'] })
        .unlocked,
    ).toBe(true);
    const gated = { ...forest, unlock: { afterWorld: 'meadow' } };
    expect(worldLock(gated, SEED_WORLDS, some, profile)).toMatchObject({
      unlocked: false,
      afterWorld: 'meadow',
    });
    const tier3 = { ...forest, tier: 3 as const };
    expect(worldLock(tier3, SEED_WORLDS, some, profile)).toEqual({
      unlocked: false,
      starsNeeded: 0,
      afterWorld: null,
    });
  });

  it('opens levels one after another', () => {
    const progress = solve([meadow.levels[0]?.id ?? '']);
    expect(isLevelUnlocked(meadow, 0, new Map(), profile)).toBe(true);
    expect(isLevelUnlocked(meadow, 1, new Map(), profile)).toBe(false);
    expect(isLevelUnlocked(meadow, 1, progress, profile)).toBe(true);
    expect(isLevelUnlocked(meadow, 2, progress, profile)).toBe(false);
    expect(isLevelUnlocked(meadow, 9, new Map(), { ...profile, unlockedWorlds: ['meadow'] })).toBe(
      true,
    );
    expect(isLevelUnlocked(meadow, 42, new Map(), profile)).toBe(false);
  });

  it('opens tiers by share of solved levels', () => {
    expect(isTierUnlocked(1, SEED_WORLDS, new Map(), profile)).toBe(true);
    expect(isTierUnlocked(2, SEED_WORLDS, new Map(), profile)).toBe(false);
    expect(isTierUnlocked(2, SEED_WORLDS, new Map(), { ...profile, currentTier: 2 })).toBe(true);
    const most = solve(
      SEED_WORLDS.flatMap((world) => world.levels.slice(0, 8).map((level) => level.id)),
    );
    expect(isTierUnlocked(2, SEED_WORLDS, most, profile)).toBe(true);
    expect(isTierUnlocked(4, SEED_WORLDS, most, profile)).toBe(false);
  });

  it('rewards heroes for completed worlds only', () => {
    expect(unlockedHeroes(SEED_WORLDS, new Map()).map((hero) => hero.id)).toEqual(['kitten']);
    const all = solve(meadow.levels.map((level) => level.id));
    expect(unlockedHeroes(SEED_WORLDS, all).map((hero) => hero.id)).toEqual(['kitten', 'bunny']);
  });
});
