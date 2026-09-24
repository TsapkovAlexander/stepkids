import type { WorldSeed } from '@stepkids/blocks';
import { forest } from './forest';
import { meadow } from './meadow';

/** Authoring sources of the seed worlds; `seeds/*.json` are generated from them. */
export const AUTHORED_WORLDS: WorldSeed[] = [meadow, forest];
