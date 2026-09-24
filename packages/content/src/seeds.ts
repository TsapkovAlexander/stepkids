import { worldSeedSchema, type WorldSeed } from '@stepkids/blocks';
import forestSeed from '../seeds/world-forest.json';
import meadowSeed from '../seeds/world-meadow.json';

/** Seed worlds as data (the same JSON the backoffice imports and exports). */
export const SEED_WORLDS: WorldSeed[] = [meadowSeed, forestSeed].map((seed) =>
  worldSeedSchema.parse(seed),
);

export function seedWorld(id: string): WorldSeed | undefined {
  return SEED_WORLDS.find((world) => world.id === id);
}
