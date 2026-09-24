import {
  DIRECTION_VECTORS,
  SOLID_ITEMS,
  gridSceneSchema,
  type Direction,
  type GridItem,
  type GridSceneInput,
  type GridScene,
  type GridTheme,
  type ItemColor,
} from '@stepkids/blocks';

export type BumpReason = 'edge' | 'rock' | 'tree' | 'water' | 'door';

export type MotionKind = 'walk' | 'bump' | 'teleport';

export interface ActorMotion {
  kind: MotionKind;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  start: number;
  duration: number;
}

export interface Bubble {
  text: string;
  start: number;
  /** null while the actor is still speaking. */
  end: number | null;
}

export interface GridActorState {
  id: string;
  character: string;
  x: number;
  y: number;
  dir: Direction;
  costume: string;
  hidden: boolean;
  keys: ItemColor[];
  motion: ActorMotion | null;
  bubble: Bubble | null;
  /** Cells the actor has visited, starting with its start cell. */
  trail: Array<{ x: number; y: number }>;
  bumps: number;
  /** Set after a bump: the actor's scripts are stopped for the rest of the run. */
  stopped: boolean;
}

export interface GridItemState extends GridItem {
  collectedAt: number | null;
  openedAt: number | null;
}

export type TouchTarget = 'actor' | 'star' | 'flag' | 'key';

export interface TouchEvent {
  actorId: string;
  what: TouchTarget;
}

export type StepPlan =
  | { ok: true; toX: number; toY: number; openedDoor?: GridItemState }
  | { ok: false; reason: BumpReason; item?: GridItemState };

export interface ArrivalResult {
  collected: GridItemState[];
  teleportTo: { x: number; y: number } | null;
}

export interface Pose {
  x: number;
  y: number;
  /** 0…1, used for teleport fades. */
  alpha: number;
  dir: Direction;
}

export interface GridWorldOptions {
  /** Costume ids of a character, first one is the default. */
  costumes?: (character: string) => string[];
}

const DEFAULT_KEY_COLOR: ItemColor = 'yellow';

/**
 * Logical model of the grid scene. It never renders anything: the stage reads the states
 * together with the virtual clock and interpolates poses with {@link GridWorld.pose}.
 */
export class GridWorld {
  readonly kind = 'grid' as const;
  readonly scene: GridScene;
  readonly cols: number;
  readonly rows: number;
  readonly theme: GridTheme;
  readonly actors = new Map<string, GridActorState>();
  readonly items: GridItemState[];
  readonly said: Array<{ actorId: string; text: string; time: number }> = [];
  private touches: TouchEvent[] = [];
  private readonly costumesOf: (character: string) => string[];

  constructor(scene: GridSceneInput | GridScene, options: GridWorldOptions = {}) {
    this.scene = gridSceneSchema.parse(scene);
    this.cols = this.scene.cols;
    this.rows = this.scene.rows;
    this.theme = this.scene.theme;
    this.costumesOf = options.costumes ?? (() => ['default']);
    for (const actor of this.scene.actors) {
      this.actors.set(actor.id, {
        id: actor.id,
        character: actor.character,
        x: actor.x,
        y: actor.y,
        dir: actor.dir,
        costume: actor.costume ?? this.costumesOf(actor.character)[0] ?? 'default',
        hidden: actor.hidden ?? false,
        keys: [],
        motion: null,
        bubble: null,
        trail: [{ x: actor.x, y: actor.y }],
        bumps: 0,
        stopped: false,
      });
    }
    this.items = this.scene.items.map((item) => ({ ...item, collectedAt: null, openedAt: null }));
  }

  hasActor(id: string): boolean {
    return this.actors.has(id);
  }

