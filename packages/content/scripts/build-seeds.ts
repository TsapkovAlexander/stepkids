import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AUTHORED_WORLDS } from '../src/worlds';

/** Writes `seeds/world-<id>.json` from the authoring sources. */
for (const world of AUTHORED_WORLDS) {
  const target = fileURLToPath(new URL(`../seeds/world-${world.id}.json`, import.meta.url));
  writeFileSync(target, `${JSON.stringify(world, null, 2)}\n`);
  console.warn(`wrote ${target}`);
}
