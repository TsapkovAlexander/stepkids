import { FREE_STAGE, freeSceneSchema, type FreeScene } from '@stepkids/blocks';
import type { Bubble, TouchEvent } from './grid-world';

/**
 * Logical model of the free scene (tiers 3–4): Scratch-like coordinates with (0, 0) in the
 * centre, x to the right, y up; directions in degrees, 90 = right, 0 = up.
 */

export const HALF_W = FREE_STAGE.width / 2;
export const HALF_H = FREE_STAGE.height / 2;
/** Sprite box at size 100: the art is square. */
export const SPRITE_BASE = 64;

export interface Glide {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  start: number;
  duration: number;
}

export interface SpriteState {
  id: string;
  character: string;
  x: number;
  y: number;
  direction: number;
  size: number;
  costume: string;
  hidden: boolean;
  layer: number;
  bubble: Bubble | null;
  glide: Glide | null;
  stopped: boolean;
  /** Original sprite id for clones. */
  cloneOf: string | null;
}

export interface FreePose {
  x: number;
  y: number;
  direction: number;
  size: number;
}

export interface FreeWorldOptions {
  costumes?: (character: string) => string[];
}

function normalizeDirection(degrees: number): number {
  let d = ((((degrees + 180) % 360) + 360) % 360) - 180;
  if (d === -180) d = 180;
  return d;
}

export class FreeWorld {
  readonly kind = 'free' as const;
  readonly scene: FreeScene;
  readonly background: string;
  readonly sprites = new Map<string, SpriteState>();
  readonly said: Array<{ actorId: string; text: string; time: number }> = [];
  private touches: TouchEvent[] = [];
  private cloneCount = 0;
  private topLayer = 0;
  private readonly costumesOf: (character: string) => string[];

  constructor(scene: unknown, options: FreeWorldOptions = {}) {
    this.scene = freeSceneSchema.parse(scene);
    this.background = this.scene.background;
    this.costumesOf = options.costumes ?? (() => ['default']);
    this.scene.sprites.forEach((sprite, index) => {
      this.sprites.set(sprite.id, {
        id: sprite.id,
        character: sprite.character,
        x: sprite.x,
        y: sprite.y,
        direction: normalizeDirection(sprite.direction),
        size: sprite.size,
        costume: sprite.costume ?? this.costumesOf(sprite.character)[0] ?? 'default',
        hidden: sprite.hidden ?? false,
        layer: sprite.layer ?? index,
        bubble: null,
        glide: null,
        stopped: false,
        cloneOf: null,
      });
      this.topLayer = Math.max(this.topLayer, sprite.layer ?? index);
    });
  }

  hasActor(id: string): boolean {
    return this.sprites.has(id);
  }

  actorIds(): string[] {
    return [...this.sprites.keys()];
  }

  actor(id: string): SpriteState {
    const sprite = this.sprites.get(id);
    if (!sprite) throw new Error(`No sprite "${id}" in the scene`);
    return sprite;
  }

  /** Keeps a sprite on stage like Scratch does (its centre may reach the edge, not beyond). */
  private clamp(sprite: SpriteState): void {
    sprite.x = Math.max(-HALF_W, Math.min(HALF_W, sprite.x));
    sprite.y = Math.max(-HALF_H, Math.min(HALF_H, sprite.y));
  }

  moveSteps(id: string, steps: number): void {
    const sprite = this.actor(id);
    const radians = ((90 - sprite.direction) * Math.PI) / 180;
    sprite.glide = null;
    sprite.x += steps * Math.cos(radians);
    sprite.y += steps * Math.sin(radians);
    this.clamp(sprite);
  }

  turn(id: string, degrees: number): void {
    const sprite = this.actor(id);
    sprite.direction = normalizeDirection(sprite.direction + degrees);
  }

  pointIn(id: string, direction: number): void {
    this.actor(id).direction = normalizeDirection(direction);
  }

  goTo(id: string, x: number, y: number): void {
    const sprite = this.actor(id);
    sprite.glide = null;
    sprite.x = x;
    sprite.y = y;
    this.clamp(sprite);
  }

  changeBy(id: string, dx: number, dy: number): void {
    const sprite = this.actor(id);
    this.goTo(id, sprite.x + dx, sprite.y + dy);
  }

  /** Starts a glide; the position is updated at the end (see {@link finishGlide}). */
  beginGlide(id: string, x: number, y: number, now: number, duration: number): void {
    const sprite = this.actor(id);
    const toX = Math.max(-HALF_W, Math.min(HALF_W, x));
    const toY = Math.max(-HALF_H, Math.min(HALF_H, y));
    sprite.glide = { fromX: sprite.x, fromY: sprite.y, toX, toY, start: now, duration };
  }

  finishGlide(id: string): void {
    const sprite = this.actor(id);
    if (!sprite.glide) return;
    sprite.x = sprite.glide.toX;
    sprite.y = sprite.glide.toY;
    sprite.glide = null;
  }

