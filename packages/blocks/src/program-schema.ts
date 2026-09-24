import { z } from 'zod';
import { PROGRAM_SCHEMA_VERSION, type BlockNode, type ProgramDoc } from './ast';

const MAX_BLOCKS_PER_PROGRAM = 2000;
const MAX_DEPTH = 24;

const primitiveSchema = z.union([z.string().max(200), z.number().finite(), z.boolean()]);

export const blockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(40),
    type: z.string().min(1).max(60),
    args: z.record(z.string().max(40), z.union([primitiveSchema, blockNodeSchema])).optional(),
    stacks: z.record(z.string().max(40), z.array(blockNodeSchema)).optional(),
    comment: z.string().max(200).optional(),
  }),
);

export const scriptNodeSchema = z.object({
  id: z.string().min(1).max(40),
  blocks: z.array(blockNodeSchema),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
});

export const programSchema: z.ZodType<ProgramDoc> = z
  .object({
    v: z.literal(PROGRAM_SCHEMA_VERSION),
    targets: z
      .array(
        z.object({
          target: z.string().min(1).max(40),
          scripts: z.array(scriptNodeSchema).max(64),
        }),
      )
      .max(32),
  })
  .superRefine((program, ctx) => {
    let total = 0;
    const ids = new Set<string>();
    const visit = (blocks: readonly BlockNode[], depth: number): void => {
      if (depth > MAX_DEPTH) {
        ctx.addIssue({ code: 'custom', message: 'Program is nested too deeply' });
        return;
      }
      for (const block of blocks) {
        total += 1;
        if (ids.has(block.id)) {
          ctx.addIssue({ code: 'custom', message: `Duplicate block id "${block.id}"` });
        }
        ids.add(block.id);
        for (const arg of Object.values(block.args ?? {})) {
          if (typeof arg === 'object') visit([arg], depth + 1);
        }
        for (const stack of Object.values(block.stacks ?? {})) visit(stack, depth + 1);
      }
    };
    for (const target of program.targets) {
      for (const script of target.scripts) visit(script.blocks, 0);
    }
    if (total > MAX_BLOCKS_PER_PROGRAM) {
      ctx.addIssue({
        code: 'custom',
        message: `Program has more than ${MAX_BLOCKS_PER_PROGRAM} blocks`,
      });
    }
  });

export function parseProgram(input: unknown): ProgramDoc {
  return programSchema.parse(input);
}
