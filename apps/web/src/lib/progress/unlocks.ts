import type { WorldSeed } from '@stepkids/blocks';
import { CHARACTERS, TIERS_META, type CharacterDef } from '@stepkids/content';
import type { LevelProgress, Profile } from '../storage/types';

export type ProgressMap = ReadonlyMap<string, LevelProgress>;

export function toProgressMap(rows: readonly LevelProgress[]): Map<string, LevelProgress> {
  return new Map(rows.map((row) => [row.levelId, row]));
}

export function starsOfWorld(world: WorldSeed, progress: ProgressMap): number {
  return world.levels.reduce((sum, level) => sum + (progress.get(level.id)?.bestStars ?? 0), 0);
}

export function maxStarsOfWorld(world: WorldSeed): number {
  return world.levels.length * 3;
}

export function starsOfTier(
  worlds: readonly WorldSeed[],
  tier: number,
  progress: ProgressMap,
): number {
  return worlds
    .filter((world) => world.tier === tier)
    .reduce((sum, world) => sum + starsOfWorld(world, progress), 0);
}

export function isSolved(levelId: string, progress: ProgressMap): boolean {
  return (progress.get(levelId)?.bestStars ?? 0) > 0;
}

export function isWorldCompleted(world: WorldSeed, progress: ProgressMap): boolean {
  return world.levels.every((level) => isSolved(level.id, progress));
}

export function solvedShare(
  worlds: readonly WorldSeed[],
  tier: number,
  progress: ProgressMap,
): number {
  const levels = worlds.filter((world) => world.tier === tier).flatMap((world) => world.levels);
  if (levels.length === 0) return 0;
  return levels.filter((level) => isSolved(level.id, progress)).length / levels.length;
}

/** A tier opens after 80% of the previous tier's levels (or when a parent opens it). */
export function isTierUnlocked(
  tier: number,
  worlds: readonly WorldSeed[],
  progress: ProgressMap,
  profile: Profile,
): boolean {
  if (tier <= 1 || tier <= profile.currentTier) return true;
  const meta = TIERS_META.find((entry) => entry.id === tier);
  const previousHasContent = worlds.some((world) => world.tier === tier - 1);
  if (!meta || !previousHasContent) return false;
  return solvedShare(worlds, tier - 1, progress) >= meta.unlockShare;
}

export interface WorldLock {
  unlocked: boolean;
  /** Stars still needed (0 when not star-gated). */
  starsNeeded: number;
  /** World to finish first. */
  afterWorld: string | null;
}

export function worldLock(
  world: WorldSeed,
  worlds: readonly WorldSeed[],
  progress: ProgressMap,
  profile: Profile,
): WorldLock {
  if (profile.unlockedWorlds.includes(world.id))
    return { unlocked: true, starsNeeded: 0, afterWorld: null };
  if (!isTierUnlocked(world.tier, worlds, progress, profile)) {
    return { unlocked: false, starsNeeded: 0, afterWorld: null };
  }
  const stars = starsOfTier(worlds, world.tier, progress);
  const starsNeeded = Math.max(0, (world.unlock.minStars ?? 0) - stars);
  const previous = world.unlock.afterWorld
    ? worlds.find((entry) => entry.id === world.unlock.afterWorld)
    : undefined;
  const afterWorld = previous && !isWorldCompleted(previous, progress) ? previous.id : null;
  return { unlocked: starsNeeded === 0 && afterWorld === null, starsNeeded, afterWorld };
}

/** Levels open one after another; a parent-opened world opens all its levels. */
export function isLevelUnlocked(
  world: WorldSeed,
  index: number,
  progress: ProgressMap,
  profile: Profile,
): boolean {
  if (index === 0 || profile.unlockedWorlds.includes(world.id)) return true;
  const previous = world.levels[index - 1];
  return !!previous && isSolved(previous.id, progress);
}

/** Heroes are rewards for completing worlds, never for time spent in the app. */
export function unlockedHeroes(
  worlds: readonly WorldSeed[],
  progress: ProgressMap,
): CharacterDef[] {
  return CHARACTERS.filter((character) => {
    if (character.role !== 'hero') return false;
    if (!character.unlockedBy) return true;
    const world = worlds.find((entry) => entry.id === character.unlockedBy);
    return !!world && isWorldCompleted(world, progress);
  });
}

/** First level of a world the child has not solved yet — where "continue" leads. */
export function nextUnsolvedIndex(world: WorldSeed, progress: ProgressMap): number {
  const index = world.levels.findIndex((level) => !isSolved(level.id, progress));
  return index === -1 ? world.levels.length - 1 : index;
}
