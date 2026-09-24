import { z } from 'zod';

/**
 * Scene formats. Tiers 1–2 use the grid scene (whole cells, atomic moves);
 * tiers 3–4 use the free scene (stage pixels, rectangle collisions).
 */

export const SCENE_SCHEMA_VERSION = 1 as const;

export const GRID_LIMITS = { minCols: 3, maxCols: 10, minRows: 2, maxRows: 8 } as const;

export const DIRECTIONS = ['right', 'left', 'up', 'down'] as const;
export const directionSchema = z.enum(DIRECTIONS);
export type Direction = z.infer<typeof directionSchema>;

export const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  right: { dx: 1, dy: 0 },
  left: { dx: -1, dy: 0 },
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
};

export const GRID_THEMES = ['meadow', 'forest', 'beach', 'snow', 'candy'] as const;
export const gridThemeSchema = z.enum(GRID_THEMES);
export type GridTheme = z.infer<typeof gridThemeSchema>;

export const ITEM_COLORS = ['yellow', 'blue', 'pink'] as const;
export const itemColorSchema = z.enum(ITEM_COLORS);
export type ItemColor = z.infer<typeof itemColorSchema>;

/**
 * Items that live on cells.
 * - star: collected when an actor enters the cell;
 * - rock / tree: solid, bumping stops the actor's scripts;
 * - water: not walkable, a gentle "splash" reaction instead of a bump;
 * - flag: a target marker, walkable;
 * - door: solid until an actor carrying a key of the same colour walks into it;
 * - key: picked up on entering the cell;
 * - teleport: moves the actor to the paired teleport (same `pair` value);
 * - flower: decoration only.
 */
export const GRID_ITEM_KINDS = [
  'star',
  'rock',
  'tree',
  'water',
  'flag',
  'door',
  'key',
  'teleport',
  'flower',
] as const;
export const gridItemKindSchema = z.enum(GRID_ITEM_KINDS);
export type GridItemKind = z.infer<typeof gridItemKindSchema>;

const cellCoord = z
  .number()
  .int()
  .min(0)
  .max(GRID_LIMITS.maxCols - 1);

export const gridItemSchema = z.object({
  id: z.string().min(1).max(40),
  kind: gridItemKindSchema,
  x: cellCoord,
  y: cellCoord,
  color: itemColorSchema.optional(),
  /** Teleports with the same pair value are linked (exactly two per pair). */
  pair: z.string().max(20).optional(),
});
export type GridItem = z.infer<typeof gridItemSchema>;

export const gridActorSchema = z.object({
  id: z.string().min(1).max(40),
  character: z.string().min(1).max(40),
  x: cellCoord,
  y: cellCoord,
  dir: directionSchema.default('right'),
  costume: z.string().max(40).optional(),
  hidden: z.boolean().optional(),
});
export type GridActor = z.infer<typeof gridActorSchema>;
export type GridActorInput = z.input<typeof gridActorSchema>;

export const gridSceneSchema = z
  .object({
    kind: z.literal('grid'),
    cols: z.number().int().min(GRID_LIMITS.minCols).max(GRID_LIMITS.maxCols),
    rows: z.number().int().min(GRID_LIMITS.minRows).max(GRID_LIMITS.maxRows),
    theme: gridThemeSchema.default('meadow'),
    actors: z.array(gridActorSchema).min(1).max(6),
    items: z.array(gridItemSchema).max(80),
    /** Draw the actor's trail on the cells it visits (for "repeat the picture" tasks). */
    trail: z.boolean().optional(),
  })
  .superRefine((scene, ctx) => {
    const inside = (x: number, y: number) => x < scene.cols && y < scene.rows;
    const ids = new Set<string>();
    for (const entity of [...scene.actors, ...scene.items]) {
      if (ids.has(entity.id)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate id "${entity.id}"` });
      }
      ids.add(entity.id);
      if (!inside(entity.x, entity.y)) {
        ctx.addIssue({ code: 'custom', message: `"${entity.id}" is outside the grid` });
      }
    }
    const pairs = new Map<string, number>();
    for (const item of scene.items) {
      if (item.kind === 'teleport') {
        if (!item.pair)
          ctx.addIssue({ code: 'custom', message: `Teleport "${item.id}" has no pair` });
        else pairs.set(item.pair, (pairs.get(item.pair) ?? 0) + 1);
      }
    }
    for (const [pair, count] of pairs) {
      if (count !== 2) {
        ctx.addIssue({ code: 'custom', message: `Teleport pair "${pair}" must have 2 ends` });
      }
    }
  });
export type GridScene = z.infer<typeof gridSceneSchema>;
export type GridSceneInput = z.input<typeof gridSceneSchema>;

export const FREE_STAGE = { width: 480, height: 360 } as const;

export const freeSpriteSchema = z.object({
  id: z.string().min(1).max(40),
  character: z.string().min(1).max(40),
  x: z.number().min(-FREE_STAGE.width).max(FREE_STAGE.width),
  y: z.number().min(-FREE_STAGE.height).max(FREE_STAGE.height),
  direction: z.number().min(-180).max(180).default(90),
  size: z.number().min(5).max(500).default(100),
  costume: z.string().max(40).optional(),
  hidden: z.boolean().optional(),
  layer: z.number().int().optional(),
});
export type FreeSprite = z.infer<typeof freeSpriteSchema>;

export const freeSceneSchema = z.object({
  kind: z.literal('free'),
  background: z.string().max(80),
  sprites: z.array(freeSpriteSchema).min(1).max(30),
});
export type FreeScene = z.infer<typeof freeSceneSchema>;

export const sceneSchema = z.discriminatedUnion('kind', [gridSceneSchema, freeSceneSchema]);
export type Scene = z.infer<typeof sceneSchema>;
export type SceneInput = z.input<typeof sceneSchema>;

/** Items that stop an actor. Doors are solid only while locked. */
export const SOLID_ITEMS: readonly GridItemKind[] = ['rock', 'tree'];