  actor(id: string): GridActorState {
    const actor = this.actors.get(id);
    if (!actor) throw new Error(`No actor "${id}" in the scene`);
    return actor;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  /** Items still present on a cell (collected stars and keys are gone). */
  itemsAt(x: number, y: number): GridItemState[] {
    return this.items.filter((item) => item.x === x && item.y === y && item.collectedAt === null);
  }

  starsTotal(): number {
    return this.items.filter((item) => item.kind === 'star').length;
  }

  starsLeft(): number {
    return this.items.filter((item) => item.kind === 'star' && item.collectedAt === null).length;
  }

  totalBumps(): number {
    let bumps = 0;
    for (const actor of this.actors.values()) bumps += actor.bumps;
    return bumps;
  }

  /** Decides what happens when the actor tries to enter the neighbouring cell. */
  planStep(actorId: string, dir: Direction, now: number): StepPlan {
    const actor = this.actor(actorId);
    const { dx, dy } = DIRECTION_VECTORS[dir];
    const toX = actor.x + dx;
    const toY = actor.y + dy;
    if (!this.inside(toX, toY)) return { ok: false, reason: 'edge' };
    for (const item of this.itemsAt(toX, toY)) {
      if (SOLID_ITEMS.includes(item.kind))
        return { ok: false, reason: item.kind as BumpReason, item };
      if (item.kind === 'water') return { ok: false, reason: 'water', item };
      if (item.kind === 'door' && item.openedAt === null) {
        const color = item.color ?? DEFAULT_KEY_COLOR;
        if (!actor.keys.includes(color)) return { ok: false, reason: 'door', item };
        item.openedAt = now;
        return { ok: true, toX, toY, openedDoor: item };
      }
    }
    return { ok: true, toX, toY };
  }

  beginWalk(
    actorId: string,
    dir: Direction,
    toX: number,
    toY: number,
    now: number,
    duration: number,
  ): void {
    const actor = this.actor(actorId);
    actor.dir = dir;
    actor.motion = { kind: 'walk', fromX: actor.x, fromY: actor.y, toX, toY, start: now, duration };
  }

  beginBump(actorId: string, dir: Direction, now: number, duration: number): void {
    const actor = this.actor(actorId);
    const { dx, dy } = DIRECTION_VECTORS[dir];
    actor.dir = dir;
    actor.bumps += 1;
    actor.motion = {
      kind: 'bump',
      fromX: actor.x,
      fromY: actor.y,
      toX: actor.x + dx,
      toY: actor.y + dy,
      start: now,
      duration,
    };
  }

  beginTeleport(actorId: string, toX: number, toY: number, now: number, duration: number): void {
    const actor = this.actor(actorId);
    actor.motion = {
      kind: 'teleport',
      fromX: actor.x,
      fromY: actor.y,
      toX,
      toY,
      start: now,
      duration,
    };
  }

  /** Finishes the current walk or teleport: moves the actor and applies cell effects. */
  arrive(actorId: string, now: number): ArrivalResult {
    const actor = this.actor(actorId);
    const motion = actor.motion;
    const result: ArrivalResult = { collected: [], teleportTo: null };
    if (!motion || motion.kind === 'bump') return result;
    actor.x = motion.toX;
    actor.y = motion.toY;
    actor.trail.push({ x: actor.x, y: actor.y });

    for (const item of this.itemsAt(actor.x, actor.y)) {
      if (item.kind === 'star') {
        item.collectedAt = now;
        result.collected.push(item);
        this.touches.push({ actorId, what: 'star' });
      } else if (item.kind === 'key') {
        item.collectedAt = now;
        actor.keys.push(item.color ?? DEFAULT_KEY_COLOR);
        result.collected.push(item);
        this.touches.push({ actorId, what: 'key' });
      } else if (item.kind === 'flag') {
        this.touches.push({ actorId, what: 'flag' });
      } else if (item.kind === 'teleport' && motion.kind === 'walk') {
        const exit = this.items.find(
          (other) => other.kind === 'teleport' && other.pair === item.pair && other.id !== item.id,
        );
        if (exit) result.teleportTo = { x: exit.x, y: exit.y };
      }
    }
    for (const other of this.actors.values()) {
      if (
        other.id !== actorId &&
        !other.hidden &&
        !actor.hidden &&
        other.x === actor.x &&
        other.y === actor.y
      ) {
        this.touches.push({ actorId, what: 'actor' }, { actorId: other.id, what: 'actor' });
      }
    }
    return result;
  }

  /** Touch events since the last call; the runtime turns them into "when touching" hats. */
  drainTouches(): TouchEvent[] {
    const touches = this.touches;
    this.touches = [];
    return touches;
  }

  say(actorId: string, text: string, now: number): void {
    const actor = this.actor(actorId);
    actor.bubble = { text, start: now, end: null };
    this.said.push({ actorId, text, time: now });
  }

  endSay(actorId: string, now: number): void {
    const actor = this.actor(actorId);
    if (actor.bubble) actor.bubble.end = now;
  }

  setVisible(actorId: string, visible: boolean): void {
    this.actor(actorId).hidden = !visible;
  }

  /** Switches to a named costume or, for "next", cycles through the character's costumes. */
  setCostume(actorId: string, costume: string): void {
    const actor = this.actor(actorId);
    const costumes = this.costumesOf(actor.character);
    if (costume === 'next') {
      const index = costumes.indexOf(actor.costume);
      actor.costume = costumes[(index + 1) % costumes.length] ?? actor.costume;
    } else if (costumes.includes(costume)) {
      actor.costume = costume;
    }
  }

  markStopped(actorId: string): void {
    this.actor(actorId).stopped = true;
  }

  /** Interpolated position for drawing. Cells are unit squares; (0,0) is the top-left cell. */
  pose(actorId: string, now: number): Pose {
    const actor = this.actor(actorId);
    const motion = actor.motion;
    const still: Pose = { x: actor.x, y: actor.y, alpha: 1, dir: actor.dir };
    if (!motion) return still;
    const t = motion.duration <= 0 ? 1 : clamp01((now - motion.start) / motion.duration);
    if (t >= 1) return still;
    switch (motion.kind) {
      case 'walk': {
        const e = easeInOut(t);
        return {
          ...still,
          x: lerp(motion.fromX, motion.toX, e),
          y: lerp(motion.fromY, motion.toY, e),
        };
      }
      case 'bump': {
        const reach = Math.sin(Math.PI * t) * 0.32;
        return {
          ...still,
          x: motion.fromX + (motion.toX - motion.fromX) * reach,
          y: motion.fromY + (motion.toY - motion.fromY) * reach,
        };
      }
      case 'teleport': {
        const first = t < 0.5;
        return {
          ...still,
          x: first ? motion.fromX : motion.toX,
          y: first ? motion.fromY : motion.toY,
          alpha: first ? 1 - t * 2 : (t - 0.5) * 2,
        };
      }
    }
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