  /** Scratch-style "if on edge, bounce". */
  bounceOnEdge(id: string): void {
    const sprite = this.actor(id);
    const half = this.halfSize(sprite);
    let { direction } = sprite;
    if (sprite.x + half >= HALF_W || sprite.x - half <= -HALF_W) direction = -direction;
    if (sprite.y + half >= HALF_H || sprite.y - half <= -HALF_H) direction = 180 - direction;
    sprite.direction = normalizeDirection(direction);
    sprite.x = Math.max(-HALF_W + half, Math.min(HALF_W - half, sprite.x));
    sprite.y = Math.max(-HALF_H + half, Math.min(HALF_H - half, sprite.y));
  }

  setSize(id: string, size: number): void {
    this.actor(id).size = Math.max(5, Math.min(500, size));
  }

  bringToFront(id: string): void {
    this.topLayer += 1;
    this.actor(id).layer = this.topLayer;
  }

  private halfSize(sprite: SpriteState): number {
    return (SPRITE_BASE * sprite.size) / 100 / 2;
  }

  /** Axis-aligned box overlap of two visible sprites, or a sprite touching the stage edge. */
  touching(id: string, target: string, now: number): boolean {
    const sprite = this.actor(id);
    if (sprite.hidden) return false;
    const pose = this.pose(id, now);
    const half = this.halfSize(sprite);
    if (target === 'edge') {
      return (
        pose.x + half >= HALF_W ||
        pose.x - half <= -HALF_W ||
        pose.y + half >= HALF_H ||
        pose.y - half <= -HALF_H
      );
    }
    const others = [...this.sprites.values()].filter(
      (other) =>
        other.id !== id && !other.hidden && (other.id === target || other.cloneOf === target),
    );
    return others.some((other) => {
      const otherPose = this.pose(other.id, now);
      const reach = half + this.halfSize(other);
      return (
        Math.abs(pose.x - otherPose.x) < reach * 0.8 && Math.abs(pose.y - otherPose.y) < reach * 0.8
      );
    });
  }

  distance(id: string, target: string, now: number): number {
    const a = this.pose(id, now);
    const other = this.sprites.get(target);
    if (!other) return 0;
    const b = this.pose(other.id, now);
    return Math.round(Math.hypot(a.x - b.x, a.y - b.y));
  }

  /** New sprite copying the original's state; returns its id. */
  clone(id: string): string {
    const sprite = this.actor(id);
    this.cloneCount += 1;
    const originalId = sprite.cloneOf ?? sprite.id;
    const cloneId = `${originalId}#${this.cloneCount}`;
    this.sprites.set(cloneId, {
      ...sprite,
      id: cloneId,
      bubble: null,
      glide: null,
      cloneOf: originalId,
      layer: sprite.layer,
    });
    return cloneId;
  }

  cloneTotal(): number {
    return [...this.sprites.values()].filter((sprite) => sprite.cloneOf !== null).length;
  }

  deleteClone(id: string): boolean {
    const sprite = this.sprites.get(id);
    if (!sprite?.cloneOf) return false;
    this.sprites.delete(id);
    return true;
  }

  say(id: string, text: string, now: number): void {
    this.actor(id).bubble = { text, start: now, end: null };
    this.said.push({ actorId: this.actor(id).cloneOf ?? id, text, time: now });
  }

  endSay(id: string, at: number): void {
    const sprite = this.sprites.get(id);
    if (sprite?.bubble) sprite.bubble.end = at;
  }

  setVisible(id: string, visible: boolean): void {
    this.actor(id).hidden = !visible;
  }

  setCostume(id: string, costume: string): void {
    const sprite = this.actor(id);
    const costumes = this.costumesOf(sprite.character);
    if (costume === 'next') {
      const index = costumes.indexOf(sprite.costume);
      sprite.costume = costumes[(index + 1) % costumes.length] ?? sprite.costume;
    } else if (costumes.includes(costume)) {
      sprite.costume = costume;
    }
  }

  markStopped(id: string): void {
    this.actor(id).stopped = true;
  }

  drainTouches(): TouchEvent[] {
    const touches = this.touches;
    this.touches = [];
    return touches;
  }

  totalBumps(): number {
    return 0;
  }

  pose(id: string, now: number): FreePose {
    const sprite = this.actor(id);
    const glide = sprite.glide;
    const still = { x: sprite.x, y: sprite.y, direction: sprite.direction, size: sprite.size };
    if (!glide) return still;
    const t =
      glide.duration <= 0 ? 1 : Math.min(1, Math.max(0, (now - glide.start) / glide.duration));
    return {
      ...still,
      x: glide.fromX + (glide.toX - glide.fromX) * t,
      y: glide.fromY + (glide.toY - glide.fromY) * t,
    };
  }
}
