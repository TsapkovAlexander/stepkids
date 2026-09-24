import type { FreeWorld } from './free-world';
import type { GridWorld } from './grid-world';

/** Either scene model; primitives check `kind` before using scene-specific operations. */
export type World = GridWorld | FreeWorld;

/** Id of the actor whose scripts an actor runs: clones run their original's scripts. */
export function scriptOwner(world: World, actorId: string): string {
  if (world.kind === 'free') return world.actor(actorId).cloneOf ?? actorId;
  return actorId;
}
