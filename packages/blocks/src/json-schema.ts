import { z } from 'zod';
import { goalSchema, levelContentSchema, starsRuleSchema } from './level';
import { programSchema } from './program-schema';
import { sceneSchema } from './scene';

/**
 * JSON Schemas generated from the zod schemas. The database check functions and
 * the backoffice import validate against the same definitions as the client.
 */
export function jsonSchemas() {
  const opts = { unrepresentable: 'any', cycles: 'ref', io: 'input' } as const;
  return {
    program: z.toJSONSchema(programSchema, opts),
    scene: z.toJSONSchema(sceneSchema, opts),
    goals: z.toJSONSchema(z.array(goalSchema), opts),
    stars: z.toJSONSchema(starsRuleSchema, opts),
    level: z.toJSONSchema(levelContentSchema, opts),
  };
}
