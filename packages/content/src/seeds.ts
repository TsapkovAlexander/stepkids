import { worldSeedSchema, type WorldSeed } from '@stepkids/blocks';
import beachSeed from '../seeds/world-beach.json';
import candySeed from '../seeds/world-candy.json';
import forestSeed from '../seeds/world-forest.json';
import meadowSeed from '../seeds/world-meadow.json';
import snowSeed from '../seeds/world-snow.json';

/** Seed worlds as data (the same JSON the backoffice imports and exports). */
export const SEED_WORLDS: WorldSeed[] = [
  meadowSeed,
  forestSeed,
  snowSeed,
  beachSeed,
  candySeed,
].map((seed) => worldSeedSchema.parse(seed));

export function seedWorld(id: string): WorldSeed | undefined {
  return SEED_WORLDS.find((world) => world.id === id);
}
