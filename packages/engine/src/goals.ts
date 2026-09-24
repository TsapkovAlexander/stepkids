import { normalizePhrase, type Goal, type StarsRule } from '@stepkids/blocks';
import type { GridWorld } from './world/grid-world';

export type GoalDetail =
  | 'starsLeft'
  | 'notReached'
  | 'notSaid'
  | 'shapeMismatch'
  | 'variableMismatch'
  | 'tooSlow'
  | 'manual';

export interface GoalStatus {
  goal: Goal;
  met: boolean;
  detail?: GoalDetail;
  /** For collectAll: how many stars are still on the field. */
  starsLeft?: number;
}

export interface GoalState {
  world: GridWorld;
  timeMs: number;
  variable?: (name: string) => number | string | undefined;
}

function defaultActor(world: GridWorld, actorId?: string): string {
  const first = world.actors.keys().next().value;
  return actorId ?? first ?? '';
}

export function evaluateGoal(goal: Goal, state: GoalState): GoalStatus {
  const { world } = state;
  switch (goal.kind) {
    case 'collectAll': {
      const starsLeft = world.starsLeft();
      return starsLeft === 0
        ? { goal, met: true }
        : { goal, met: false, detail: 'starsLeft', starsLeft };
    }
    case 'reach': {
      const actorId = defaultActor(world, goal.actor);
      const actor = world.hasActor(actorId) ? world.actor(actorId) : null;
      const met = !!actor && actor.x === goal.x && actor.y === goal.y;
      return met ? { goal, met } : { goal, met, detail: 'notReached' };
    }
    case 'say': {
      const actorId = defaultActor(world, goal.actor);
      const wanted = normalizePhrase(goal.text);
      const met = world.said.some(
        (entry) => entry.actorId === actorId && normalizePhrase(entry.text) === wanted,
      );
      return met ? { goal, met } : { goal, met, detail: 'notSaid' };
    }
    case 'varEquals': {
      const value = state.variable?.(goal.variable);
      const met = value !== undefined && String(value) === String(goal.value);
      return met ? { goal, met } : { goal, met, detail: 'variableMismatch' };
    }
    case 'withinTime': {
      const met = state.timeMs <= goal.seconds * 1000;
      return met ? { goal, met } : { goal, met, detail: 'tooSlow' };
    }
    case 'drawShape': {
      const actorId = defaultActor(world, goal.actor);
      const trail = world.hasActor(actorId) ? world.actor(actorId).trail : [];
      const drawn = new Set(trail.map((cell) => `${cell.x}:${cell.y}`));
      const wanted = new Set(goal.cells.map(([x, y]) => `${x}:${y}`));
      const met = drawn.size === wanted.size && [...wanted].every((key) => drawn.has(key));
      return met ? { goal, met } : { goal, met, detail: 'shapeMismatch' };
    }
    case 'manual':
      return { goal, met: false, detail: 'manual' };
  }
}

export function evaluateGoals(
  goals: readonly Goal[],
  state: GoalState,
): { met: boolean; statuses: GoalStatus[] } {
  const statuses = goals.map((goal) => evaluateGoal(goal, state));
  return { met: statuses.length > 0 && statuses.every((status) => status.met), statuses };
}

export interface StarsInput {
  success: boolean;
  blocks: number;
  bumps: number;
}

/** 1 star — goal met; 2 — within `two.maxBlocks`; 3 — also within `three` (blocks and/or no bumps). */
export function computeStars(rule: StarsRule, input: StarsInput): 0 | 1 | 2 | 3 {
  if (!input.success) return 0;
  const twoOk = !rule.two || input.blocks <= rule.two.maxBlocks;
  if (!twoOk) return 1;
  const three = rule.three;
  const threeOk =
    !three ||
    ((three.maxBlocks === undefined || input.blocks <= three.maxBlocks) &&
      (!three.noBumps || input.bumps === 0));
  return threeOk ? 3 : 2;
}
