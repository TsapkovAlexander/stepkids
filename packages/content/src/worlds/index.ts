import type { WorldSeed } from '@stepkids/blocks';
import { beachWorld } from './beach';
import { candyWorld } from './candy';
import { forest } from './forest';
import { meadow } from './meadow';
import { snowWorld } from './snow';

/** Authoring sources of the seed worlds; `seeds/*.json` are generated from them. */
export const AUTHORED_WORLDS: WorldSeed[] = [meadow, forest, snowWorld, beachWorld, candyWorld];
