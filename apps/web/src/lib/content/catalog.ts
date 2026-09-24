import type { LevelContent, WorldSeed } from '@stepkids/blocks';
import { SEED_WORLDS, characterById } from '@stepkids/content';

/** Seed levels are version 1; backoffice versions will come from the server. */
export const SEED_LEVEL_VERSION = 1;

export interface LevelRef {
  world: WorldSeed;
  index: number;
  id: string;
  content: LevelContent;
}

export function allWorlds(): WorldSeed[] {
  return SEED_WORLDS;
}

export function worldsOfTier(
  tier: number,
  worlds: readonly WorldSeed[] = SEED_WORLDS,
): WorldSeed[] {
  return worlds.filter((world) => world.tier === tier).sort((a, b) => a.order - b.order);
}

export function worldById(
  id: string,
  worlds: readonly WorldSeed[] = SEED_WORLDS,
): WorldSeed | undefined {
  return worlds.find((world) => world.id === id);
}

export function levelById(
  id: string,
  worlds: readonly WorldSeed[] = SEED_WORLDS,
): LevelRef | undefined {
  for (const world of worlds) {
    const index = world.levels.findIndex((level) => level.id === id);
    const level = world.levels[index];
    if (level) return { world, index, id: level.id, content: level.content };
  }
  return undefined;
}

export function nextLevelId(id: string, worlds: readonly WorldSeed[] = SEED_WORLDS): string | null {
  const ref = levelById(id, worlds);
  if (!ref) return null;
  return ref.world.levels[ref.index + 1]?.id ?? null;
}

/**
 * The child's chosen hero plays the "hero" actor of every level. A friend drawn with the same
 * character gets another one, so the two heroes never look alike.
 */
export function withHero(content: LevelContent, heroId: string): LevelContent {
  if (content.scene.kind !== 'grid') return content;
  const spare = heroId === 'kitten' ? 'bunny' : 'kitten';
  return {
    ...content,
    scene: {
      ...content.scene,
      actors: content.scene.actors.map((actor) => {
        if (actor.id === 'hero') return { ...actor, character: heroId, costume: undefined };
        if (actor.character === heroId) return { ...actor, character: spare, costume: undefined };
        return actor;
      }),
    },
  };
}

export interface ActorInfo {
  id: string;
  character: string;
  name: string;
}

/** Actors the child programs: heroes of the scene (NPCs just stand there), the hero first. */
export function programmableActors(content: LevelContent): ActorInfo[] {
  if (content.scene.kind !== 'grid') return [];
  return content.scene.actors
    .filter((actor) => actor.id === 'hero' || characterById(actor.character)?.role === 'hero')
    .map((actor) => ({
      id: actor.id,
      character: actor.character,
      name: characterById(actor.character)?.name.split(' ').pop() ?? actor.id,
    }))
    .sort((a, b) => (a.id === 'hero' ? -1 : b.id === 'hero' ? 1 : 0));
}
