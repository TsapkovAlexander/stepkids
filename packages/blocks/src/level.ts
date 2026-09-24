import { z } from 'zod';
import { programSchema } from './program-schema';
import { sceneSchema } from './scene';

export const LEVEL_SCHEMA_VERSION = 1 as const;

export const TIERS = [1, 2, 3, 4] as const;
export const tierSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type Tier = z.infer<typeof tierSchema>;

const cell = z.tuple([z.number().int().min(0), z.number().int().min(0)]);

/** Goals a level can require. A level may combine several — all must hold. */
export const goalSchema = z.discriminatedUnion('kind', [
  /** Every star of the scene is collected. */
  z.object({ kind: z.literal('collectAll') }),
  /** The actor ends on the cell. */
  z.object({
    kind: z.literal('reach'),
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    actor: z.string().optional(),
  }),
  /** The actor said the phrase (case and punctuation are ignored). */
  z.object({
    kind: z.literal('say'),
    text: z.string().min(1).max(60),
    actor: z.string().optional(),
  }),
  /** A variable holds the value when the program ends (tiers 3+). */
  z.object({
    kind: z.literal('varEquals'),
    variable: z.string().min(1).max(40),
    value: z.union([z.number(), z.string()]),
  }),
  /** The other goals are met within the time limit. */
  z.object({ kind: z.literal('withinTime'), seconds: z.number().positive().max(600) }),
  /** The trail of the actor matches the picture exactly. */
  z.object({
    kind: z.literal('drawShape'),
    cells: z.array(cell).min(1),
    actor: z.string().optional(),
  }),
  /** The actor wears the costume when the program ends. */
  z.object({
    kind: z.literal('costume'),
    costume: z.string().min(1).max(40),
    actor: z.string().optional(),
  }),
  /** The actor is hidden (or visible) when the program ends. */
  z.object({ kind: z.literal('hidden'), hidden: z.boolean(), actor: z.string().optional() }),
  /** The actor touches another sprite (or the edge) when the program ends. */
  z.object({
    kind: z.literal('touching'),
    target: z.string().min(1).max(40),
    actor: z.string().optional(),
  }),
  /** Free task checked by a parent. */
  z.object({ kind: z.literal('manual') }),
]);
export type Goal = z.infer<typeof goalSchema>;

/**
 * Star rules: one star — goals met; two — no more than `two.maxBlocks` blocks;
 * three — no more than `three.maxBlocks` blocks and/or no bumps.
 */
export const starsRuleSchema = z.object({
  two: z.object({ maxBlocks: z.number().int().positive() }).optional(),
  three: z
    .object({
      maxBlocks: z.number().int().positive().optional(),
      noBumps: z.boolean().optional(),
    })
    .optional(),
});
export type StarsRule = z.infer<typeof starsRuleSchema>;

/** Hints escalate: a voiced tip, then a highlighted palette block, then the next step shown. */
export const hintSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('say'), text: z.string().min(1).max(160) }),
  z.object({
    kind: z.literal('highlight'),
    blockType: z.string().min(1),
    text: z.string().max(160).optional(),
  }),
  z.object({ kind: z.literal('showStep'), text: z.string().max(160).optional() }),
]);
export type Hint = z.infer<typeof hintSchema>;

export const LEVEL_KINDS = ['reach', 'collect', 'fix', 'shorten', 'draw', 'free'] as const;
export const levelKindSchema = z.enum(LEVEL_KINDS);
export type LevelKind = z.infer<typeof levelKindSchema>;

export const TASK_TEXT_LIMIT_YOUNG = 80;

/** A scripted input of the headless check: tap an actor or press a key at a moment. */
export const levelInputSchema = z
  .object({
    atMs: z.number().int().min(0).max(120_000),
    tap: z.string().min(1).max(40).optional(),
    key: z.string().min(1).max(20).optional(),
  })
  .refine((input) => !!input.tap !== !!input.key, 'An input is either a tap or a key');
export type LevelInput = z.infer<typeof levelInputSchema>;

/** One immutable version of a level — what `level_versions` stores. */
export const levelContentSchema = z
  .object({
    schemaVersion: z.literal(LEVEL_SCHEMA_VERSION),
    kind: levelKindSchema,
    tier: tierSchema,
    taskText: z.string().min(1).max(400),
    /** Voice-line key or asset reference; falls back to speech synthesis of `taskText`. */
    taskVoice: z.string().max(120).optional(),
    scene: sceneSchema,
    allowedBlocks: z.array(z.string().min(1)).min(1),
    blockLimit: z.number().int().positive().max(200).optional(),
    starterProgram: programSchema.optional(),
    goals: z.array(goalSchema).min(1),
    stars: starsRuleSchema,
    hints: z.array(hintSchema).max(3),
    /** Reference solution for the backoffice pass check; never shown to the child. */
    reference: programSchema.optional(),
    /** Taps and keys the headless check performs for interactive tasks. */
    inputs: z.array(levelInputSchema).max(40).optional(),
    /** Answers the headless check gives to "спросить и ждать", in order. */
    answers: z.array(z.string().max(60)).max(10).optional(),
  })
  .superRefine((level, ctx) => {
    if (level.tier <= 2 && level.taskText.length > TASK_TEXT_LIMIT_YOUNG) {
      ctx.addIssue({
        code: 'custom',
        path: ['taskText'],
        message: `Task text for tiers 1–2 is limited to ${TASK_TEXT_LIMIT_YOUNG} characters`,
      });
    }
    if (level.tier <= 2 && level.scene.kind !== 'grid') {
      ctx.addIssue({ code: 'custom', path: ['scene'], message: 'Tiers 1–2 use the grid scene' });
    }
    const manual = level.goals.some((goal) => goal.kind === 'manual');
    if (!manual && !level.reference) {
      ctx.addIssue({
        code: 'custom',
        path: ['reference'],
        message: 'Reference solution is required',
      });
    }
  });
export type LevelContent = z.infer<typeof levelContentSchema>;
export type LevelContentInput = z.input<typeof levelContentSchema>;

export const unlockRuleSchema = z.object({
  /** Stars needed across the tier to open the world. */
  minStars: z.number().int().min(0).optional(),
  /** World that must be completed (all levels solved) first. */
  afterWorld: z.string().optional(),
});
export type UnlockRule = z.infer<typeof unlockRuleSchema>;

export const rewardSchema = z.object({
  characters: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
});
export type Reward = z.infer<typeof rewardSchema>;

export const worldSeedSchema = z.object({
  id: z.string().min(1).max(40),
  tier: tierSchema,
  order: z.number().int().min(0),
  title: z.string().min(1).max(40),
  /** Short spoken description played when the island is tapped. */
  voice: z.string().max(160).optional(),
  island: z.string().max(40),
  unlock: unlockRuleSchema,
  reward: rewardSchema.optional(),
  levels: z
    .array(z.object({ id: z.string().min(1).max(60), content: levelContentSchema }))
    .min(1)
    .max(12),
});
export type WorldSeed = z.infer<typeof worldSeedSchema>;
export type WorldSeedInput = z.input<typeof worldSeedSchema>;
